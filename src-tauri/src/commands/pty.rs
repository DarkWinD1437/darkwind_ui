use crate::state::{PtySession, PtyState};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::Read;
use tauri::ipc::Channel;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn pty_spawn(
    state: State<PtyState>,
    shell: String,
    args: Vec<String>,
    cwd: String,
    cols: u16,
    rows: u16,
    on_data: Channel<Vec<u8>>,
) -> Result<String, String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let mut cmd = CommandBuilder::new(&shell);
    cmd.args(&args);
    if !cwd.is_empty() {
        cmd.cwd(&cwd);
    }
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd.env("TERM_PROGRAM", "DarkWinD_UI");
    cmd.env("TERM_PROGRAM_VERSION", env!("CARGO_PKG_VERSION"));

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    // El extremo esclavo ya quedó en manos del hijo; hace falta soltar nuestra copia acá
    // para que el reader del master vea EOF cuando el proceso termine, en vez de
    // quedarse esperando para siempre.
    drop(pair.slave);

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let reader_id = id.clone();

    std::thread::spawn(move || {
        let id = reader_id;
        // El Channel de Tauri (@tauri-apps/api core.js, clase Channel) entrega los
        // mensajes en orden estricto por índice: si el mensaje 0 se pierde, cualquier
        // mensaje posterior queda atascado en un buffer para siempre esperándolo —
        // nunca se dispara `onmessage`, sin ningún error visible. ConPTY manda su
        // consulta de posición del cursor (ESC[6n) apenas arranca el shell, tan rápido
        // que puede ganarle a que el lado nativo de Tauri termine de registrar este
        // canal — cuando eso pasaba, ese primer paquete se perdía y la terminal
        // quedaba congelada en blanco para siempre (el shell nunca recibe la
        // respuesta a esa consulta y se queda esperando antes de imprimir nada más).
        // Este respiro le da tiempo al registro del canal a asentarse antes de que
        // el primer byte salga.
        std::thread::sleep(std::time::Duration::from_millis(100));
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    log::info!("pty_spawn[{id}]: lectura devolvió EOF (Ok(0)), termina el hilo lector");
                    break;
                }
                Ok(n) => {
                    // Un solo envío fallido no significa que el canal esté muerto para
                    // siempre — puede ser un hueco transitorio justo después del spawn,
                    // antes de que el puente IPC del lado del frontend termine de
                    // registrar el canal (más probable cuando el shell escribe su
                    // banner casi apenas arranca). Cortar acá de forma permanente dejaba
                    // la terminal en blanco para siempre en esos casos, aunque el shell
                    // siguiera vivo y el canal se volviera utilizable un instante
                    // después — solo se corta cuando el PTY realmente termina (Ok(0))
                    // o falla la lectura misma.
                    if on_data.send(buf[..n].to_vec()).is_err() {
                        log::warn!("pty_spawn[{id}]: falló un envío de datos por el canal, se reintenta con el próximo chunk");
                    }
                }
                Err(e) => {
                    log::error!("pty_spawn[{id}]: la lectura del PTY falló, termina el hilo lector: {e}");
                    break;
                }
            }
        }
    });

    state.0.lock().unwrap().insert(
        id.clone(),
        PtySession {
            master: pair.master,
            writer,
            child,
        },
    );

    Ok(id)
}

#[tauri::command]
pub fn pty_write(state: State<PtyState>, id: String, data: String) -> Result<(), String> {
    let mut sessions = state.0.lock().unwrap();
    if !sessions.contains_key(&id) {
        let live: Vec<_> = sessions.keys().cloned().collect();
        log::error!("pty_write[{id}]: no se encontró la sesión (ids vivas: {live:?})");
    }
    let session = sessions.get_mut(&id).ok_or("pty session not found")?;
    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())?;
    session.writer.flush().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_resize(state: State<PtyState>, id: String, cols: u16, rows: u16) -> Result<(), String> {
    let sessions = state.0.lock().unwrap();
    let session = sessions.get(&id).ok_or("pty session not found")?;
    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_kill(state: State<PtyState>, id: String) -> Result<(), String> {
    let mut sessions = state.0.lock().unwrap();
    if let Some(mut session) = sessions.remove(&id) {
        session.child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Aproxima la heurística de "proceso en primer plano" del original (que usaba `lsof`/
// `/proc`, no disponibles en Windows): baja por los descendientes del shell del PTY
// hasta el hijo más profundo que sigue vivo, igual que un detector basado en `ps` en
// Unix acertaría en el caso común de un shell corriendo un solo comando en primer plano.
fn deepest_child(system: &sysinfo::System, pid: sysinfo::Pid) -> sysinfo::Pid {
    match system.processes().values().find(|p| p.parent() == Some(pid)) {
        Some(child) => deepest_child(system, child.pid()),
        None => pid,
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PtyStatus {
    pub cwd: Option<String>,
    pub process_name: Option<String>,
}

#[tauri::command]
pub fn pty_status(state: State<PtyState>, id: String) -> Result<PtyStatus, String> {
    let pid = {
        let mut sessions = state.0.lock().unwrap();
        let session = sessions.get_mut(&id).ok_or("pty session not found")?;
        session.child.process_id()
    };
    let Some(pid) = pid else {
        return Ok(PtyStatus {
            cwd: None,
            process_name: None,
        });
    };

    let mut system = sysinfo::System::new();
    system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let foreground_pid = deepest_child(&system, sysinfo::Pid::from_u32(pid));
    let process = system.process(foreground_pid);

    Ok(PtyStatus {
        cwd: process
            .and_then(|p| p.cwd())
            .map(|p| p.to_string_lossy().into_owned()),
        process_name: process.map(|p| p.name().to_string_lossy().into_owned()),
    })
}

#[cfg(test)]
mod tests {
    use portable_pty::{native_pty_system, CommandBuilder, PtySize};
    use std::io::{Read, Write};
    use std::sync::mpsc;
    use std::time::{Duration, Instant};

    // Ejercita la mecánica real de portable-pty que envuelven pty_spawn/pty_write/
    // pty_resize/pty_kill, contra un shell realmente spawneado — los comandos de Tauri
    // en sí son demasiado finos (buscar en el estado + mapear errores) como para
    // valer la pena testearlos aparte de lo que envuelven.
    #[test]
    fn spawn_write_read_resize_kill_round_trip() {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .expect("openpty debería funcionar");

        let mut cmd = CommandBuilder::new("cmd.exe");
        cmd.args(["/Q"]);
        let mut child = pair.slave.spawn_command(cmd).expect("el spawn debería funcionar");
        drop(pair.slave);

        let mut reader = pair
            .master
            .try_clone_reader()
            .expect("clonar el reader debería funcionar");
        let mut writer = pair
            .master
            .take_writer()
            .expect("tomar el writer debería funcionar");

        // Se lee en un hilo aparte y se manda cada chunk por un canal: una lectura
        // bloqueante directa en este hilo no respeta ningún timeout, así que si el
        // shell nunca produce salida el test se cuelga para siempre en vez de fallar
        // con un mensaje claro.
        let (tx, rx) = mpsc::channel::<Vec<u8>>();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        if tx.send(buf[..n].to_vec()).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        writer
            .write_all(b"echo darkwind_pty_test\r\n")
            .expect("el write debería funcionar");
        writer.flush().expect("el flush debería funcionar");

        let mut output = String::new();
        let mut answered_cursor_query = false;
        let deadline = Instant::now() + Duration::from_secs(10);
        while !output.contains("darkwind_pty_test") {
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                break;
            }
            match rx.recv_timeout(remaining) {
                Ok(chunk) => {
                    output.push_str(&String::from_utf8_lossy(&chunk));
                    // ConPTY (o el propio cmd.exe) consulta la posición del cursor con
                    // ESC[6n al arrancar y se queda esperando una respuesta antes de
                    // seguir — en la app real esto lo contesta xterm.js solo; acá se
                    // simula la respuesta mínima para no bloquear el test.
                    if !answered_cursor_query && output.contains("\x1b[6n") {
                        answered_cursor_query = true;
                        writer
                            .write_all(b"\x1b[24;1R")
                            .expect("responder la consulta de cursor debería funcionar");
                        writer.flush().expect("el flush debería funcionar");
                    }
                }
                Err(_) => break,
            }
        }
        assert!(
            output.contains("darkwind_pty_test"),
            "se esperaba el comando eco en la salida del PTY, se obtuvo: {output:?}"
        );

        pair.master
            .resize(PtySize {
                rows: 30,
                cols: 100,
                pixel_width: 0,
                pixel_height: 0,
            })
            .expect("el resize debería funcionar");

        child.kill().expect("el kill debería funcionar");
        let status = child.wait().expect("el wait debería funcionar después del kill");
        assert!(!status.success(), "un proceso matado no debería reportar éxito");
    }
}

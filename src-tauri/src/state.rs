use portable_pty::{Child, MasterPty};
use std::collections::HashMap;
use std::io::Write;
use std::sync::Mutex;
use sysinfo::System;

pub struct PtySession {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
    pub child: Box<dyn Child + Send + Sync>,
}

#[derive(Default)]
pub struct PtyState(pub Mutex<HashMap<String, PtySession>>);

// Un único System reutilizado entre llamadas: sysinfo calcula el uso de CPU como
// delta contra la lectura anterior, así que crear una instancia nueva en cada
// comando siempre daría 0% de uso. Mantenerlo en el estado de Tauri también evita
// el costo de re-enumerar procesos/discos desde cero en cada poll del frontend.
pub struct SysinfoState(pub Mutex<System>);

impl Default for SysinfoState {
    fn default() -> Self {
        SysinfoState(Mutex::new(System::new_all()))
    }
}

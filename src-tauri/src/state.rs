use portable_pty::{Child, MasterPty};
use std::collections::HashMap;
use std::io::Write;
use std::sync::Mutex;

pub struct PtySession {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
    pub child: Box<dyn Child + Send + Sync>,
}

#[derive(Default)]
pub struct PtyState(pub Mutex<HashMap<String, PtySession>>);

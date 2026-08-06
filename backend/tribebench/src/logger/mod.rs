// src/logger/mod.rs

use chrono::Local;
use once_cell::sync::Lazy;
use serde_json::{json, Value};
use std::fs::{File, OpenOptions};
use std::io::{BufWriter, Write, stdout};  // حذف Stderr
use std::path::PathBuf;
use std::sync::Mutex;
use std::env;

mod fields;
pub use fields::*;

// ─── Singleton Logger ─────────────────────────────────────────────────────────

pub static LOGGER: Lazy<Mutex<Option<Logger>>> = Lazy::new(|| Mutex::new(None));

// ─── Config ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct Config {
    pub file_path: Option<PathBuf>,
    pub level: Level,
    pub environment: String,
    pub output_mode: OutputMode,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            file_path: Some(PathBuf::from("logs/benchmark/app.jsonl")),
            level: Level::Info,
            environment: "development".to_string(),
            output_mode: OutputMode::Both,
        }
    }
}

// ─── Output Mode ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OutputMode {
    FileOnly,
    StdoutOnly,
    Both,
}

impl OutputMode {
    pub fn from_env() -> Self {
        match env::var("LOG_OUTPUT").as_deref() {
            Ok("stdout") => OutputMode::StdoutOnly,
            Ok("file") => OutputMode::FileOnly,
            Ok("both") => OutputMode::Both,
            _ => {
                if env::var("DOCKER_ENV").is_ok() ||
                   env::var("CONTAINER_RUNTIME").is_ok() {
                    OutputMode::StdoutOnly
                } else {
                    OutputMode::Both
                }
            }
        }
    }
}

// ─── Level ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Level {
    Debug = 0,
    Info = 1,
    Warn = 2,
    Error = 3,
}

impl Level {
    pub fn as_str(&self) -> &'static str {  // تغییر به pub
        match self {
            Level::Debug => "debug",
            Level::Info => "info",
            Level::Warn => "warn",
            Level::Error => "error",
        }
    }

    pub fn from_env() -> Self {  // تغییر به pub و حذف duplicate
        match env::var("LOG_LEVEL").as_deref() {
            Ok("debug") => Level::Debug,
            Ok("info") => Level::Info,
            Ok("warn") => Level::Warn,
            Ok("error") => Level::Error,
            _ => Level::Info,
        }
    }
}

// ─── Logger ───────────────────────────────────────────────────────────────────

pub struct Logger {
    file_writer: Option<BufWriter<File>>,
    stdout_writer: BufWriter<std::io::Stdout>,
    level: Level,
    environment: String,
    hostname: String,
    output_mode: OutputMode,
}

impl Logger {
    fn new(cfg: Config) -> Result<Self, Box<dyn std::error::Error>> {
        let file_writer = if let Some(path) = &cfg.file_path {
            if let Some(parent) = path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }

            match OpenOptions::new()
                .create(true)
                .append(true)
                .open(path) {
                    Ok(file) => Some(BufWriter::new(file)),
                    Err(e) => {
                        eprintln!("⚠️ Warning: Cannot open log file: {}. Using stdout only.", e);
                        None
                    }
                }
        } else {
            None
        };

        let hostname = hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string());

        Ok(Self {
            file_writer,
            stdout_writer: BufWriter::new(stdout()),
            level: cfg.level,
            environment: cfg.environment,
            hostname,
            output_mode: cfg.output_mode,
        })
    }

    fn log(&mut self, level: Level, module: &str, msg: &str, fields: Vec<(String, Value)>) {
        if level < self.level {
            return;
        }

        let timestamp = Local::now().format("%Y-%m-%dT%H:%M:%S%.3f%:z").to_string();

        let mut entry = json!({
            "level": level.as_str(),
            "timestamp": timestamp,
            "module": module,
            "message": msg,
            "environment": self.environment,
            "hostname": self.hostname,
        });

        if let Some(obj) = entry.as_object_mut() {
            for (key, val) in fields {
                obj.insert(key, val);
            }
        }

        let line = match serde_json::to_string(&entry) {
            Ok(l) => l,
            Err(e) => {
                eprintln!("❌ Failed to serialize log: {}", e);
                return;
            }
        };

        // همیشه به stdout بنویس
        let _ = writeln!(self.stdout_writer, "{}", line);
        let _ = self.stdout_writer.flush();

        // اگر mode اجازه میده، به فایل هم بنویس
        if self.output_mode != OutputMode::StdoutOnly {
            if let Some(ref mut writer) = self.file_writer {
                let _ = writeln!(writer, "{}", line);
                let _ = writer.flush();
            }
        }
    }

    // ─── Public Methods ──────────────────────────────────────────────────────

    pub fn debug(&mut self, module: &str, msg: &str) {
        self.log(Level::Debug, module, msg, vec![]);
    }

    pub fn info(&mut self, module: &str, msg: &str) {
        self.log(Level::Info, module, msg, vec![]);
    }

    pub fn warn(&mut self, module: &str, msg: &str) {
        self.log(Level::Warn, module, msg, vec![]);
    }

    pub fn error(&mut self, module: &str, msg: &str) {
        self.log(Level::Error, module, msg, vec![]);
    }

    pub fn debug_fields(&mut self, module: &str, msg: &str, fields: Vec<(String, Value)>) {
        self.log(Level::Debug, module, msg, fields);
    }

    pub fn info_fields(&mut self, module: &str, msg: &str, fields: Vec<(String, Value)>) {
        self.log(Level::Info, module, msg, fields);
    }

    pub fn warn_fields(&mut self, module: &str, msg: &str, fields: Vec<(String, Value)>) {
        self.log(Level::Warn, module, msg, fields);
    }

    pub fn error_fields(&mut self, module: &str, msg: &str, fields: Vec<(String, Value)>) {
        self.log(Level::Error, module, msg, fields);
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

pub fn init(cfg: Option<Config>) -> Result<(), Box<dyn std::error::Error>> {
    let config = cfg.unwrap_or_else(|| {
        let mut cfg = Config::default();

        cfg.level = Level::from_env();
        cfg.output_mode = OutputMode::from_env();

        if cfg.output_mode == OutputMode::StdoutOnly {
            cfg.file_path = None;
        }

        cfg
    });

    let mut guard = LOGGER.lock().unwrap();
    *guard = Some(Logger::new(config)?);
    Ok(())
}

// ─── Macros ───────────────────────────────────────────────────────────────────

#[macro_export]
macro_rules! log_debug {
    ($module:expr, $msg:expr) => {{
        if let Ok(mut guard) = $crate::logger::LOGGER.lock() {
            if let Some(ref mut logger) = *guard {
                logger.debug($module, $msg);
            }
        }
    }};
}

#[macro_export]
macro_rules! log_info {
    ($module:expr, $msg:expr) => {{
        if let Ok(mut guard) = $crate::logger::LOGGER.lock() {
            if let Some(ref mut logger) = *guard {
                logger.info($module, $msg);
            }
        }
    }};
}

#[macro_export]
macro_rules! log_warn {
    ($module:expr, $msg:expr) => {{
        if let Ok(mut guard) = $crate::logger::LOGGER.lock() {
            if let Some(ref mut logger) = *guard {
                logger.warn($module, $msg);
            }
        }
    }};
}

#[macro_export]
macro_rules! log_error {
    ($module:expr, $msg:expr) => {{
        if let Ok(mut guard) = $crate::logger::LOGGER.lock() {
            if let Some(ref mut logger) = *guard {
                logger.error($module, $msg);
            }
        }
    }};
}

#[macro_export]
macro_rules! log_debug_fields {
    ($module:expr, $msg:expr, $fields:expr) => {{
        if let Ok(mut guard) = $crate::logger::LOGGER.lock() {
            if let Some(ref mut logger) = *guard {
                logger.debug_fields($module, $msg, $fields);
            }
        }
    }};
}

#[macro_export]
macro_rules! log_info_fields {
    ($module:expr, $msg:expr, $fields:expr) => {{
        if let Ok(mut guard) = $crate::logger::LOGGER.lock() {
            if let Some(ref mut logger) = *guard {
                logger.info_fields($module, $msg, $fields);
            }
        }
    }};
}

#[macro_export]
macro_rules! log_warn_fields {
    ($module:expr, $msg:expr, $fields:expr) => {{
        if let Ok(mut guard) = $crate::logger::LOGGER.lock() {
            if let Some(ref mut logger) = *guard {
                logger.warn_fields($module, $msg, $fields);
            }
        }
    }};
}

#[macro_export]
macro_rules! log_error_fields {
    ($module:expr, $msg:expr, $fields:expr) => {{
        if let Ok(mut guard) = $crate::logger::LOGGER.lock() {
            if let Some(ref mut logger) = *guard {
                logger.error_fields($module, $msg, $fields);
            }
        }
    }};
}

#[macro_export]
macro_rules! fields {
    ( $( $key:expr => $val:expr ),* $(,)? ) => {
        vec![
            $(
                ($key.to_string(), serde_json::to_value($val).unwrap_or(serde_json::Value::Null))
            ),*
        ]
    };
}

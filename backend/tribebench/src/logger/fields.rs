// src/logger/fields.rs

use serde_json::Value;

// ─── Field Constructor (returns tuple for use with fields! macro) ─────────────
// Using simple String keys instead of &'static str to avoid Box::leak

pub fn status(code: u16) -> (String, Value) {
    ("status".to_string(), Value::from(code))
}

pub fn port(p: u16) -> (String, Value) {
    ("port".to_string(), Value::from(p))
}

pub fn string(key: &str, val: &str) -> (String, Value) {
    (key.to_string(), Value::String(val.to_string()))
}

pub fn int(key: &str, val: i64) -> (String, Value) {
    (key.to_string(), Value::from(val))
}

pub fn uint64(key: &str, val: u64) -> (String, Value) {
    (key.to_string(), Value::from(val))
}

pub fn float64(key: &str, val: f64) -> (String, Value) {
    (key.to_string(), Value::from(val))
}

pub fn bool_val(key: &str, val: bool) -> (String, Value) {
    (key.to_string(), Value::from(val))
}

pub fn duration_ms(key: &str, val: u128) -> (String, Value) {
    (key.to_string(), Value::from(val.to_string()))
}

pub fn err(e: &dyn std::error::Error) -> (String, Value) {
    ("error".to_string(), Value::String(e.to_string()))
}

pub fn err_string(msg: &str) -> (String, Value) {
    ("error".to_string(), Value::String(msg.to_string()))
}

pub fn any(key: &str, val: &str) -> (String, Value) {
    (key.to_string(), Value::String(val.to_string()))
}
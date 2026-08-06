use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct BenchmarkRequest {
    pub algorithm: String,
    #[serde(rename = "inputSize")]
    pub input_size: usize,
    pub options: Option<BenchmarkOptions>,
}

#[derive(Debug, Deserialize)]
pub struct BenchmarkOptions {
    pub iterations: Option<usize>,
    #[serde(rename = "warmupRuns")]
    pub warmup_runs: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct CompareRequest {
    pub algorithms: Vec<String>,
    #[serde(rename = "inputSize")]
    pub input_size: usize,
}

#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub error: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T, message: impl Into<String>) -> Self {
        Self { success: true, data: Some(data), message: message.into(), error: None }
    }

    pub fn err(message: impl Into<String>, error: impl Into<String>) -> ApiResponse<()> {
        ApiResponse {
            success: false,
            data: None,
            message: message.into(),
            error: Some(error.into()),
        }
    }
}
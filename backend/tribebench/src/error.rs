use thiserror::Error;

#[derive(Debug, Error)]
pub enum BenchmarkError {
    #[error("unknown algorithm: {0}")]
    UnknownAlgorithm(String),

    #[error("graph generation failed: {0}")]
    GraphError(String),

    #[error("insufficient data for statistics: need at least 1 run, got 0")]
    InsufficientData,

    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}
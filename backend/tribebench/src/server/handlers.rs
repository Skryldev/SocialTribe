use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};

use crate::{
    benchmark::{BenchmarkConfig, BenchmarkEngine},
    error::BenchmarkError,
    graph::GraphGenerator,
    algorithms::AlgorithmRegistry,
    server::models::{ApiResponse, BenchmarkRequest, CompareRequest},
    log_debug, log_debug_fields, log_error_fields, log_info, log_info_fields, log_warn, fields,
};
use sysinfo::System;
use tokio::sync::Notify;

pub struct AppState {
    pub generator: GraphGenerator,
    pub registry: AlgorithmRegistry,
    pub shutdown_called: AtomicBool,
    pub shutdown_notify: Arc<Notify>,
}

pub async fn health_handler() -> impl IntoResponse {
    log_debug_fields!("handlers", "Health check requested", fields!(
        "endpoint" => "/api/benchmark/health",
    ));

    let sys = System::new_all();
    let used_mb = sys.used_memory() / 1024 / 1024;
    let total_mb = sys.total_memory() / 1024 / 1024;

    log_debug_fields!("handlers", "Health check response", fields!(
        "used_memory_mb" => used_mb as i64,
        "total_memory_mb" => total_mb as i64,
        "platform" => std::env::consts::OS,
    ));

    Json(serde_json::json!({
        "status": "ok",
        "rust_version": env!("CARGO_PKG_VERSION"),
        "platform": std::env::consts::OS,
        "memory": {
            "used_mb": used_mb,
            "total_mb": total_mb,
        }
    }))
}

pub async fn benchmark_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<BenchmarkRequest>,
) -> impl IntoResponse {
    let iterations = req.options.as_ref().and_then(|o| o.iterations).unwrap_or(7);
    let warmup = req.options.as_ref().and_then(|o| o.warmup_runs).unwrap_or(3);

    log_info_fields!("handlers", "Benchmark requested", fields!(
        "algorithm" => req.algorithm.clone(),
        "input_size" => req.input_size as i64,
        "iterations" => iterations as i64,
        "warmup_runs" => warmup as i64,
    ));

    let config = BenchmarkConfig::new(&req.algorithm, req.input_size)
        .with_iterations(iterations)
        .with_warmup(warmup);

    let engine = BenchmarkEngine::new(config, &state.registry);

    match engine.run(&state.generator).await {
        Ok(stats) => {
            log_info_fields!("handlers", "Benchmark completed successfully", fields!(
                "algorithm" => req.algorithm.clone(),
                "input_size" => req.input_size as i64,
                "runs" => stats.runs as i64,
            ));
            (
                StatusCode::OK,
                Json(serde_json::to_value(ApiResponse::ok(stats, "Benchmark completed successfully")).unwrap()),
            )
        },
        Err(BenchmarkError::UnknownAlgorithm(ref name)) => {
            log_warn!("handlers", &format!("Unknown algorithm requested: {}", name));
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::to_value(ApiResponse::<()>::err(
                    "Unknown algorithm",
                    format!("No algorithm registered for '{name}'"),
                )).unwrap()),
            )
        },
        Err(ref e) => {
            log_error_fields!("handlers", "Benchmark failed", fields!(
                "algorithm" => req.algorithm.clone(),
                "input_size" => req.input_size as i64,
                "error" => e.to_string(),
            ));
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::to_value(ApiResponse::<()>::err("Benchmark failed", e.to_string())).unwrap()),
            )
        },
    }
}

pub async fn compare_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CompareRequest>,
) -> impl IntoResponse {
    log_info_fields!("handlers", "Compare requested", fields!(
        "algorithms" => format!("{:?}", req.algorithms),
        "input_size" => req.input_size as i64,
        "algorithm_count" => req.algorithms.len() as i64,
    ));

    let mut results = Vec::new();
    let mut skipped = 0;

    for algorithm in &req.algorithms {
        let config = BenchmarkConfig::new(algorithm, req.input_size)
            .with_iterations(3)
            .with_warmup(1);
        let engine = BenchmarkEngine::new(config, &state.registry);

        match engine.run(&state.generator).await {
            Ok(stats) => {
                log_debug_fields!("handlers", "Compare: algorithm completed", fields!(
                    "algorithm" => algorithm.clone(),
                    "runs" => stats.runs as i64,
                ));
                results.push(stats);
            },
            Err(ref e) => {
                skipped += 1;
                log_warn!("handlers", &format!("Compare: skipping algorithm '{}': {}", algorithm, e));
            }
        }
    }

    log_info_fields!("handlers", "Compare completed", fields!(
        "total_algorithms" => req.algorithms.len() as i64,
        "successful" => results.len() as i64,
        "skipped" => skipped as i64,
    ));

    (
        StatusCode::OK,
        Json(serde_json::to_value(ApiResponse::ok(results, "Comparison completed")).unwrap()),
    )
}

// ============================================================
// Shutdown & Simple Health APIs (matching Go version)
// ============================================================

/// GET /health - Simple health check returning "OK" (matches Go implementation)
pub async fn shutdown_health_handler() -> impl IntoResponse {
    log_debug!("shutdown_server", "Health check requested via /health");
    (StatusCode::OK, "OK")
}

/// GET /stats - Returns storage statistics as JSON (placeholder for now)
pub async fn stats_handler() -> impl IntoResponse {
    log_debug!("shutdown_server", "Stats requested via /stats");
    
    // TODO: Replace with actual storage stats when storage module is available
    let stats = serde_json::json!({
        "status": "ok",
        "file_path": "N/A - storage not connected",
        "node_record_size": 0,
        "edge_record_size": 0,
    });

    (
        StatusCode::OK,
        Json(stats),
    )
}

/// POST /shutdown - Graceful shutdown (matches Go implementation)
pub async fn shutdown_handler(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    log_info_fields!("shutdown_server", "Shutdown requested via HTTP", fields!(
        "endpoint" => "/shutdown",
    ));

    // Check if shutdown already called (like Go's sync.Once)
    if state.shutdown_called.swap(true, Ordering::SeqCst) {
        log_warn!("shutdown_server", "⚠️ Shutdown already called, ignoring");
        return (StatusCode::OK, "Shutdown already in progress".to_string());
    }

    log_info!("shutdown_server", "📡 Shutdown request received via HTTP");
    log_info!("shutdown_server", "📝 Closing storage...");

    // Signal the main thread to start graceful shutdown
    state.shutdown_notify.notify_one();
    
    log_info!("shutdown_server", "✅ Shutdown initiated successfully");
    
    (StatusCode::OK, "Shutdown initiated successfully".to_string())
}
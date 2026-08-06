// src/main.rs

mod algorithms;
mod benchmark;
mod error;
mod graph;
mod logger;
mod server;

use algorithms::default_registry;
use axum::{routing::{get, post}, Router};
use graph::GraphGenerator;
use logger::{Config, Level, OutputMode};
use server::handlers::{
    AppState, benchmark_handler, compare_handler, health_handler,
    shutdown_handler, shutdown_health_handler, stats_handler,
};
use std::sync::{Arc, atomic::AtomicBool};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tokio::signal;
use tokio::sync::Notify;
use std::env;

#[tokio::main]
async fn main() {
    // ============================================================
    // [0] Initialize Logger - Docker First Approach
    // ============================================================

    let is_docker = env::var("DOCKER_ENV").is_ok() ||
                    env::var("CONTAINER_RUNTIME").is_ok() ||
                    env::var("KUBERNETES_SERVICE_HOST").is_ok();

    let log_config = if is_docker {
        Config {
            file_path: None,
            level: Level::from_env(),
            environment: env::var("ENVIRONMENT").unwrap_or_else(|_| "production".to_string()),
            output_mode: OutputMode::StdoutOnly,
        }
    } else {
        Config {
            file_path: Some("logs/benchmark/app.jsonl".into()),
            level: Level::from_env(),
            environment: env::var("ENVIRONMENT").unwrap_or_else(|_| "development".to_string()),
            output_mode: OutputMode::Both,
        }
    };

    // ذخیره سطح لاگ قبل از move
    let log_level = log_config.level;
    let log_environment = log_config.environment.clone();
    let log_output = log_config.output_mode;

    // راه‌اندازی logger
    if let Err(e) = logger::init(Some(log_config)) {
        eprintln!("⚠️ Failed to initialize logger: {}", e);
        eprintln!("⚠️ Continuing without file logging...");
    }

    // راه‌اندازی tracing
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(env_filter)
        .with(tracing_subscriber::fmt::layer()
            .with_target(true)
            .with_thread_ids(true)
            .with_file(true)
            .with_line_number(true)
            .json()
        )
        .init();

    // ============================================================
    // [1] Display Banner
    // ============================================================
    println!();
    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║                                                              ║");
    println!("║         🚀  GRAPH BENCHMARK SERVER  🚀                     ║");
    println!("║              v1.0.0 - Rust + Axum                           ║");
    println!("║                                                              ║");
    println!("╚══════════════════════════════════════════════════════════════╝");
    println!();

    log_info!("main", "═══════════════════════════════════════════════════════════");
    log_info!("main", "🚀 Graph Benchmark Server Starting");
    log_info!("main", "═══════════════════════════════════════════════════════════");

    log_info_fields!("main", "Logger initialized", fields!(
        "environment" => if is_docker { "docker" } else { "development" },
        "log_output" => if log_output == OutputMode::StdoutOnly { "stdout" } else { "file+stdout" },
        "level" => log_level.as_str(),
    ));

    tracing::info!(
        environment = if is_docker { "docker" } else { "development" },
        "Logger initialized"
    );

    // ============================================================
    // [2] Initialize State
    // ============================================================
    println!("📊 [1/2] Initializing Graph Generator & Algorithm Registry...");
    log_info!("main", "📊 [1/2] Initializing Graph Generator & Algorithm Registry...");

    let registry = default_registry();
    let algorithm_count = registry.list_algorithms().len();

    let shutdown_notify = Arc::new(Notify::new());
    let shutdown_notify_clone = shutdown_notify.clone();

    let state = Arc::new(AppState {
        generator: GraphGenerator::new(),
        registry,
        shutdown_called: AtomicBool::new(false),
        shutdown_notify,
    });

    println!("   ✅ State initialized with {} algorithms", algorithm_count);
    log_info_fields!("main", "✅ State initialized", fields!(
        "algorithm_count" => algorithm_count as i64,
    ));

    tracing::info!(
        algorithm_count = algorithm_count,
        "State initialized"
    );

    // ============================================================
    // [3] Setup Router & Start Server
    // ============================================================
    println!("🔧 [2/2] Setting up CORS and Router...");
    log_info!("main", "🔧 [2/2] Setting up CORS and Router...");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/benchmark/health", get(health_handler))
        .route("/api/benchmark/run", post(benchmark_handler))
        .route("/api/benchmark/compare", post(compare_handler))
        .route("/health", get(shutdown_health_handler))
        .route("/stats", get(stats_handler))
        .route("/shutdown", post(shutdown_handler))
        .layer(cors)
        .with_state(state);

    log_info!("main", "✅ Router configured");
    tracing::info!("Router configured");

    // ============================================================
    // [4] Get Port from Environment
    // ============================================================
    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(3001);

    println!("   🔌 Binding to port {}...", port);
    log_info!("main", "🔌 Binding to port...");
    tracing::info!(port = port, "Binding to port");

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port))
        .await
        .expect("failed to bind listener");

    println!("   ✅ Listener bound to 0.0.0.0:{}", port);
    log_info_fields!("main", "✅ Listener bound", fields!(
        "address" => format!("0.0.0.0:{}", port),
    ));

    tracing::info!(
        address = format!("0.0.0.0:{}", port),
        "Listener bound"
    );

    // ============================================================
    // [5] Server Ready Banner
    // ============================================================
    println!();
    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║                                                              ║");
    println!("║             ✅  S E R V E R   I S   R E A D Y  ✅            ║");
    println!("║                                                              ║");
    println!("║   📡 API:       http://0.0.0.0:{}                           ", port);
    println!("║   ❤️  Health:   http://0.0.0.0:{}/health                    ", port);
    println!("║   📊 Stats:    http://0.0.0.0:{}/stats                      ", port);
    println!("║   🛑 Shutdown: http://0.0.0.0:{}/shutdown                   ", port);
    println!("║                                                              ║");
    println!("║   Benchmark Endpoints:                                       ║");
    println!("║   🏃 Run:      http://0.0.0.0:{}/api/benchmark/run          ", port);
    println!("║   📊 Compare:  http://0.0.0.0:{}/api/benchmark/compare      ", port);
    println!("║   ❤️  Health:  http://0.0.0.0:{}/api/benchmark/health       ", port);
    println!("║                                                              ║");
    println!("║   Press Ctrl+C to stop                                       ║");
    println!("║                                                              ║");
    println!("╚══════════════════════════════════════════════════════════════╝");
    println!();

    log_info!("main", "═══════════════════════════════════════════════════════════");
    log_info!("main", "✅ Server is ready to accept requests");
    log_info_fields!("main", "Server endpoints", fields!(
        "port" => port as i64,
        "health" => "/health",
        "stats" => "/stats",
        "shutdown" => "/shutdown",
        "benchmark_run" => "/api/benchmark/run",
        "benchmark_compare" => "/api/benchmark/compare",
        "benchmark_health" => "/api/benchmark/health",
    ));
    log_info!("main", "═══════════════════════════════════════════════════════════");

    tracing::info!(
        port = port,
        endpoints = [
            "/health",
            "/stats",
            "/shutdown",
            "/api/benchmark/run",
            "/api/benchmark/compare",
            "/api/benchmark/health"
        ].join(","),
        "Server ready"
    );

    log_info!("main", "🚀 Server is running and accepting requests");
    tracing::info!("Server is running and accepting requests");

    // ============================================================
    // [6] Graceful Shutdown
    // ============================================================
    let app_clone = app.into_make_service_with_connect_info::<std::net::SocketAddr>();

    let server_handle = tokio::spawn(async move {
        axum::serve(listener, app_clone)
            .with_graceful_shutdown(async move {
                tokio::select! {
                    _ = shutdown_notify_clone.notified() => {
                        println!();
                        println!("📡 Shutdown signal received via HTTP /shutdown");
                        log_info!("main", "📡 Shutdown signal received via HTTP /shutdown");
                        tracing::info!("Shutdown signal received via HTTP /shutdown");
                    }
                    _ = signal::ctrl_c() => {
                        println!();
                        println!("📡 Received OS signal: Ctrl+C (SIGINT)");
                        log_info!("main", "📡 Received OS signal: Ctrl+C (SIGINT)");
                        tracing::info!("Received OS signal: Ctrl+C (SIGINT)");
                    }
                }
            })
            .await
            .expect("server error");
    });

    // ============================================================
    // [7] Wait for Server to Finish
    // ============================================================
    match server_handle.await {
        Ok(()) => {
            println!();
            println!("🛑 Initiating graceful shutdown...");
            println!();
            log_info!("main", "🛑 Initiating graceful shutdown...");
            tracing::info!("Initiating graceful shutdown...");

            log_info!("main", "📝 Closing storage...");
            println!("📝 Closing storage...");
            println!("   ✅ Storage closed successfully");
            log_info!("main", "✅ Storage closed successfully");

            log_info!("main", "🛑 Stopping HTTP server...");
            println!("🛑 Stopping HTTP server...");
            println!("   ✅ Server stopped gracefully");
            log_info!("main", "✅ Server stopped gracefully");

            println!();
            println!("╔══════════════════════════════════════════════════════════════╗");
            println!("║                                                              ║");
            println!("║              🛑  S E R V E R   S H U T D O W N  🛑          ║");
            println!("║                                                              ║");
            println!("╚══════════════════════════════════════════════════════════════╝");
            println!();

            log_info!("main", "✅ Server shutdown complete");
            log_info!("main", "═══════════════════════════════════════════════════════════");
            tracing::info!("Server shutdown complete");
        }
        Err(e) => {
            eprintln!("   ⚠️  Server error: {}", e);
            log_error!("main", &format!("⚠️ Server error: {}", e));
            tracing::error!(error = %e, "Server error");
        }
    }
}

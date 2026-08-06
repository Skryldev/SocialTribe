import asyncio
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from core.log_stream import log_stream
from logger_config import setup_logging
from routers import (
    backups,
    datasets,
    graph,
    graphs,
    layout,
    logs,
    query,
    simulation,
    system,
    viewport,
    metrics
)

# ============================================================
# [0] Environment & Configuration
# ============================================================

ENVIRONMENT = os.getenv("ENVIRONMENT", "production")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
PORT = int(os.getenv("PORT", 8080))
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")

# ============================================================
# [1] Logger Setup
# ============================================================

setup_logging()


# ============================================================
# [2] Lifespan Manager
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    مدیریت چرخه حیات برنامه
    """
    # Startup
    log_stream.set_loop(asyncio.get_running_loop())

    yield

    # Shutdown
    pass


# ============================================================
# [3] FastAPI Application
# ============================================================

app = FastAPI(
    title='Graph Management API',
    version='1.0.0',
    description='API for managing graph operations',
    servers=[
        {'url': f'http://localhost:{PORT}', 'description': 'Local development server'}
    ],
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None,
    openapi_url="/openapi.json" if DEBUG else None,
    lifespan=lifespan,
)

# ============================================================
# [4] Middleware
# ============================================================

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
    max_age=600,
)

# Trusted Host
if ALLOWED_HOSTS != ["*"]:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=ALLOWED_HOSTS,
    )

# ============================================================
# [5] Routers
# ============================================================

app.include_router(backups.router)
app.include_router(datasets.router)
app.include_router(graph.router)
app.include_router(graphs.router)
app.include_router(layout.router)
app.include_router(logs.router)
app.include_router(query.router)
app.include_router(simulation.router)
app.include_router(system.router)
app.include_router(viewport.router)
app.include_router(metrics.router)


# ============================================================
# [6] Health & Root Endpoints
# ============================================================

@app.get("/")
async def root():
    """Root endpoint - API gateway status"""
    return {
        "service": "Graph Management API",
        "version": "1.0.0",
        "status": "running",
        "environment": ENVIRONMENT,
    }


@app.get("/ready")
async def readiness_check():
    """Readiness check for Kubernetes"""
    return {
        "status": "ready",
        "service": "server",
    }


# ============================================================
# [7] Main Entry Point
# ============================================================

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=PORT,
        workers=1,
        loop="asyncio",
        log_level=os.getenv("LOG_LEVEL", "info"),
        reload=DEBUG,
        access_log=DEBUG,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )

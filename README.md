# SocialTribe
🕸️ SocialTribe – A graph-based system for modeling social networks, analyzing user relationships, and extracting structural insights from friendship datas.
# SocialTribe

SocialTribe is an open-source platform for building, managing, exploring, analyzing, and simulating graph-based applications.

Instead of treating graph data as just another dataset inside a traditional backend, SocialTribe is designed around a graph-first architecture where each major subsystem focuses on a specific responsibility while working together as a unified platform.

The project combines a purpose-built graph storage engine, a dedicated graph query engine, an interactive visualization interface, graph analytics, layout management, and simulation capabilities into a modular ecosystem designed specifically for graph-centric workloads.

Whether you're developing graph applications, exploring complex relationships, experimenting with graph algorithms, or building visualization tools, SocialTribe provides a foundation that keeps storage, computation, and visualization cleanly separated.

---

## Why SocialTribe

Graph applications often evolve into a collection of disconnected tools.

A storage solution, a visualization library, graph algorithms, query processing, and simulation logic are frequently implemented as separate systems with little architectural consistency.

SocialTribe approaches this problem differently.

Instead of combining unrelated components, the platform is built as a collection of specialized subsystems that share a common architectural philosophy while remaining independently maintainable.

This makes it easier to extend the platform without forcing unrelated parts of the system to evolve together.

---

## Core Components

The platform consists of several major components.

Each component owns a specific responsibility while integrating naturally with the rest of the ecosystem.

| Component | Responsibility |
|-----------|----------------|
| Graph Storage Engine | Persistent graph storage |
| Backend | Application orchestration |
| Query Engine | Graph query compilation |
| Frontend | Graph visualization and interaction |
| Analytics | Graph analysis algorithms |
| Layout System | Graph visualization layouts |
| Simulation | Dynamic graph propagation |

---

## Graph Storage Engine

At the heart of SocialTribe is **TribeDB**, a purpose-built graph storage engine developed specifically for graph workloads.

Rather than relying on a general-purpose database, TribeDB provides the storage foundation responsible for persistent graph data while allowing higher-level services to focus on querying, analytics, visualization, and simulations.

Its internal architecture is intentionally optimized around graph-oriented operations, making it the persistent source of truth for the entire platform.

> [!NOTE]
>
> The README intentionally provides only a high-level overview of TribeDB.
> The storage architecture, design decisions, runtime behavior, and implementation details are documented separately.

**Learn More**

- [Graph Storage Engine Documentation](docs/storage-engine/)

---

## Backend

The backend acts as the orchestration layer of the platform.

Instead of becoming another graph database, it coordinates application services, graph algorithms, query execution, graph management, and communication with the storage engine through a layered architecture.

This separation allows computational logic, application workflows, and persistent storage to evolve independently without overlapping responsibilities.

> [!NOTE]
>
> The backend documentation focuses on architecture, subsystem responsibilities, API organization, and development guidelines rather than implementation details.

**Learn More**

- [Backend Architecture Documentation](docs/backend/)

---

## Query Engine

SocialTribe includes a dedicated graph query engine designed specifically for graph queries.

The engine transforms user queries through a structured compilation pipeline before producing optimized execution plans that can later be consumed by the rest of the platform.

Its modular design allows every stage of query processing to evolve independently while remaining part of a single workflow.

> [!NOTE]
>
> The query language, compilation pipeline, planner, optimization stages, and implementation details are documented separately.

**Learn More**

- [Query Engine Documentation](docs/query-engine/)

---

## Frontend

The frontend provides an interactive environment for exploring and working with graph data.

It brings together visualization, graph editing, querying, analytics, layout management, and simulation into a unified user experience designed for both everyday graph exploration and advanced workflows.

Rather than acting as a simple visualization layer, the frontend is designed as an application that communicates naturally with the backend and other platform components while remaining independent from their internal implementation.

> [!NOTE]
>
> The frontend documentation covers the application architecture, UI organization, state management, visualization components, and developer guidelines.

**Learn More**

- [Frontend Architecture Documentation](docs/frontend/)

---

## Analytics

Understanding graph data requires more than simply storing or visualizing it.

SocialTribe provides a dedicated analytics subsystem for discovering relationships, extracting patterns, and performing graph-oriented analysis.

The analytics architecture is designed so that algorithms remain independent from storage concerns and application infrastructure, allowing new analytical capabilities to be introduced without affecting other parts of the platform.

> [!NOTE]
>
> Algorithm implementations, complexity analysis, and analytical workflows are documented independently from the project overview.

**Learn More**

- [Analytics Documentation](docs/analytics/)


## TribeCore

SocialTribe includes **TribeCore**, a custom native graph algorithms library developed by the project team using **Zig**. TribeCore is used to accelerate selected computational workloads while remaining fully integrated with the analytics subsystem. Design decisions, supported components, and implementation details are documented separately.

TribeCore is also officially published on the Python Package Index (PyPI) and can be installed using:

```bash
pip install tribecore
```

**PyPI**

https://pypi.org/project/tribecore/

**Learn More**

- [TribeCore Documentation](docs/analytics/tribecore/)

---

## Layout System

Different graph structures often require different visualization strategies.

SocialTribe includes a flexible layout subsystem that allows graphs to be presented using multiple layout approaches while preserving the original graph representation.

This separation between persistent graph data and visualization layouts enables experimentation without modifying the underlying graph itself.

> [!NOTE]
>
> Layout algorithms, snapshots, visualization workflows, and related architectural concepts are described in the Layout documentation.

**Learn More**

- [Layout System Documentation](docs/layouts/)

---

## Simulation

Graphs are often dynamic rather than static.

SocialTribe includes a simulation subsystem that enables experimentation with graph behavior over time through propagation-based workflows.

Simulation data remains isolated from persistent graph storage, allowing temporary runtime state to evolve independently while preserving the integrity of the underlying graph.

> [!NOTE]
>
> Simulation models, propagation workflows, runtime behavior, and implementation details are documented separately.

**Learn More**

- [Simulation Documentation](docs/simulation/)

---

## Design Philosophy

The architecture of SocialTribe is guided by a small number of design principles that remain consistent across the entire platform.

- Every subsystem owns a clearly defined responsibility.
- Persistent graph data has a single source of truth.
- Components communicate through well-defined boundaries.
- Implementation details remain encapsulated within their respective modules.
- New capabilities should extend the platform without increasing architectural coupling.

These principles make the platform easier to understand, maintain, and extend as it continues to grow.

---

## Documentation

Each major subsystem maintains its own documentation.

This repository intentionally keeps the README focused on introducing the project rather than describing internal implementation details.

If a particular component interests you, continue with its dedicated documentation.

| Documentation | Description |
|--------------|-------------|
| [Backend](docs/backend/) | Architecture, APIs, and application workflows |
| [Graph Storage Engine](docs/storage-engine/) | TribeDB architecture and storage concepts |
| [Query Engine](docs/query-engine/) | Query language, compilation pipeline, and planner |
| [Frontend](docs/frontend/) | Application architecture and UI organization |
| [Analytics](docs/analytics/) | Graph analysis capabilities |
| [Layout System](docs/layouts/) | Graph layout architecture |
| [Simulation](docs/simulation/) | Graph propagation and simulation |


## Project Structure

The repository is organized into independent modules, each responsible for a specific part of the platform.

| Directory | Purpose |
|-----------|---------|
| `frontend/` | Interactive graph application |
| `backend/server` | Application services and orchestration |
| `backend/tribedb/` | TribeDB graph storage engine |
| `backend/tribebench/` | Benchmark & Test Engine |
| `backend/query-engine/` | Graph Query Engine |
| `backend/tribecore/` | Graph Algorithms Core |
| `docs/` | Project documentation |

Each module is documented independently and can be explored without requiring knowledge of the entire system.

---

## Getting Started

Clone the repository.

```bash
git clone https://github.com/Asky23/SocialTribe.git

cd SocialTribe
```

---

## Installation

SocialTribe can be installed and executed in several ways depending on your use case.

| Method | Recommended For |
|--------|-----------------|
| **Release Packages** | End users |
| **Docker Compose** | Quick deployment |
| **Development Mode** | Contributors and developers |

### 1. Release Packages

The easiest way to install SocialTribe is by downloading the appropriate package from the project's GitHub Releases page.

1. Visit the Releases page:

   https://github.com/Asky23/SocialTribe/releases

2. Download the package that matches your operating system.

| Platform | Package |
|----------|---------|
| **Windows** | `social-tribe-vx.x.x-windows-amd64-setup.exe` |
| **Linux (AppImage)** | `social-tribe-vx.x.x-linux-amd64.AppImage` |
| **Linux (Debian)** | `social-tribe-vx.x.x-linux-amd64.deb` |
| **Linux (RPM)** | `social-tribe-vx.x.x-linux-amd64.rpm` |

3. Run the installer and follow the installation wizard.

---

### 2. Docker Compose

If Docker is installed on your system, you can start the entire platform with a single command.

```bash
cd SocialTribe
docker-compose up
```

Run in detached mode:

```bash
docker-compose up -d
```

Stop all services:

```bash
docker-compose down
```

---

### 3. Development Mode

This method is intended for contributors and developers who want to run each component independently.

#### Prerequisites

- Python 3.12.10
- Node.js
- Bun
- Go
- Rust

#### Frontend

```bash
cd frontend

bun install
bun run dev
```

#### TribeDB

```bash
cd backend/tribedb/cmd/server

go run .
```

#### Backend Server

```bash
cd backend/server

pip install -r requirements.txt

python -m main
```

#### TribeBench

```bash
cd backend/tribebench

cargo run
```

> [!WARNING]
> Start **TribeDB** before starting the Backend Server.
> The backend requires TribeDB to be available during startup.

> [!TIP]
>
> When using Development Mode, run each service in a separate terminal.

---

### Service Summary

| Service | Directory | Command |
|---------|-----------|---------|
| **Frontend** | `frontend` | `bun install && bun run dev` |
| **TribeDB** | `backend/tribedb/cmd/server` | `go run .` |
| **Backend Server** | `backend/server` | `pip install -r requirements.txt && python -m main` |
| **TribeBench** | `backend/tribebench` | `cargo run` |

---

Follow the documentation for the component you want to work with.

Whether your goal is running the complete platform, contributing to the backend, exploring the frontend, or studying the storage engine, each subsystem provides its own setup and development guide.

> [!TIP]
>
> Begin with the documentation that matches your area of interest instead of trying to understand the entire project at once.

**Start Here**

- [Project Documentation](docs/)
- [Backend Guide](docs/backend/)
- [Frontend Guide](docs/frontend/)
- [Graph Storage Engine](docs/storage-engine/)
- [Query Engine](docs/query-engine/)

---

## Project Goals

SocialTribe is built around a long-term vision rather than a single application.

The project aims to provide an ecosystem where graph storage, querying, visualization, analysis, and simulation can evolve together while remaining architecturally independent.

Some of the primary goals include:

- Building a purpose-built ecosystem for graph applications.
- Keeping subsystem responsibilities clearly separated.
- Making every major component independently understandable.
- Encouraging extensibility without increasing architectural complexity.
- Providing documentation that explains both concepts and implementation decisions.

---

## Contributing

Contributions of all kinds are welcome.

Whether you want to report an issue, improve documentation, fix a bug, implement a new feature, or discuss architectural ideas, your contribution is appreciated.

Before opening a pull request, please take a few minutes to read the documentation related to the component you intend to modify.

Understanding the design philosophy of each subsystem helps maintain consistency across the project.

---

## Documentation Philosophy

The documentation is organized around individual subsystems rather than a single monolithic manual.

Each section focuses on one responsibility and explains the concepts, architecture, and implementation decisions behind that part of the platform.

This README intentionally stays at a high level.

Its purpose is to introduce the project—not to replace the documentation.

---

## License

This project is licensed under the MIT License.

See the `LICENSE` file for additional information.
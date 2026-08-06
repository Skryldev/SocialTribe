# TribeCore

**High-Performance Graph Algorithms Engine powered by Zig**

## Overview

TribeCore is a native Python package for high-performance graph analysis. All algorithms are
implemented in [Zig](https://ziglang.org) and exposed to Python through a zero-copy FFI layer.
Pre-built wheels are available for Linux, macOS, and Windows — no Zig toolchain required.

Designed for production workloads where Python's interpreter overhead makes pure-Python graph
libraries impractical. TribeCore handles graphs with tens of thousands of nodes for centrality
analysis and millions of nodes for community detection.

---

## Key Features

| Feature | Description |
|---|---|
| **Native performance** | Algorithms compiled to native code with `ReleaseFast` optimization |
| **Zero-copy FFI** | NumPy arrays shared by pointer — no serialization overhead |
| **GIL-free execution** | Python's Global Interpreter Lock released during computation |
| **Pre-built wheels** | `pip install tribecore` — no compiler required |
| **Minimal dependencies** | Only NumPy ≥ 1.24 at runtime |
| **Predictable memory** | Fixed-size allocations, no dynamic growth during execution |
| **Cross-platform** | Linux, macOS (x86_64, arm64), Windows (x86_64) |

---

## Why TribeCore?

Pure-Python graph libraries become impractical for graphs beyond a few thousand nodes.
Iterative algorithms (PageRank, Eigenvector centrality) and all-pairs shortest path
computations are dominated by interpreter overhead.

TribeCore replaces Python loops with compiled Zig implementations while keeping the
API Pythonic. You pass dictionaries of nodes and neighbors — the conversion to compact
binary formats happens in Python, then all computation runs in native code.

The architecture uses `ctypes` rather than CPython C extensions. This avoids coupling
to a specific Python version ABI — one wheel works across Python 3.10 through 3.13.

---

## Installation

```bash
pip install tribecore
```

Pin a specific version for production:

```bash
pip install tribecore==4.6.13
```

**Requirements**: Python 3.10+, NumPy ≥ 1.24. Pre-built wheels are available for all
supported platforms. No Zig toolchain or C compiler is needed.

To build from source (requires Zig 0.13+), see the
[Build from Source](https://github.com/Asky23/SocialTribe) documentation.

---

## Quick Start

```python
import tribecore

# Define a directed graph: node → {neighbors}
node_to_idx = {"Alice": 0, "Bob": 1, "Charlie": 2}
neighbor_map = {
    "Alice":   {"Bob", "Charlie"},
    "Bob":     {"Charlie"},
    "Charlie": {"Alice"},
}

# Compute PageRank
bridge = tribecore.CentralityBridge()
scores = bridge.pagerank(node_to_idx, neighbor_map, damping=0.85)

# Map scores back to node names
for name, idx in node_to_idx.items():
    print(f"{name}: {scores[idx]:.4f}")
```

Output:
```
Alice:   0.7856
Bob:     0.5777
Charlie: 1.0000
```

---

## Core Algorithms

### Centrality

Centrality algorithms measure node importance. All accept `Dict[str, int]` for node mapping
and `Dict[str, Set[str]]` for edges. Results are normalized so the maximum score is 1.0.

| Algorithm | Purpose | Iterative | Best For |
|---|---|---|---|
| **PageRank** | Importance via random walk with teleportation | Yes | Web graphs, citation networks, ranking |
| **Eigenvector Centrality** | Influence based on neighbor quality | Yes | Social networks, prestige analysis |
| **Closeness Centrality** | Average distance to all reachable nodes | No | Information flow, transportation networks |
| **Harmonic Centrality** | Sum of inverse distances (handles disconnected graphs) | No | Partially connected networks, infrastructure |

**Performance note**: Centrality algorithms use a dense bitmap adjacency format with O(n²)
memory. Graphs up to ~50,000 nodes are practical on typical hardware.

### Community Detection

Community detection partitions nodes into densely connected groups using the Leiden algorithm.

| Function | Purpose | Format |
|---|---|---|
| **Leiden Local Moving** | Greedy community assignment optimizing modularity | CSR (Compressed Sparse Row) |
| **Modularity Calculation** | Quality score for a partition | CSR (Compressed Sparse Row) |

Community detection uses CSR format with O(n + m) memory, scaling to millions of nodes.
See the [documentation](#documentation) for CSR construction and community array initialization.

**Current limitation**: Implements the local moving phase only. Refinement and aggregation
phases of the full Leiden algorithm must be implemented in user code.

---

## Python API Overview

```python
import tribecore

# Centrality — dict-of-sets input, automatic bitmap conversion
cb = tribecore.CentralityBridge()
cb.pagerank(node_to_idx, neighbor_map, damping=0.85, max_iter=100, tolerance=1e-8)
cb.eigenvector(node_to_idx, neighbor_map, max_iter=100, tolerance=1e-6)
cb.closeness(node_to_idx, neighbor_map)
cb.harmonic(node_to_idx, neighbor_map)

# Leiden — CSR format input, pre-allocated community arrays
lb = tribecore.LeidenBridge()
lb.local_moving(adjacency_flat, adjacency_offsets, adjacency_lengths,
                node_count, total_weight, resolution,
                node_to_community, communities_flat, community_lengths,
                permutation_order)
lb.modularity(adjacency_flat, adjacency_offsets, adjacency_lengths,
              node_count, total_weight, resolution,
              node_to_community, communities_flat, community_lengths)
```

Two bridge classes. Six methods. No inheritance, no abstract base classes, no configuration
objects. See the [full documentation](#documentation) for complete parameter details.

---

## Performance Philosophy

**Zig over Python**: All algorithm logic runs in compiled Zig code using `ReleaseFast`
optimization — comparable to `-O3` in C compilers. Python only handles graph format
conversion and memory allocation.

**Zero-copy array sharing**: NumPy array buffers are passed directly to Zig via `ctypes`.
No data serialization, no intermediate formats, no memory duplication.

**GIL release**: `ctypes` automatically releases Python's Global Interpreter Lock during
foreign function calls. Multiple threads can compute on different graphs concurrently.

**Memory ownership**: Python allocates all arrays. Zig writes results into Python-owned
memory. Zig internal allocations use `malloc`/`free` with `defer`-guaranteed cleanup.
No memory leaks on any code path.

---

## Architecture Overview

```
Python API (CentralityBridge, LeidenBridge)
    │
    │  ctypes FFI (zero-copy NumPy pointers)
    ▼
graphcore shared library (.dll / .so / .dylib)
    │
    │  Compiled Zig with C ABI exports
    ▼
Algorithm implementations (PageRank, Eigenvector, Leiden, etc.)
```

The Zig and Python builds are independent. Pre-built wheels bundle the shared library as
package data. The `py3-none-{platform}` wheel tag means one wheel works across all Python
3.x versions on a given platform.

---

## Error Handling

Centrality methods raise `RuntimeError` with the error code on failure:

```python
try:
    scores = bridge.pagerank({}, {})  # empty graph
except RuntimeError as e:
    print(e)  # "Zig pagerank failed with code -1"
```

Leiden `local_moving` returns an integer status code directly. Check for `< 0`:

```python
result = bridge.local_moving(...)
if result < 0:
    print(f"Error code: {result}")
```

Leiden `modularity` returns `0.0` on any error — indistinguishable from a mathematically
valid zero-modularity score. Validate inputs before calling.

| Error Code | Meaning |
|---|---|
| `0` | Success |
| `-1` | Invalid input (empty graph) |
| `-2` | Memory allocation failure |
| `-3` | Invalid adjacency data (Leiden only) |
| `-4` | Invalid partition data (Leiden only) |

---

## Platform Support

| Platform | Python | Architectures |
|---|---|---|
| Linux | 3.10 – 3.13 | x86_64 |
| macOS | 3.10 – 3.13 | x86_64, arm64 (Apple Silicon) |
| Windows | 3.10 – 3.13 | x86_64 |

**CPython only**. PyPy and other Python implementations are not supported. Musl-based
Linux distributions (Alpine) require building from source.

---

## Dependencies

```
numpy >= 1.24
```

No transitive dependencies. No system libraries beyond libc (and libm on Linux).

---

## Documentation

Full documentation is available at the project repository, covering:

- Algorithm selection guides and mathematical definitions
- Graph format specifications (bitmap and CSR)
- Complete API reference with all parameters and return types
- Architecture deep dives (FFI design, memory model, build pipeline)
- Error handling strategies and debugging guidance

---

## Contributing

TribeCore requires Zig 0.13+ for development builds.

```bash
git clone https://github.com/Asky23/SocialTribe
cd SocialTribe/backend/tribecore

# Build Zig library
cd zig_core && zig build -Doptimize=ReleaseFast
cp zig-out/lib/libgraphcore.* ../src/tribecore/_libs/

# Install in editable mode
pip install -e .
```

Run Zig tests:

```bash
zig build test
```

Adding a new algorithm requires changes to three layers:
1. Zig implementation (`zig_core/src/ffi/`)
2. Export registration (`zig_core/src/main.zig`)
3. Python bridge (`src/tribecore/`)

---

## License

MIT — see the [LICENSE](https://github.com/Asky23/SocialTribe) file for details.
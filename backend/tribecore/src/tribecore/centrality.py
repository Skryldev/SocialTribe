import ctypes
import numpy as np
from typing import Dict, Set
from importlib.resources import files


_LIB_DIR = files("tribecore").joinpath("_libs")

def _get_lib_path() -> str:
    import sys
    if sys.platform == "win32":
        lib = _LIB_DIR / "graphcore.dll"
    elif sys.platform == "darwin":
        lib = _LIB_DIR / "libgraphcore.dylib"
    else:
        lib = _LIB_DIR / "libgraphcore.so"
    
    if not lib.exists():
        raise RuntimeError(
            f"Zig library not found at {lib}. "
            "Run: pip install -e ."
        )
    return str(lib)


class CentralityBridge:
    """High-Performance Centrality via Zig"""

    def __init__(self, lib_path: str | None = None):
        if lib_path is None:
            lib_path = _get_lib_path()
        
        self._lib = ctypes.CDLL(lib_path)
        self._setup_ffi()

    def _setup_ffi(self):
        # PageRank
        self._lib.pagerank.argtypes = [
            ctypes.POINTER(ctypes.c_uint8),
            ctypes.c_size_t,
            ctypes.c_double,
            ctypes.c_uint32,
            ctypes.c_double,
            ctypes.POINTER(ctypes.c_double),
        ]
        self._lib.pagerank.restype = ctypes.c_int
        
        # Eigenvector
        self._lib.eigenvector_centrality.argtypes = [
            ctypes.POINTER(ctypes.c_uint8),
            ctypes.c_size_t,
            ctypes.c_uint32,
            ctypes.c_double,
            ctypes.POINTER(ctypes.c_double),
        ]
        self._lib.eigenvector_centrality.restype = ctypes.c_int
        
        # Closeness
        self._lib.closeness_centrality.argtypes = [
            ctypes.POINTER(ctypes.c_uint8),
            ctypes.c_size_t,
            ctypes.POINTER(ctypes.c_double),
        ]
        self._lib.closeness_centrality.restype = ctypes.c_int
        
        # Harmonic
        self._lib.harmonic_centrality.argtypes = [
            ctypes.POINTER(ctypes.c_uint8),
            ctypes.c_size_t,
            ctypes.POINTER(ctypes.c_double),
        ]
        self._lib.harmonic_centrality.restype = ctypes.c_int

    @staticmethod
    def build_bitmap_adjacency(
        node_to_idx: Dict[str, int],
        neighbor_map: Dict[str, Set[str]],
        n: int
    ) -> np.ndarray:
        total_bits = n * n
        total_bytes = (total_bits + 7) // 8
        bitmap = np.zeros(total_bytes, dtype=np.uint8)
        
        for node, neighbors in neighbor_map.items():
            if node not in node_to_idx:
                continue
            i = node_to_idx[node]
            row_offset = i * n
            
            for neighbor in neighbors:
                if neighbor not in node_to_idx:
                    continue
                j = node_to_idx[neighbor]
                bit_pos = row_offset + j
                byte_idx = bit_pos >> 3
                bit_idx = bit_pos & 7
                bitmap[byte_idx] |= (1 << bit_idx)
        
        return bitmap

    def pagerank(self, node_to_idx, neighbor_map, damping=0.85, max_iter=100, tolerance=1e-8):
        n = len(node_to_idx)
        scores = np.zeros(n, dtype=np.float64)
        bitmap = self.build_bitmap_adjacency(node_to_idx, neighbor_map, n)
        
        ret = self._lib.pagerank(
            bitmap.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8)),
            n,
            ctypes.c_double(damping),
            ctypes.c_uint32(max_iter),
            ctypes.c_double(tolerance),
            scores.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
        )
        
        if ret != 0:
            raise RuntimeError(f"Zig pagerank failed with code {ret}")
        
        return scores

    def eigenvector(self, node_to_idx, neighbor_map, max_iter=100, tolerance=1e-6):
        n = len(node_to_idx)
        scores = np.zeros(n, dtype=np.float64)
        bitmap = self.build_bitmap_adjacency(node_to_idx, neighbor_map, n)
        
        ret = self._lib.eigenvector_centrality(
            bitmap.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8)),
            n,
            ctypes.c_uint32(max_iter),
            ctypes.c_double(tolerance),
            scores.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
        )
        
        if ret != 0:
            raise RuntimeError(f"Zig eigenvector failed with code {ret}")
        
        return scores

    def closeness(self, node_to_idx, neighbor_map):
        n = len(node_to_idx)
        scores = np.zeros(n, dtype=np.float64)
        bitmap = self.build_bitmap_adjacency(node_to_idx, neighbor_map, n)
        
        ret = self._lib.closeness_centrality(
            bitmap.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8)),
            n,
            scores.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
        )
        
        if ret != 0:
            raise RuntimeError(f"Zig closeness failed with code {ret}")
        
        return scores

    def harmonic(self, node_to_idx, neighbor_map):
        n = len(node_to_idx)
        scores = np.zeros(n, dtype=np.float64)
        bitmap = self.build_bitmap_adjacency(node_to_idx, neighbor_map, n)
        
        ret = self._lib.harmonic_centrality(
            bitmap.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8)),
            n,
            scores.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
        )
        
        if ret != 0:
            raise RuntimeError(f"Zig harmonic failed with code {ret}")
        
        return scores
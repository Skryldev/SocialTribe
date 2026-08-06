import ctypes
import numpy as np
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
        raise RuntimeError(f"Zig library not found at {lib}")
    return str(lib)


class LeidenBridge:
    """High-Performance Leiden Community Detection via Zig"""

    def __init__(self, lib_path: str | None = None):
        if lib_path is None:
            lib_path = _get_lib_path()

        self._lib = ctypes.CDLL(lib_path)
        self._setup_ffi()

    def _setup_ffi(self):
        # ─── leiden_local_moving ───
        self._lib.leiden_local_moving.argtypes = [
            ctypes.POINTER(ctypes.c_int32),  # adjacency_flat
            ctypes.c_uint64,                  # adjacency_flat_len
            ctypes.POINTER(ctypes.c_int32),  # adjacency_offsets
            ctypes.POINTER(ctypes.c_int32),  # adjacency_lengths
            ctypes.c_uint64,                  # node_count
            ctypes.c_double,                  # total_weight
            ctypes.c_double,                  # resolution
            ctypes.POINTER(ctypes.c_int32),  # node_to_community
            ctypes.POINTER(ctypes.c_int32),  # communities_flat
            ctypes.c_uint64,                  # communities_flat_len
            ctypes.POINTER(ctypes.c_int32),  # community_lengths
            ctypes.c_uint64,                  # community_count
            ctypes.POINTER(ctypes.c_int32),  # permutation_order
        ]
        self._lib.leiden_local_moving.restype = ctypes.c_int32

        # ─── leiden_modularity ───
        self._lib.leiden_modularity.argtypes = [
            ctypes.POINTER(ctypes.c_int32),  # adjacency_flat
            ctypes.c_uint64,                  # adjacency_flat_len
            ctypes.POINTER(ctypes.c_int32),  # adjacency_offsets
            ctypes.POINTER(ctypes.c_int32),  # adjacency_lengths
            ctypes.c_uint64,                  # node_count
            ctypes.c_double,                  # total_weight
            ctypes.c_double,                  # resolution
            ctypes.POINTER(ctypes.c_int32),  # node_to_community
            ctypes.POINTER(ctypes.c_int32),  # communities_flat
            ctypes.c_uint64,                  # communities_flat_len
            ctypes.POINTER(ctypes.c_int32),  # community_lengths
            ctypes.c_uint64,                  # community_count
        ]
        self._lib.leiden_modularity.restype = ctypes.c_double

    def local_moving(
        self,
        adjacency_flat: np.ndarray,
        adjacency_offsets: np.ndarray,
        adjacency_lengths: np.ndarray,
        node_count: int,
        total_weight: float,
        resolution: float,
        node_to_community: np.ndarray,
        communities_flat: np.ndarray,
        community_lengths: np.ndarray,
        permutation_order: np.ndarray,
    ) -> int:
        community_count = len(community_lengths)

        return self._lib.leiden_local_moving(
            adjacency_flat.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            ctypes.c_uint64(len(adjacency_flat)),
            adjacency_offsets.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            adjacency_lengths.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            ctypes.c_uint64(node_count),
            ctypes.c_double(total_weight),
            ctypes.c_double(resolution),
            node_to_community.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            communities_flat.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            ctypes.c_uint64(len(communities_flat)),
            community_lengths.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            ctypes.c_uint64(community_count),
            permutation_order.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
        )

    def modularity(
        self,
        adjacency_flat: np.ndarray,adjacency_offsets: np.ndarray,
        adjacency_lengths: np.ndarray,
        node_count: int,
        total_weight: float,
        resolution: float,
        node_to_community: np.ndarray,
        communities_flat: np.ndarray,
        community_lengths: np.ndarray,
    ) -> float:
        community_count = len(community_lengths)

        return self._lib.leiden_modularity(
            adjacency_flat.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            ctypes.c_uint64(len(adjacency_flat)),
            adjacency_offsets.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            adjacency_lengths.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            ctypes.c_uint64(node_count),
            ctypes.c_double(total_weight),
            ctypes.c_double(resolution),
            node_to_community.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            communities_flat.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            ctypes.c_uint64(len(communities_flat)),
            community_lengths.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            ctypes.c_uint64(community_count),
        )
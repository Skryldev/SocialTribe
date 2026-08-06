const centrality = @import("ffi/centrality.zig");
const leiden = @import("ffi/leiden.zig");

pub const pagerank = centrality.pagerank;
pub const eigenvector_centrality = centrality.eigenvector_centrality;
pub const closeness_centrality = centrality.closeness_centrality;
pub const harmonic_centrality = centrality.harmonic_centrality;

pub const leiden_local_moving = leiden.leiden_local_moving;
pub const leiden_modularity = leiden.leiden_modularity;

comptime {
    _ = pagerank;
    _ = eigenvector_centrality;
    _ = closeness_centrality;
    _ = harmonic_centrality;
    _ = leiden_local_moving;
    _ = leiden_modularity;
}
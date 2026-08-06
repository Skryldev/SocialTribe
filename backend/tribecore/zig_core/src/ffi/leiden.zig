const std = @import("std");

const ERR_INVALID_NODE_COUNT = -1;
const ERR_ALLOC_FAILED = -2;
const ERR_INVALID_ADJACENCY = -3;
const ERR_INVALID_PARTITION = -4;

fn modularityGain(k_i_in: i32, sigma_tot: i32, k_i: i32, m: f64, resolution: f64) f64 {
    if (m == 0.0) return 0.0;
    const m2 = 2.0 * m;
    return @as(f64, @floatFromInt(k_i_in)) -
        resolution * (@as(f64, @floatFromInt(sigma_tot)) * @as(f64, @floatFromInt(k_i))) / m2;
}

fn communityVolume(lengths: []const i32, members: []const i32) i32 {
    var volume: i32 = 0;
    for (members) |node| volume += lengths[@intCast(node)];
    return volume;
}

fn buildCommunityWeights(
    adjacency_flat: []const i32, offsets: []const i32, lengths: []const i32,
    node: usize, node_to_community: []const i32, weights: []i32, communities_seen: []i32,
) usize {
    const start: usize = @intCast(offsets[node]);
    const end: usize = start + @as(usize, @intCast(lengths[node]));
    var count: usize = 0;
    @memset(weights, 0);
    for (start..end) |edge_idx| {
        const neighbor: usize = @intCast(adjacency_flat[edge_idx]);
        const community = node_to_community[neighbor];
        const index: usize = @intCast(community);
        if (weights[index] == 0) { communities_seen[count] = community; count += 1; }
        weights[index] += 1;
    }
    return count;
}

fn findBestMove(
    adjacency_flat: []const i32, offsets: []const i32, lengths: []const i32,
    node: usize, node_to_community: []const i32, community_volumes: []const i32,
    m: f64, resolution: f64, weights_buffer: []i32, communities_seen: []i32,
) struct { best_community: i32, best_delta: f64 } {
    const current = node_to_community[node];
    const degree = lengths[node];
    const count = buildCommunityWeights(adjacency_flat, offsets, lengths, node, node_to_community, weights_buffer, communities_seen);
    const current_volume = community_volumes[@intCast(current)] - degree;
    const current_gain = modularityGain(weights_buffer[@intCast(current)], current_volume, degree, m, resolution);
    var best = current;
    var best_delta: f64 = 0.0;
    for (0..count) |i| {
        const community = communities_seen[i];
        if (community == current) continue;
        const index: usize = @intCast(community);
        const gain = modularityGain(weights_buffer[index], community_volumes[index], degree, m, resolution);
        const delta = gain - current_gain;
        if (delta > best_delta) { best_delta = delta; best = community; }
    }
    return .{ .best_community = best, .best_delta = best_delta };
}

fn validateAdjacency(offsets: []const i32, lengths: []const i32, adjacency_flat_len: usize, n: usize) bool {
    if (offsets.len != n or lengths.len != n) return false;
    for (0..n) |i| {
        const start: usize = @intCast(offsets[i]);
        const len: usize = @intCast(lengths[i]);
        if (start + len > adjacency_flat_len) return false;
    }
    return true;
}

fn validatePartition(node_to_community: []const i32, community_count: usize, n: usize) bool {
    if (node_to_community.len != n) return false;
    for (node_to_community) |comm| {
        if (comm < 0 or comm >= @as(i32, @intCast(community_count))) return false;
    }
    return true;
}

fn validateCommunities(community_lengths: []const i32, community_count: usize, communities_flat_len: usize, n: usize) bool {
    if (community_lengths.len < community_count or communities_flat_len < n) return false;
    var total: usize = 0;
    for (0..community_count) |i| {
        const len: usize = @intCast(community_lengths[i]);
        total += len;
        if (total > communities_flat_len) return false;
    }
    return total == n;
}

fn rebuildPartitionOutput(
    node_to_community: []const i32, n: usize,
    communities_flat: []i32, communities_flat_len: usize,
    community_lengths: []i32, community_count: usize,
) bool {
    if (communities_flat_len < n or community_count == 0) return false;
    @memset(community_lengths[0..community_count], 0);
    for (node_to_community) |comm| {
        const idx: usize = @intCast(comm);
        if(idx >= community_count) return false;
        community_lengths[idx] += 1;
    }
    var running_offset: i32 = 0;
    for (0..community_count) |i| {
        const count = community_lengths[i];
        community_lengths[i] = running_offset;
        running_offset += count;
    }
    if (running_offset != @as(i32, @intCast(n))) return false;
    for (0..n) |node| {
        const comm: usize = @intCast(node_to_community[node]);
        const pos: usize = @intCast(community_lengths[comm]);
        if (pos >= communities_flat_len) return false;
        communities_flat[pos] = @intCast(node);
        community_lengths[comm] += 1;
    }
    var prev_end: i32 = 0;
    for (0..community_count - 1) |i| {
        const current_end = community_lengths[i];
        community_lengths[i] = current_end - prev_end;
        prev_end = current_end;
    }
    community_lengths[community_count - 1] = @as(i32, @intCast(n)) - prev_end;
    return true;
}

pub export fn leiden_local_moving(
    adjacency_flat: [*c]i32, adjacency_flat_len: u64,
    adjacency_offsets: [*c]i32, adjacency_lengths: [*c]i32,
    node_count: u64, total_weight: f64, resolution: f64,
    node_to_community: [*c]i32,
    communities_flat: [*c]i32, communities_flat_len: u64,
    community_lengths: [*c]i32, community_count: u64,
    permutation_order: [*c]i32,
) callconv(.c) i32 {
    if (node_count == 0) return ERR_INVALID_NODE_COUNT;
    if (total_weight <= 0.0) return ERR_INVALID_ADJACENCY;
    if (resolution < 0.0) return ERR_INVALID_PARTITION;

    const n: usize = @intCast(node_count);
    const comm_count: usize = @intCast(community_count);
    const flat_len: usize = @intCast(communities_flat_len);
    const offsets = adjacency_offsets[0..n];
    const lengths = adjacency_lengths[0..n];

    if (!validateAdjacency(offsets, lengths, @intCast(adjacency_flat_len), n)) return ERR_INVALID_ADJACENCY;

    const edge_count: usize = @as(usize, @intCast(offsets[n - 1])) + @as(usize, @intCast(lengths[n - 1]));
    if (edge_count > @as(usize, @intCast(adjacency_flat_len))) return ERR_INVALID_ADJACENCY;

    const adjacency = adjacency_flat[0..edge_count];
    const communities = node_to_community[0..n];
    const order = permutation_order[0..n];
    if (!validatePartition(communities, comm_count, n)) return ERR_INVALID_PARTITION;

    const allocator = std.heap.c_allocator;
    const weights = allocator.alloc(i32, n) catch return ERR_ALLOC_FAILED;
    defer allocator.free(weights);
    const seen = allocator.alloc(i32, n) catch return ERR_ALLOC_FAILED;
    defer allocator.free(seen);
    const volumes = allocator.alloc(i32, n) catch return ERR_ALLOC_FAILED;
    defer allocator.free(volumes);
    @memset(volumes, 0);
    for (0..n) |i| { const comm: usize = @intCast(communities[i]); volumes[comm] += lengths[i]; }

    var improved = false;
    for (order) |raw_node| {
        const node: usize = @intCast(raw_node);
        const result = findBestMove(adjacency, offsets, lengths, node, communities, volumes, total_weight, resolution, weights, seen);
        if (result.best_delta > 0 and result.best_community != communities[node]) {
            const old = communities[node];
            communities[node] = result.best_community;
            volumes[@intCast(old)] -= lengths[node];
            volumes[@intCast(result.best_community)] += lengths[node];
            improved = true;
        }
    }

    if (improved) {
        const comm_flat = communities_flat[0..flat_len];
        const comm_lens = community_lengths[0..comm_count];
        if (!rebuildPartitionOutput(communities, n, comm_flat, flat_len, comm_lens, comm_count)) return ERR_INVALID_PARTITION;
    }
    return if (improved) 0 else 1;
}

pub export fn leiden_modularity(
    adjacency_flat: [*c]i32, adjacency_flat_len: u64,
    adjacency_offsets: [*c]i32, adjacency_lengths: [*c]i32,
    node_count: u64, total_weight: f64, resolution: f64,
    node_to_community: [*c]i32,
    communities_flat: [*c]i32, communities_flat_len: u64,
    community_lengths: [*c]i32, community_count: u64,
) callconv(.c) f64 {
    if (node_count == 0 or total_weight <= 0.0) return 0.0;
    if (resolution < 0.0) return 0.0;

    const n: usize = @intCast(node_count);
    const comm_count: usize = @intCast(community_count);
    const flat_len: usize = @intCast(communities_flat_len);
    const offsets = adjacency_offsets[0..n];
    const lengths = adjacency_lengths[0..n];
    if (!validateAdjacency(offsets, lengths, @intCast(adjacency_flat_len), n)) return 0.0;

    const edge_count: usize = @as(usize, @intCast(offsets[n - 1])) + @as(usize, @intCast(lengths[n - 1]));
    if (edge_count > @as(usize, @intCast(adjacency_flat_len))) return 0.0;

    const adjacency = adjacency_flat[0..edge_count];
    const communities = node_to_community[0..n];
    const comm_lengths = community_lengths[0..comm_count];
    if (!validateCommunities(comm_lengths, comm_count, flat_len, n)) return 0.0;
    if (!validatePartition(communities, comm_count, n)) return 0.0;

    const m = total_weight;
    const m2 = 2.0 * m;
    var q: f64 = 0.0;
    var offset: usize = 0;

    for (0..comm_count) |comm_id| {
        const size: usize = @intCast(comm_lengths[comm_id]);
        if (size == 0) continue;
        if (offset + size > flat_len) return 0.0;
        const community = communities_flat[offset..offset + size];
        offset += size;

        var internal_edges: i32 = 0;
        var degree_sum: i32 = 0;
        for (community) |node_raw| {
            const node: usize = @intCast(node_raw);
            degree_sum += lengths[node];
            const start: usize = @intCast(offsets[node]);
            const end = start + @as(usize, @intCast(lengths[node]));
            for (start..end) |edge_idx| {
                const neighbor = adjacency[edge_idx];
                for (community) |member| {
                    if (member == neighbor) { internal_edges += 1; break; }
                }
            }
        }
        internal_edges = @divTrunc(internal_edges, 2);
        const degree_fraction = @as(f64, @floatFromInt(degree_sum)) / m2;
        q += @as(f64, @floatFromInt(internal_edges)) / m - resolution * degree_fraction * degree_fraction;
    }
    return q;
}
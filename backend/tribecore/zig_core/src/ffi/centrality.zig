const std = @import("std");

pub const FfiScores = extern struct {
    scores: [*c]f64,
    len: u64,
    error_code: i32,
};

fn hasEdge(adjacency: []const u8, n: usize, row: usize, col: usize) bool {
    const pos = row * n + col;
    const byte_idx = pos >> 3;
    const bit_idx: u3 = @intCast(pos & 7);
    if (byte_idx >= adjacency.len) return false;
    return ((adjacency[byte_idx] >> bit_idx) & 1) == 1;
}

fn bitmapLength(n: usize) usize {
    return (n * n + 7) / 8;
}

fn outDegree(adjacency: []const u8, n: usize, node: usize) usize {
    var degree: usize = 0;
    for (0..n) |i| {
        if (hasEdge(adjacency, n, node, i)) {
            degree += 1;
        }
    }
    return degree;
}

fn normalizeScores(scores: [*c]f64, n: usize) void {
    var max_value: f64 = 0.0;
    for (scores[0..n]) |value| {
        max_value = @max(max_value, value);
    }
    if (max_value > 0) {
        for (scores[0..n]) |*value| {
            value.* /= max_value;
        }
    }
}

// ─── PageRank ───
pub export fn pagerank(
    adjacency: [*c]const u8,
    node_count: u64,
    damping: f64,
    max_iter: u32,
    tolerance: f64,
    out_scores: [*c]f64,
) callconv(.c) i32 {
    if (node_count == 0) return -1;

    const n: usize = @intCast(node_count);
    const scores = out_scores[0..n];
    const blen = bitmapLength(n);
    const adj = adjacency[0..blen];

    @memset(scores, 1.0 / @as(f64, @floatFromInt(n)));

    const allocator = std.heap.c_allocator;
    const temp = allocator.alloc(f64, n) catch return -2;
    defer allocator.free(temp);

    var iter: u32 = 0;
    while (iter < max_iter) : (iter += 1) {
        const base = (1.0 - damping) / @as(f64, @floatFromInt(n));
        @memset(temp, base);

        for (0..n) |i| {
            var rank_sum: f64 = 0.0;
            for (0..n) |j| {
                if (hasEdge(adj, n, j, i)) {
                    const degree = outDegree(adj, n, j);
                    if (degree > 0) {
                        rank_sum += scores[j] / @as(f64, @floatFromInt(degree));
                    }
                }
            }
            temp[i] += damping * rank_sum;
        }

        var diff: f64 = 0.0;
        for (0..n) |i| {
            diff += @abs(temp[i] - scores[i]);
        }
        @memcpy(scores, temp);
        if (diff < tolerance) break;
    }

    return 0;
}

// ─── Eigenvector Centrality ───
pub export fn eigenvector_centrality(
    adjacency: [*c]const u8,
    node_count: u64,
    max_iter: u32,
    tolerance: f64,
    out_scores: [*c]f64,
) callconv(.c) i32 {
    if (node_count == 0) return -1;

    const n: usize = @intCast(node_count);
    const scores = out_scores[0..n];
    const blen = bitmapLength(n);
    const adj = adjacency[0..blen];

    @memset(scores, 1.0);

    const allocator = std.heap.c_allocator;
    const next_scores = allocator.alloc(f64, n) catch return -2;
    defer allocator.free(next_scores);

    for (0..max_iter) |_| {
        @memset(next_scores, 0.0);

        for (0..n) |i| {
            for (0..n) |j| {
                if (hasEdge(adj, n, j, i)) {
                    next_scores[i] += scores[j];
                }
            }
        }

        var norm: f64 = 0.0;
        for (next_scores) |value| {
            norm += value * value;
        }
        norm = @sqrt(norm);

        if (norm > 0) {
            for (next_scores) |*value| {
                value.* /= norm;
            }
        }

        var diff: f64 = 0.0;
        for (next_scores, scores) |new_value, old_value| {
            diff = @max(diff, @abs(new_value - old_value));
        }
        @memcpy(scores, next_scores);
        if (diff < tolerance) break;
    }

    return 0;
}

// ─── Closeness Centrality ───
pub export fn closeness_centrality(
    adjacency: [*c]const u8,
    node_count: u64,
    out_scores: [*c]f64,
) callconv(.c) i32 {
    if (node_count <= 1) {
        if (node_count == 1) out_scores[0] = 0.0;
        return 0;
    }

    const n: usize = @intCast(node_count);
    const blen = bitmapLength(n);
    const adj = adjacency[0..blen];
    const allocator = std.heap.c_allocator;

    const queue = allocator.alloc(usize, n) catch return -2;
    defer allocator.free(queue);

    const visited = allocator.alloc(bool, n) catch return -2;
    defer allocator.free(visited);

    const distance = allocator.alloc(i32, n) catch return -2;
    defer allocator.free(distance);

    for (0..n) |source| {
        @memset(visited, false);
        @memset(distance, -1);

        var head: usize = 0;
        var tail: usize = 0;
        queue[tail] = source;
        tail += 1;
        visited[source] = true;
        distance[source] = 0;

        var total_distance: i64 = 0;
        var reachable: i64 = 0;

        while (head < tail) {
            const current = queue[head];
            head += 1;

            if (current != source) {
                total_distance += distance[current];
                reachable += 1;
            }

            for (0..n) |neighbor| {
                if (hasEdge(adj, n, current, neighbor) and !visited[neighbor]) {
                    visited[neighbor] = true;
                    distance[neighbor] = distance[current] + 1;
                    queue[tail] = neighbor;
                    tail += 1;
                }
            }
        }

        if (reachable > 0 and total_distance > 0) {
            out_scores[source] = @as(f64, @floatFromInt(reachable)) / @as(f64, @floatFromInt(total_distance));
        } else {
            out_scores[source] = 0.0;
        }
    }

    normalizeScores(out_scores, n);
    return 0;
}

// ─── Harmonic Centrality ───
pub export fn harmonic_centrality(
    adjacency: [*c]const u8,
    node_count: u64,
    out_scores: [*c]f64,
) callconv(.c) i32 {
    if (node_count == 0) return -1;

    const n: usize = @intCast(node_count);
    const blen = bitmapLength(n);
    const adj = adjacency[0..blen];
    const allocator = std.heap.c_allocator;

    const queue = allocator.alloc(usize, n) catch return -2;
    defer allocator.free(queue);

    const visited = allocator.alloc(bool, n) catch return -2;
    defer allocator.free(visited);

    const distance = allocator.alloc(i32, n) catch return -2;
    defer allocator.free(distance);

    for (0..n) |source| {
        @memset(visited, false);
        @memset(distance, -1);

        var head: usize = 0;
        var tail: usize = 0;
        queue[tail] = source;
        tail += 1;
        visited[source] = true;
        distance[source] = 0;

        var total: f64 = 0.0;

        while (head < tail) {
            const current = queue[head];
            head += 1;

            if (current != source and distance[current] > 0) {
                total += 1.0 / @as(f64, @floatFromInt(distance[current]));
            }

            for (0..n) |neighbor| {
                if (hasEdge(adj, n, current, neighbor) and !visited[neighbor]) {
                    visited[neighbor] = true;
                    distance[neighbor] = distance[current] + 1;
                    queue[tail] = neighbor;
                    tail += 1;
                }
            }
        }

        out_scores[source] = total;
    }

    normalizeScores(out_scores, n);
    return 0;
}
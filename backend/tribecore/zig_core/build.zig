const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});

    const optimize = b.standardOptimizeOption(.{
        .preferred_optimize_mode = .ReleaseFast,
    });

    const root_module = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
        .link_libc = true,
    });

    if (target.result.os.tag == .linux) {
        root_module.linkSystemLibrary("m", .{});
    }

    const lib = b.addLibrary(.{
        .name = "graphcore",
        .linkage = .dynamic,
        .root_module = root_module,
    });

    b.installArtifact(lib);

    const tests = b.addTest(.{
        .root_module = root_module,
    });

    const run_tests = b.addRunArtifact(tests);

    const test_step = b.step("test", "Run tests");
    test_step.dependOn(&run_tests.step);
}
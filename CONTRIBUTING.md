# Contributing

Thank you for your interest in contributing. This project is a modern, high-performance embedded graph database focused on clean architecture, maintainability, performance, and developer experience. Every contribution matters.

## Before You Start

- Read the project documentation
- Search existing issues and pull requests
- Ensure alignment with architecture and design goals
- Open a discussion or issue for large changes before implementation

## Ways to Contribute

- Bug fixes
- Performance improvements
- Documentation
- Graph algorithms
- Query engine enhancements
- Storage engine improvements
- Testing and benchmarking
- Developer tooling
- CI/CD improvements
- Cross-platform compatibility

## Development Principles

- Prefer readability over clever code
- Keep modules small and maintainable
- Avoid unnecessary abstractions
- Optimize only after measurement
- Write review-friendly code
- Follow existing architecture
- Keep public APIs stable when possible

## Project Architecture

The project consists of independent components:

- Graph Storage Engine
- Query Engine
- Desktop Application
- Documentation
- Deployment
- DevOps

Keep responsibilities separated. Avoid tight coupling between modules.

## Coding Standards

- Write clean, self-explanatory code
- Avoid duplicated logic
- Prefer composition over inheritance
- Handle errors explicitly
- Remove unused code before submission
- Keep functions focused on a single responsibility

## Performance

Performance is a core goal. When introducing changes:

- Avoid unnecessary allocations
- Avoid unnecessary copying
- Consider cache locality
- Benchmark performance-critical paths
- Do not sacrifice correctness for premature optimization

## Testing

Before submitting a pull request:

- Ensure the project builds successfully
- Confirm existing tests pass
- Include tests for new functionality
- Verify no obvious performance regressions

## Documentation

Update documentation when changing behavior or introducing new functionality. Documentation is part of the implementation.

## Pull Request Guidelines

Each pull request must:

- Have a clear, descriptive title
- Explain the motivation
- Describe the implementation
- Mention breaking changes
- Reference related issues

Keep pull requests focused on a single logical change. Large, unrelated changes are difficult to review and may be rejected.

## Commit Messages

Use clear, descriptive messages following conventional commits:

```
feat(query): add ORDER BY support
fix(storage): prevent mmap corruption on shutdown
perf(index): optimize hash lookup
docs: improve storage architecture documentation
refactor(cache): simplify ARC cache implementation
test(query): add parser regression tests
```

## Branch Naming

```
feature/query-order-by
feature/new-algorithm
bugfix/wal-recovery
docs/update-storage-guide
refactor/query-parser
performance/hash-index
```

## Reporting Bugs

Include:

- Operating system
- Project version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Error messages and logs (if available)

A minimal reproducible example is highly appreciated.

## Feature Requests

Feature requests should explain:

- The problem being solved
- Why the feature is useful
- Possible implementation ideas (optional)
- Expected impact on users

## Code Review

All contributions are reviewed before merging. Reviews focus on:

- Correctness
- Maintainability
- Performance
- Readability
- Architectural consistency
- Documentation quality

Requested changes are a normal part of the process.

## License

By submitting a contribution, you agree that your work will be licensed under the project's MIT License.

## Thank You

Every contribution—large or small—helps make the project more reliable, maintainable, and useful for the community.
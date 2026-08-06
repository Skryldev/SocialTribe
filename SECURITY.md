# Security Policy

## Supported Versions

| Version | Supported | Latest Release |
|---------|-----------|----------------|
| Latest  | ✅        | ✅             |
| Main    | ✅        | Development    |
| < 1.0   | ❌        | End of Life    |

## Reporting a Vulnerability

**Do not open a public issue.** Report vulnerabilities privately to the project maintainer.

A high-quality report includes:

- Clear description of the vulnerability
- Reproduction steps
- Affected platform(s) and environment details
- Project version or commit hash
- Proof-of-concept (if available)
- Suggested mitigation or fix

Reports with thorough technical analysis receive priority.

## Response Process

1. Acknowledge receipt
2. Validate and reproduce
3. Assess impact and severity
4. Develop and test a fix
5. Release a patched version
6. Public disclosure after fix availability

## Security Scope

Areas considered security-sensitive:

- Binary storage format
- Memory-mapped file access (`mmap`)
- Write-Ahead Logging (WAL)
- Query engine
- Graph storage layer
- File parsing and serialization
- Import/export functionality
- Desktop application packaging
- Sidecar process management

## Out of Scope

- Performance issues
- Feature requests
- Unsupported operating systems
- Build failures from unsupported toolchains
- Third-party dependency bugs outside project control
- Documentation mistakes or typographical errors

## Dependency Management

Dependencies are kept current, and security advisories for third-party libraries are reviewed regularly. Always use the latest stable release.

## Responsible Disclosure

Allow reasonable time for investigation and remediation before public disclosure. Coordinated disclosure protects all users.

## Acknowledgements

We thank researchers and contributors who responsibly report security issues and help improve the safety and reliability of this project.
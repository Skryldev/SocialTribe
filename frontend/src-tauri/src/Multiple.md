# Add Microservice:

```rust
let backends = vec![
    BackendConfig {
        name: "python".to_string(),
        exe: "my-python-backend".to_string(),
        args: vec!["--port".to_string(), "8000".to_string()],
        health_check_url: Some("http://localhost:8000/health".to_str()),
        shutdown_url: Some("http://localhost:8000/shutdown".to_str()),
    },
];
```
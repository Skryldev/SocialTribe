use wasm::*;

// ============================================================================
// CompilationResult Tests
// ============================================================================

#[test]
fn test_compilation_result_default() {
    let result = CompilationResult {
        success: true,
        tokens: None,
        ast: None,
        diagnostics: vec![],
        logical_plan: None,
        optimized_plan: None,
        physical_plan: None,
        explain_data: None,
        errors: vec![],
        warnings: vec![],
    };
    
    assert!(result.success);
    assert!(result.errors.is_empty());
}

#[test]
fn test_compilation_result_with_errors() {
    let result = CompilationResult {
        success: false,
        tokens: None,
        ast: None,
        diagnostics: vec![],
        logical_plan: None,
        optimized_plan: None,
        physical_plan: None,
        explain_data: None,
        errors: vec!["Error 1".to_string(), "Error 2".to_string()],
        warnings: vec![],
    };
    
    assert!(!result.success);
    assert_eq!(result.errors.len(), 2);
}

// ============================================================================
// TokenInfo Tests
// ============================================================================

#[test]
fn test_token_info_creation() {
    let token = TokenInfo {
        token_type: "Match".to_string(),
        lexeme: "MATCH".to_string(),
        line: 1,
        column: 1,
    };
    
    assert_eq!(token.token_type, "Match");
    assert_eq!(token.lexeme, "MATCH");
    assert_eq!(token.line, 1);
    assert_eq!(token.column, 1);
}

// ============================================================================
// DiagnosticInfo Tests
// ============================================================================

#[test]
fn test_diagnostic_info_creation() {
    let diag = DiagnosticInfo {
        severity: "Error".to_string(),
        code: "E001".to_string(),
        message: "Test error".to_string(),
        line: 1,
        column: 5,
        suggestion: Some("Fix this".to_string()),
    };
    
    assert_eq!(diag.severity, "Error");
    assert_eq!(diag.code, "E001");
    assert_eq!(diag.suggestion, Some("Fix this".to_string()));
}

// ============================================================================
// OptimizationStepInfo Tests
// ============================================================================

#[test]
fn test_optimization_step_info_creation() {
    let step = OptimizationStepInfo {
        rule_name: "constant_folding".to_string(),
        description: "Folds constants".to_string(),
        before: "".to_string(),
        after: "".to_string(),
    };
    
    assert_eq!(step.rule_name, "constant_folding");
    assert!(!step.description.is_empty());
}

// ============================================================================
// ExplainData Tests
// ============================================================================

#[test]
fn test_explain_data_creation() {
    let explain = ExplainData {
        original_query: "MATCH (n) RETURN n".to_string(),
        token_list: vec![],
        ast_representation: "Query { ... }".to_string(),
        semantic_diagnostics: vec![],
        logical_plan: "NodeScan".to_string(),
        optimization_steps: vec![],
        optimized_logical_plan: "NodeScan".to_string(),
        physical_plan: "TableScan".to_string(),
        estimated_cost: 10.0,
        estimated_rows: 1000,
    };
    
    assert_eq!(explain.estimated_cost, 10.0);
    assert_eq!(explain.estimated_rows, 1000);
}

// ============================================================================
// Serialization Tests
// ============================================================================

#[test]
fn test_compilation_result_serialization() {
    let result = CompilationResult {
        success: true,
        tokens: Some(vec![TokenInfo {
            token_type: "Match".to_string(),
            lexeme: "MATCH".to_string(),
            line: 1,
            column: 1,
        }]),
        ast: Some("{}".to_string()),
        diagnostics: vec![],
        logical_plan: None,
        optimized_plan: None,
        physical_plan: None,
        explain_data: None,
        errors: vec![],
        warnings: vec![],
    };
    
    let json = serde_json::to_string(&result).unwrap();
    assert!(json.contains("success"));
    assert!(json.contains("Match"));
}

#[test]
fn test_compilation_result_deserialization() {
    let json = r#"{"success":true,"tokens":null,"ast":null,"diagnostics":[],"logical_plan":null,"optimized_plan":null,"physical_plan":null,"explain_data":null,"errors":[],"warnings":[]}"#;
    let result: CompilationResult = serde_json::from_str(json).unwrap();
    
    assert!(result.success);
    assert!(result.tokens.is_none());
}

#[test]
fn test_explain_data_serialization() {
    let explain = ExplainData {
        original_query: "RETURN 1".to_string(),
        token_list: vec![],
        ast_representation: "".to_string(),
        semantic_diagnostics: vec![],
        logical_plan: "".to_string(),
        optimization_steps: vec![],
        optimized_logical_plan: "".to_string(),
        physical_plan: "".to_string(),
        estimated_cost: 5.0,
        estimated_rows: 1,
    };
    
    let json = serde_json::to_string(&explain).unwrap();
    assert!(json.contains("RETURN 1"));
    assert!(json.contains("5.0"));
}

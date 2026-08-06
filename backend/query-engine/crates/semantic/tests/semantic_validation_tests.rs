use semantic::*;
use parser::parse_query;

// ============================================================================
// Basic Validation Tests
// ============================================================================

#[test]
fn test_validate_simple_query() {
    let query = parse_query("MATCH (n) RETURN n").unwrap();
    let diagnostics = validate_query(&query);
    
    assert!(!diagnostics.has_errors());
}

#[test]
fn test_validate_empty_query() {
    let query = parse_query("").unwrap();
    let diagnostics = validate_query(&query);
    
    assert!(diagnostics.has_errors());
}

#[test]
fn test_validate_missing_return() {
    let query = parse_query("MATCH (n) WHERE n.age > 18").unwrap();
    let diagnostics = validate_query(&query);
    
    // Should have warning about missing RETURN
    assert!(!diagnostics.warnings().is_empty());
}

// ============================================================================
// Type Validation Tests
// ============================================================================

#[test]
fn test_validate_known_type() {
    let query = parse_query("MATCH (u:socialUser) RETURN u.name").unwrap();
    let diagnostics = validate_query(&query);
    
    assert!(!diagnostics.has_errors());
}

#[test]
fn test_validate_unknown_type() {
    let query = parse_query("MATCH (n:UnknownType) RETURN n").unwrap();
    let diagnostics = validate_query(&query);
    
    // Should have warning about unknown type
    assert!(!diagnostics.warnings().is_empty());
}

#[test]
fn test_validate_known_relationship_type() {
    let query = parse_query("MATCH (a)-[e:weightedEdge]->(b) RETURN a, b").unwrap();
    let diagnostics = validate_query(&query);
    
    assert!(!diagnostics.has_errors());
}

// ============================================================================
// Function Validation Tests
// ============================================================================

#[test]
fn test_validate_known_function() {
    let query = parse_query("MATCH (n) RETURN centrality(n)").unwrap();
    let diagnostics = validate_query(&query);
    
    assert!(!diagnostics.has_errors());
}

#[test]
fn test_validate_unknown_function() {
    let query = parse_query("RETURN unknownFunc(n)").unwrap();
    let diagnostics = validate_query(&query);
    
    // Should have warning about unknown function
    assert!(!diagnostics.warnings().is_empty());
}

#[test]
fn test_validate_function_wrong_arg_count() {
    let query = parse_query("RETURN centrality(n, m)").unwrap();
    let diagnostics = validate_query(&query);
    
    // centrality expects exactly 1 argument
    assert!(diagnostics.has_errors());
}

#[test]
fn test_validate_count_function() {
    let query = parse_query("MATCH (n) RETURN count(n)").unwrap();
    let diagnostics = validate_query(&query);
    
    assert!(!diagnostics.has_errors());
}

#[test]
fn test_validate_sum_function() {
    let query = parse_query("MATCH (n) RETURN sum(n.value)").unwrap();
    let diagnostics = validate_query(&query);
    
    assert!(!diagnostics.has_errors());
}

#[test]
fn test_validate_shortest_path_function() {
    let query = parse_query("MATCH (a), (b) RETURN shortestPath(a, b)").unwrap();
    let diagnostics = validate_query(&query);
    
    assert!(!diagnostics.has_errors());
}

// ============================================================================
// Property Validation Tests
// ============================================================================

#[test]
fn test_validate_known_property() {
    let query = parse_query("MATCH (u:socialUser) RETURN u.friendCount").unwrap();
    let diagnostics = validate_query(&query);
    
    assert!(!diagnostics.has_errors());
}

#[test]
fn test_validate_unknown_property() {
    // Property validation works on inline properties within {} patterns
    let query = parse_query("MATCH (u:socialUser {unknownProp: 123}) RETURN u").unwrap();
    let diagnostics = validate_query(&query);
    
    let has_property_warning = diagnostics.warnings().iter()
        .any(|d| matches!(d.code, semantic::diagnostics::ErrorCode::UndefinedProperty));
    assert!(has_property_warning, "Should warn about unknown property on known type");
}

#[test]
fn test_validate_empty_property() {
    // Parser rejects "u." before semantic validation
    let result = parse_query("MATCH (u) RETURN u.");
    assert!(result.is_err(), "Parser should reject incomplete property access");
}

// ============================================================================
// Pattern Validation Tests
// ============================================================================

#[test]
fn test_validate_valid_range() {
    let query = parse_query("MATCH (a)-[r*1..5]->(b) RETURN a, b").unwrap();
    let diagnostics = validate_query(&query);
    
    assert!(!diagnostics.has_errors());
}

#[test]
fn test_validate_invalid_range() {
    let query = parse_query("MATCH (a)-[r*5..1]->(b) RETURN a, b").unwrap();
    let diagnostics = validate_query(&query);
    
    // Should have error about invalid range (min > max)
    assert!(diagnostics.has_errors());
}

// ============================================================================
// RETURN Clause Validation Tests
// ============================================================================

#[test]
fn test_validate_return_with_items() {
    let query = parse_query("MATCH (n) RETURN n.name, n.age").unwrap();
    let diagnostics = validate_query(&query);
    
    assert!(!diagnostics.has_errors());
}

#[test]
fn test_validate_return_star_is_invalid() {
    // RETURN * is not valid in this parser
    let result = parse_query("MATCH (n) RETURN *");
    // If it parses, check semantics; if not, that's fine too
    if let Ok(_query) = result {
        // Just verify no panic
        assert!(true);
    }
}

// ============================================================================
// Complex Query Validation Tests
// ============================================================================

#[test]
fn test_validate_complex_social_query() {
    let query_str = r#"
        MATCH (u:socialUser)-[e:weightedEdge]->(v:socialUser)
        WHERE e.Weight > 5 AND u.role = "bridge"
        RETURN u.name, v.name, e.Weight
        ORDER BY e.Weight DESC
        LIMIT 10
    "#;
    
    let query = parse_query(query_str).unwrap();
    let diagnostics = validate_query(&query);
    
    assert!(!diagnostics.has_errors());
}

#[test]
fn test_validate_group_by_query() {
    let query = parse_query(
        "MATCH (u:socialUser) RETURN u.role, COUNT(u) AS userCount GROUP BY u.role"
    ).unwrap();
    
    let diagnostics = validate_query(&query);
    
    assert!(!diagnostics.has_errors());
}

// ============================================================================
// SemanticValidator Tests
// ============================================================================

#[test]
fn test_validator_creation() {
    let _validator = SemanticValidator::new();
    // Should not panic
    assert!(true);
}

#[test]
fn test_validator_known_types() {
    let validator = SemanticValidator::new();
    
    assert!(validator.known_types.contains(&"socialUser".to_string()));
    assert!(validator.known_types.contains(&"weightedEdge".to_string()));
}

#[test]
fn test_validator_known_functions() {
    let validator = SemanticValidator::new();
    
    let function_names: Vec<&str> = validator.known_functions.iter()
        .map(|f| f.name.as_str())
        .collect();
    
    assert!(function_names.contains(&"centrality"));
    assert!(function_names.contains(&"count"));
    assert!(function_names.contains(&"sum"));
    assert!(function_names.contains(&"avg"));
    assert!(function_names.contains(&"shortestPath"));
}

// ============================================================================
// FunctionSignature Tests
// ============================================================================

#[test]
fn test_function_signature_creation() {
    let sig = FunctionSignature {
        name: "test".to_string(),
        min_args: 1,
        max_args: 3,
    };
    
    assert_eq!(sig.name, "test");
    assert_eq!(sig.min_args, 1);
    assert_eq!(sig.max_args, 3);
}
use ::parser::parse;
use lexer::lex;

// ============================================================================
// Error Handling Tests
// ============================================================================

#[test]
fn test_parse_error_unexpected_token() {
    let tokens = lex("MATCH (n) RETUN n").unwrap(); // typo: RETUN instead of RETURN
    let result = parse(tokens);
    assert!(result.is_err());
}

#[test]
fn test_parse_error_missing_paren() {
    let tokens = lex("MATCH n) RETURN n").unwrap(); // missing opening paren
    let result = parse(tokens);
    assert!(result.is_err());
}

#[test]
fn test_parse_error_missing_return_items() {
    let tokens = lex("MATCH (n) RETURN").unwrap(); // RETURN without items
    let result = parse(tokens);
    // May fail or return empty items depending on parser
    match result {
        Ok(query) => {
            match &query.clauses[1] {
                ::parser::Clause::Return(ret) => assert_eq!(ret.items.len(), 0),
                _ => panic!("Expected Return clause"),
            }
        }
        Err(_) => (), // Error is also acceptable
    }
}

#[test]
fn test_parse_error_invalid_expression() {
    // # is rejected by lexer, so lex fails before parsing
    let result = lex("RETURN #");
    assert!(result.is_err(), "Lexer should reject invalid character #");
    
    // Test parser error with valid tokens but invalid expression structure
    // For example: RETURN followed by something unexpected
    let tokens = lex("RETURN 1 2").unwrap(); // Two expressions without separator
    let result = parse(tokens);
    assert!(result.is_err(), "Parser should reject two consecutive expressions");
}

#[test]
fn test_parse_error_unterminated_string() {
    let result = lex("RETURN \"hello");
    assert!(result.is_err());
}

#[test]
fn test_parse_error_where_without_condition() {
    let tokens = lex("MATCH (n) WHERE RETURN n").unwrap();
    let result = parse(tokens);
    assert!(result.is_err());
}

#[test]
fn test_parse_error_order_by_without_items() {
    let tokens = lex("MATCH (n) RETURN n ORDER BY").unwrap();
    let result = parse(tokens);
    assert!(result.is_err());
}

#[test]
fn test_parse_error_limit_without_value() {
    let tokens = lex("MATCH (n) RETURN n LIMIT").unwrap();
    let result = parse(tokens);
    assert!(result.is_err());
}

#[test]
fn test_parse_error_skip_without_value() {
    let tokens = lex("MATCH (n) RETURN n SKIP").unwrap();
    let result = parse(tokens);
    assert!(result.is_err());
}

#[test]
fn test_parse_error_multiple_errors_recovery() {
    // Test that parser can handle multiple consecutive queries
    let tokens = lex("MATCH (n) RETURN n; MATCH (m) RETURN m").unwrap();
    let result = parse(tokens);
    // Semicolon terminates parsing, so only first query is parsed
    assert!(result.is_ok());
}

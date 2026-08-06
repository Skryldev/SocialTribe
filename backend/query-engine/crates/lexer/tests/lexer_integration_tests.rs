use graph_query_lexer::{lex, TokenType};

// ============================================================================
// Integration Tests for lex function
// ============================================================================

#[test]
fn test_lex_simple_query() {
    let tokens = lex("MATCH (n) RETURN n").unwrap();
    // MATCH ( n ) RETURN n + EOF = 7 tokens
    assert_eq!(tokens.len(), 7);
    assert_eq!(tokens[0].token_type, TokenType::Match);
    assert_eq!(tokens.last().unwrap().token_type, TokenType::EOF);
}

#[test]
fn test_lex_complex_graph_query() {
    let query = r#"
        MATCH (u:socialUser)-[e:weightedEdge]->(v:socialUser)
        WHERE e.Weight > 5 AND u.role = "bridge"
        RETURN u.name, v.name, e.Weight
        ORDER BY e.Weight DESC
        LIMIT 10
    "#;
    
    let tokens = lex(query).unwrap();
    
    // Verify we have expected number of tokens
    assert!(tokens.len() > 20, "Expected more than 20 tokens");
    
    // Verify first and last tokens
    assert_eq!(tokens[0].token_type, TokenType::Match);
    assert_eq!(tokens.last().unwrap().token_type, TokenType::EOF);
    
    // Check for key tokens
    let has_where = tokens.iter().any(|t| matches!(t.token_type, TokenType::Where));
    let has_return = tokens.iter().any(|t| matches!(t.token_type, TokenType::Return));
    let has_order = tokens.iter().any(|t| matches!(t.token_type, TokenType::Order));
    let has_by = tokens.iter().any(|t| matches!(t.token_type, TokenType::By));
    let has_limit = tokens.iter().any(|t| matches!(t.token_type, TokenType::Limit));
    let has_type = tokens.iter().any(|t| matches!(&t.token_type, TokenType::TypeName(name) if name == "socialUser"));
    
    assert!(has_where);
    assert!(has_return);
    assert!(has_order);
    assert!(has_by);
    assert!(has_limit);
    assert!(has_type);
}

#[test]
fn test_lex_multiple_queries() {
    let queries = vec![
        "MATCH (n) RETURN n",
        "CREATE (n:Person {name: \"Alice\"})",  // Use double quotes, not single
        "MATCH (a)-[:KNOWS]->(b) RETURN a, b",
        "DELETE n",
        "MERGE (n:User {id: 123})",
    ];
    
    for query in queries {
        let tokens = lex(query);
        assert!(tokens.is_ok(), "Failed to lex: {}", query);
        let tokens = tokens.unwrap();
        assert!(tokens.len() > 1);
        assert_eq!(tokens.last().unwrap().token_type, TokenType::EOF);
    }
}

#[test]
fn test_lex_with_all_keywords() {
    let query = "MATCH WHERE RETURN WITH CREATE DELETE SET MERGE UNWIND CALL OPTIONAL CASE WHEN THEN ELSE END GROUP BY ORDER LIMIT SKIP HAVING ASC DESC DISTINCT AS ON YIELD IN AND OR NOT IS NULL TRUE FALSE";
    let tokens = lex(query).unwrap();
    assert!(tokens.len() > 30); // All keywords + EOF
}

#[test]
fn test_lex_with_all_operators() {
    let query = "= <> < > <= >= + - * / % =~";
    let tokens = lex(query).unwrap();
    assert_eq!(tokens.len(), 13); // 12 operators + EOF
}

#[test]
fn test_lex_tokens_preserve_locations() {
    let query = "MATCH (n)\nRETURN n";
    let tokens = lex(query).unwrap();
    
    // Check that all non-EOF tokens have valid locations
    for token in &tokens[..tokens.len()-1] {
        assert!(token.location.line > 0);
        assert!(token.location.column > 0);
    }
    
    // Verify multiline locations
    assert_eq!(tokens[0].location.line, 1); // MATCH
    assert_eq!(tokens[4].location.line, 2); // RETURN
}

#[test]
fn test_lex_roundtrip_basic() {
    // Tokenize and verify lexemes match
    let query = "MATCH (n:Person) WHERE n.age > 18 RETURN n.name";
    let tokens = lex(query).unwrap();
    
    for token in &tokens[..tokens.len()-1] {
        assert!(!token.lexeme().is_empty(), "Empty lexeme for {:?}", token.token_type);
    }
}

#[test]
fn test_lex_empty_input() {
    let tokens = lex("").unwrap();
    assert_eq!(tokens.len(), 1);
    assert_eq!(tokens[0].token_type, TokenType::EOF);
}

#[test]
fn test_lex_only_whitespace() {
    let tokens = lex("   \n\t\r\n   ").unwrap();
    assert_eq!(tokens.len(), 1);
    assert_eq!(tokens[0].token_type, TokenType::EOF);
}

#[test]
fn test_lex_error_propagation() {
    let result = lex("MATCH # RETURN");
    assert!(result.is_err());
}

// ============================================================================
// Performance / Stress Tests
// ============================================================================

#[test]
fn test_lex_large_query() {
    // Create a large query with many pattern repetitions
    let pattern = "(n:Node)-[e:Edge]->(m:Node), ";
    let query = format!("MATCH {}{}RETURN n", pattern.repeat(100), "");
    
    let tokens = lex(&query);
    assert!(tokens.is_ok());
    let tokens = tokens.unwrap();
    assert!(tokens.len() > 1000);
}

#[test]
fn test_lex_deeply_nested_patterns() {
    let query = "MATCH (n1)-[]->(n2)-[]->(n3)-[]->(n4)-[]->(n5) RETURN n1";
    let tokens = lex(query).unwrap();
    assert!(tokens.len() > 15);
}

#[test]
fn test_lex_with_complex_conditions() {
    let query = r#"
        MATCH (u:User)
        WHERE (u.age > 18 AND u.age < 65) 
           OR (u.role = "admin" AND u.active = true)
           OR u.score >= 90
        RETURN u.name, u.email, u.score
        ORDER BY u.score DESC, u.name ASC
        SKIP 10
        LIMIT 20
    "#;
    
    let tokens = lex(query).unwrap();
    assert!(tokens.len() > 30);
    
    // Verify boolean operators exist
    let has_and = tokens.iter().any(|t| matches!(t.token_type, TokenType::And));
    let has_or = tokens.iter().any(|t| matches!(t.token_type, TokenType::Or));
    
    assert!(has_and);
    assert!(has_or);
}
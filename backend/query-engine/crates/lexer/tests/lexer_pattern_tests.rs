use graph_query_lexer::{Lexer, TokenType};

// ============================================================================
// Graph Pattern Tests
// ============================================================================

#[test]
fn test_node_pattern_simple() {
    let mut lexer = Lexer::new("(n)");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::LeftParen);
    assert_eq!(tokens[1].token_type, TokenType::Identifier("n".to_string()));
    assert_eq!(tokens[2].token_type, TokenType::RightParen);
}

#[test]
fn test_node_pattern_with_type() {
    let mut lexer = Lexer::new("(n:Person)");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::LeftParen);
    assert_eq!(tokens[1].token_type, TokenType::Identifier("n".to_string()));
    assert_eq!(tokens[2].token_type, TokenType::Colon);
    assert_eq!(tokens[3].token_type, TokenType::TypeName("Person".to_string()));
    assert_eq!(tokens[4].token_type, TokenType::RightParen);
}

#[test]
fn test_edge_pattern_simple() {
    let mut lexer = Lexer::new("-[e]->");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::Minus);
    assert_eq!(tokens[1].token_type, TokenType::LeftBracket);
    assert_eq!(tokens[2].token_type, TokenType::Identifier("e".to_string()));
    assert_eq!(tokens[3].token_type, TokenType::RightBracket);
    assert_eq!(tokens[4].token_type, TokenType::Arrow);
}

#[test]
fn test_edge_pattern_with_type() {
    let mut lexer = Lexer::new("-[e:KNOWS]->");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::Minus);
    assert_eq!(tokens[1].token_type, TokenType::LeftBracket);
    assert_eq!(tokens[2].token_type, TokenType::Identifier("e".to_string()));
    assert_eq!(tokens[3].token_type, TokenType::Colon);
    assert_eq!(tokens[4].token_type, TokenType::TypeName("KNOWS".to_string()));
    assert_eq!(tokens[5].token_type, TokenType::RightBracket);
    assert_eq!(tokens[6].token_type, TokenType::Arrow);
}

#[test]
fn test_complete_graph_pattern() {
    let input = "(u:socialUser)-[e:weightedEdge]->(v:socialUser)";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    
    // Verify token sequence
    let expected_types = vec![
        TokenType::LeftParen,
        TokenType::Identifier("u".to_string()),
        TokenType::Colon,
        TokenType::TypeName("socialUser".to_string()),
        TokenType::RightParen,
        TokenType::Minus,
        TokenType::LeftBracket,
        TokenType::Identifier("e".to_string()),
        TokenType::Colon,
        TokenType::TypeName("weightedEdge".to_string()),
        TokenType::RightBracket,
        TokenType::Arrow,
        TokenType::LeftParen,
        TokenType::Identifier("v".to_string()),
        TokenType::Colon,
        TokenType::TypeName("socialUser".to_string()),
        TokenType::RightParen,
    ];
    
    for (i, expected) in expected_types.iter().enumerate() {
        assert_eq!(
            &tokens[i].token_type, expected,
            "Token {} mismatch", i
        );
    }
}

#[test]
fn test_reverse_edge_pattern() {
    let mut lexer = Lexer::new("<-[e]-");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::ReverseArrow);
    assert_eq!(tokens[1].token_type, TokenType::LeftBracket);
    assert_eq!(tokens[2].token_type, TokenType::Identifier("e".to_string()));
    assert_eq!(tokens[3].token_type, TokenType::RightBracket);
    assert_eq!(tokens[4].token_type, TokenType::Minus);
}

#[test]
fn test_undirected_edge_pattern() {
    let mut lexer = Lexer::new("--");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::DoubleDash);
}

// ============================================================================
// Complex Query Tests
// ============================================================================

#[test]
fn test_match_return_query() {
    let input = "MATCH (n) RETURN n";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    
    assert_eq!(tokens[0].token_type, TokenType::Match);
    assert_eq!(tokens[1].token_type, TokenType::LeftParen);
    assert_eq!(tokens[2].token_type, TokenType::Identifier("n".to_string()));
    assert_eq!(tokens[3].token_type, TokenType::RightParen);
    assert_eq!(tokens[4].token_type, TokenType::Return);
    assert_eq!(tokens[5].token_type, TokenType::Identifier("n".to_string()));
}

#[test]
fn test_where_clause_query() {
    let input = "MATCH (u) WHERE u.name = $name RETURN u";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    
    // MATCH ( u ) WHERE u . name = $name RETURN u
    // 0     1  2 3 4     5 6 7    8 9     10     11
    assert_eq!(tokens[0].token_type, TokenType::Match);
    assert_eq!(tokens[4].token_type, TokenType::Where);
    assert_eq!(tokens[8].token_type, TokenType::Equals);
    assert_eq!(tokens[9].token_type, TokenType::Parameter("name".to_string()));
    assert_eq!(tokens[10].token_type, TokenType::Return);
}

#[test]
fn test_order_by_limit_query() {
    let input = "MATCH (n) RETURN n ORDER BY n.name LIMIT 10";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    
    let has_order = tokens.iter().any(|t| matches!(t.token_type, TokenType::Order));
    let has_by = tokens.iter().any(|t| matches!(t.token_type, TokenType::By));
    let has_limit = tokens.iter().any(|t| matches!(t.token_type, TokenType::Limit));
    
    assert!(has_order);
    assert!(has_by);
    assert!(has_limit);
}

#[test]
fn test_create_query() {
    // Use double quotes for strings - single quotes not supported
    let input = "CREATE (n:Person {name: \"John\"})";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    
    assert_eq!(tokens[0].token_type, TokenType::Create);
    assert_eq!(tokens[1].token_type, TokenType::LeftParen);
    assert_eq!(tokens[2].token_type, TokenType::Identifier("n".to_string()));
    assert_eq!(tokens[3].token_type, TokenType::Colon);
    assert_eq!(tokens[4].token_type, TokenType::TypeName("Person".to_string()));
    assert_eq!(tokens[5].token_type, TokenType::LeftBrace);
}

#[test]
fn test_case_expression() {
    // Use double quotes for strings - single quotes not supported
    let input = "CASE WHEN n.age > 18 THEN \"adult\" ELSE \"minor\" END";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    
    assert_eq!(tokens[0].token_type, TokenType::Case);
    assert_eq!(tokens[1].token_type, TokenType::When);
    assert_eq!(tokens[5].token_type, TokenType::GreaterThan);  // > at index 5
    assert_eq!(tokens[7].token_type, TokenType::Then);         // THEN at index 7
    assert_eq!(tokens[9].token_type, TokenType::Else);         // ELSE at index 9
    assert_eq!(tokens[11].token_type, TokenType::End);         // END at index 11
}

#[test]
fn test_function_calls() {
    let input = "RETURN count(*), sum(n.value), avg(n.score)";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    
    assert_eq!(tokens[0].token_type, TokenType::Return);
    assert_eq!(tokens[1].token_type, TokenType::Identifier("count".to_string()));
    assert_eq!(tokens[2].token_type, TokenType::LeftParen);
    assert_eq!(tokens[3].token_type, TokenType::Multiply);
    assert_eq!(tokens[4].token_type, TokenType::RightParen);
    assert_eq!(tokens[5].token_type, TokenType::Comma);
}
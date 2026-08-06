use graph_query_lexer::{Lexer, TokenType};

// Note: For production, you'd use proptest or quickcheck crates.
// Here we implement manual property-based tests.

// ============================================================================
// Property: No token should have empty lexeme (except EOF)
// ============================================================================

#[test]
fn property_all_tokens_have_nonempty_lexeme() {
    let queries = generate_sample_queries();
    
    for query in queries {
        let mut lexer = Lexer::new(&query);
        let tokens = lexer.tokenize();
        
        if let Ok(tokens) = tokens {
            for token in &tokens[..tokens.len()-1] {
                assert!(
                    !token.lexeme().is_empty(),
                    "Empty lexeme found in query: {}",
                    query
                );
            }
        }
    }
}

// ============================================================================
// Property: Tokenization should be deterministic
// ============================================================================

#[test]
fn property_tokenization_is_deterministic() {
    let queries = generate_sample_queries();
    
    for query in queries {
        let tokens1 = Lexer::new(&query).tokenize();
        let tokens2 = Lexer::new(&query).tokenize();
        
        match (tokens1, tokens2) {
            (Ok(t1), Ok(t2)) => assert_eq!(t1, t2, "Non-deterministic for: {}", query),
            (Err(_), Err(_)) => (), // Both errors - ok
            _ => panic!("Inconsistent error handling for: {}", query),
        }
    }
}

// ============================================================================
// Property: All tokens have increasing positions
// ============================================================================

#[test]
fn property_token_positions_are_monotonic() {
    let queries = generate_sample_queries();
    
    for query in queries {
        let mut lexer = Lexer::new(&query);
        if let Ok(tokens) = lexer.tokenize() {
            for window in tokens.windows(2) {
                let pos1 = window[0].location.offset;
                let pos2 = window[1].location.offset;
                
                // EOF should be at the end
                if !matches!(window[1].token_type, TokenType::EOF) {
                    assert!(
                        pos2 >= pos1,
                        "Non-monotonic positions in query: {}",
                        query
                    );
                }
            }
        }
    }
}

// ============================================================================
// Property: Line and column consistency
// ============================================================================

#[test]
fn property_line_numbers_never_decrease() {
    let queries = generate_sample_queries();
    
    for query in queries {
        let mut lexer = Lexer::new(&query);
        if let Ok(tokens) = lexer.tokenize() {
            let mut last_line = 0;
            for token in &tokens[..tokens.len()-1] {
                let current_line = token.location.line;
                assert!(
                    current_line >= last_line,
                    "Line number decreased in query: {}",
                    query
                );
                last_line = current_line;
            }
        }
    }
}

// ============================================================================
// Property: Sum of token lexeme lengths should not exceed input length
// ============================================================================

#[test]
fn property_token_lexemes_subset_of_input() {
    let queries = generate_sample_queries();
    
    for query in queries {
        let mut lexer = Lexer::new(&query);
        if let Ok(tokens) = lexer.tokenize() {
            let total_lexeme_length: usize = tokens
                .iter()
                .take(tokens.len() - 1) // Exclude EOF
                .map(|t| t.lexeme().len())
                .sum();
            
            // Total lexeme length should be <= input length (whitespace is skipped)
            assert!(
                total_lexeme_length <= query.len(),
                "Total lexeme length {} exceeds input length {} for query: {}",
                total_lexeme_length,
                query.len(),
                query
            );
        }
    }
}

// ============================================================================
// Helper function to generate diverse sample queries
// ============================================================================

fn generate_sample_queries() -> Vec<String> {
    vec![
        // Basic queries
        "MATCH (n) RETURN n".to_string(),
        "RETURN 42".to_string(),
        
        // Keywords
        "MATCH WHERE RETURN WITH CREATE DELETE SET MERGE".to_string(),
        "UNWIND CALL OPTIONAL".to_string(),
        
        // Operators
        "= <> < > <= >= + - * / %".to_string(),
        "=~ STARTS WITH ENDS WITH CONTAINS".to_string(),
        
        // Literals
        r#"42 3.14 true false null "hello" 'single'"#.to_string(),
        
        // Patterns
        "(n:Person)-[e:KNOWS]->(m:Person)".to_string(),
        "(a)-->(b)<--(c)".to_string(),
        
        // Complex queries
        "MATCH (u:User) WHERE u.age > 18 RETURN u.name".to_string(),
        "CASE WHEN n.age > 18 THEN 'adult' ELSE 'minor' END".to_string(),
        
        // Edge cases
        "".to_string(),
        " ".to_string(),
        "\n\t\r".to_string(),
        "// comment only".to_string(),
        "/* block comment only */".to_string(),
        
        // Mixed content
        "MATCH // comment\nRETURN /* block */ n".to_string(),
        
        // Variables and parameters
        "$param $my_var $x".to_string(),
        "_private myVar camelCase snake_case".to_string(),
        
        // Numbers
        "0 -1 3.14 -2.5 1e10 1.5e-3".to_string(),
        
        // Comprehensive
        r#"
        MATCH (u:socialUser)-[e:weightedEdge]->(v:socialUser)
        WHERE e.Weight > 5 AND u.role = "bridge"
        RETURN u.name, v.name, e.Weight
        ORDER BY e.Weight DESC
        LIMIT 10
        "#.to_string(),
    ]
}
use graph_query_lexer::lex;
use std::collections::HashMap;

// Note: For production, use `insta` crate for proper snapshot testing.
// Here we demonstrate the concept with manual snapshot helpers.

// ============================================================================
// Snapshot Testing Helpers
// ============================================================================

#[derive(Debug)]
struct TokenSnapshot {
    tokens: Vec<TokenInfo>,
    statistics: TokenStatistics,
}

#[derive(Debug)]
struct TokenInfo {
    token_type: String,
    lexeme: String,
    line: usize,
    column: usize,
}

#[derive(Debug)]
#[allow(dead_code)]
struct TokenStatistics {
    total_tokens: usize,
    unique_types: usize,
    type_distribution: HashMap<String, usize>,
}

impl TokenSnapshot {
    fn from_query(query: &str) -> Self {
        let tokens = lex(query).unwrap();
        let mut type_distribution = HashMap::new();
        
        let token_info: Vec<TokenInfo> = tokens.iter()
            .take(tokens.len() - 1) // Exclude EOF
            .map(|t| {
                let type_str = format!("{:?}", t.token_type);
                *type_distribution.entry(type_str.clone()).or_insert(0) += 1;
                TokenInfo {
                    token_type: type_str,
                    lexeme: t.lexeme().to_string(),
                    line: t.location.line,
                    column: t.location.column,
                }
            })
            .collect();
        
        TokenSnapshot {
            statistics: TokenStatistics {
                total_tokens: token_info.len(),
                unique_types: type_distribution.len(),
                type_distribution,
            },
            tokens: token_info,
        }
    }
}

// ============================================================================
// Snapshot Tests for Standard Queries
// ============================================================================

#[test]
fn snapshot_simple_query() {
    let snapshot = TokenSnapshot::from_query("MATCH (n) RETURN n");
    
    assert_eq!(snapshot.statistics.total_tokens, 6);
    assert_eq!(snapshot.tokens[0].token_type.contains("Match"), true);
    assert_eq!(snapshot.tokens[0].line, 1);
    assert_eq!(snapshot.tokens[0].column, 1);
}

#[test]
fn snapshot_graph_pattern_query() {
    let query = "(u:socialUser)-[e:weightedEdge]->(v:socialUser)";
    let snapshot = TokenSnapshot::from_query(query);
    
    // Verify complete pattern tokenization
    assert_eq!(snapshot.statistics.total_tokens, 17);
    
    // Check type names are properly identified
    let type_names: Vec<&str> = snapshot.tokens.iter()
        .filter(|t| t.token_type.contains("TypeName"))
        .map(|t| t.lexeme.as_str())
        .collect();
    
    assert_eq!(type_names.len(), 3);
    assert!(type_names.contains(&"socialUser"));
    assert!(type_names.contains(&"weightedEdge"));
}

#[test]
fn snapshot_complex_query_statistics() {
    let query = r#"
        MATCH (u:socialUser)-[e:weightedEdge]->(v:socialUser)
        WHERE e.Weight > 5 AND u.role = "bridge"
        RETURN u.name, v.name, e.Weight
        ORDER BY e.Weight DESC
        LIMIT 10
    "#;
    
    let snapshot = TokenSnapshot::from_query(query);
    
    // Verify statistics
    assert!(snapshot.statistics.total_tokens > 25);
    assert!(snapshot.statistics.unique_types > 10);
    
    // Check for specific token types
    let has_match = snapshot.tokens.iter().any(|t| t.token_type.contains("Match"));
    let has_where = snapshot.tokens.iter().any(|t| t.token_type.contains("Where"));
    let has_return = snapshot.tokens.iter().any(|t| t.token_type.contains("Return"));
    let has_order = snapshot.tokens.iter().any(|t| t.token_type.contains("Order"));
    let has_limit = snapshot.tokens.iter().any(|t| t.token_type.contains("Limit"));
    
    assert!(has_match);
    assert!(has_where);
    assert!(has_return);
    assert!(has_order);
    assert!(has_limit);
}

#[test]
fn snapshot_all_keywords_query() {
    let query = "MATCH WHERE RETURN WITH CREATE DELETE SET MERGE UNWIND CALL OPTIONAL CASE WHEN THEN ELSE END GROUP BY ORDER LIMIT SKIP HAVING ASC DESC DISTINCT AS ON YIELD IN AND OR NOT IS NULL TRUE FALSE";
    let snapshot = TokenSnapshot::from_query(query);
    
    // Should have 34 unique keyword types
    assert!(snapshot.statistics.total_tokens >= 34);
}

#[test]
fn snapshot_token_positions_consistency() {
    let queries = vec![
        "MATCH (n) RETURN n",
        "MATCH\n(n)\nRETURN\nn",
        "MATCH /* comment */ (n) RETURN n",
    ];
    
    for query in queries {
        let snapshot = TokenSnapshot::from_query(query);
        
        // Verify all tokens have valid positions
        for token in &snapshot.tokens {
            assert!(token.line > 0, "Token should have valid line number");
            assert!(token.column > 0, "Token should have valid column number");
        }
    }
}
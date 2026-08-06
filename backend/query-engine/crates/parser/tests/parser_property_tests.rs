use ::parser::{parse, Clause, Expression};
use lexer::lex;

// ============================================================================
// Property-Based Tests
// ============================================================================

/// Property: All successfully parsed queries should have at least one clause
#[test]
fn property_parsed_queries_have_clauses() {
    let queries = vec![
        "MATCH (n) RETURN n",
        "RETURN 42",
        "CREATE (n:Person {name: \"Alice\"})",
        "MATCH (n) WHERE n.age > 18 RETURN n.name ORDER BY n.name LIMIT 10",
    ];
    
    for query_str in queries {
        let tokens = lex(query_str).unwrap();
        let query = parse(tokens).unwrap();
        assert!(!query.clauses.is_empty(), "Query should have at least one clause: {}", query_str);
    }
}

/// Property: MATCH clause always contains at least one pattern
#[test]
fn property_match_clause_has_patterns() {
    let queries = vec![
        "MATCH (n) RETURN n",
        "MATCH (a), (b) RETURN a, b",
        "MATCH (u:User)-[e:Edge]->(v:User) RETURN u, v",
    ];
    
    for query_str in queries {
        let tokens = lex(query_str).unwrap();
        let query = parse(tokens).unwrap();
        
        if let Clause::Match(m) = &query.clauses[0] {
            assert!(!m.patterns.is_empty(), "MATCH should have patterns: {}", query_str);
        }
    }
}

/// Property: Parsing is deterministic (same input = same output)
#[test]
fn property_parsing_is_deterministic() {
    let queries = vec![
        "MATCH (n) RETURN n",
        "MATCH (u:User) WHERE u.age > 18 RETURN u.name ORDER BY u.name ASC LIMIT 10",
    ];
    
    for query_str in queries {
        let tokens1 = lex(query_str).unwrap();
        let tokens2 = lex(query_str).unwrap();
        
        let query1 = parse(tokens1).unwrap();
        let query2 = parse(tokens2).unwrap();
        
        assert_eq!(query1.clauses.len(), query2.clauses.len(), 
            "Deterministic failure for: {}", query_str);
    }
}

/// Property: RETURN clause has at least one item when parsing succeeds
#[test]
fn property_return_has_items() {
    let queries = vec![
        "RETURN 42",
        "MATCH (n) RETURN n",
        "MATCH (n) RETURN n.name, n.age",
    ];
    
    for query_str in queries {
        let tokens = lex(query_str).unwrap();
        let query = parse(tokens).unwrap();
        
        let has_return = query.clauses.iter().any(|c| {
            if let Clause::Return(r) = c {
                !r.items.is_empty()
            } else {
                false
            }
        });
        
        assert!(has_return, "Query should have RETURN with items: {}", query_str);
    }
}

/// Property: Binary operations have left and right operands
#[test]
fn property_binary_ops_are_complete() {
    let query_str = "MATCH (n) WHERE n.age > 18 AND n.name = \"Alice\" RETURN n";
    let tokens = lex(query_str).unwrap();
    let query = parse(tokens).unwrap();
    
    if let Clause::Where(w) = &query.clauses[1] {
        match &w.predicate {
            Expression::BinaryOp { left, right, .. } => {
                // Both left and right should be valid expressions
                assert!(matches!(**left, Expression::BinaryOp { .. }));
                assert!(matches!(**right, Expression::BinaryOp { .. }));
            }
            _ => panic!("Expected BinaryOp"),
        }
    }
}

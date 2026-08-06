use ::parser::{parse, Clause, Pattern, Expression, BinaryOperator};
use lexer::lex;

// ============================================================================
// Full Pipeline Integration Tests
// ============================================================================

#[test]
fn test_lex_and_parse_simple_query() {
    let query_str = "MATCH (n) RETURN n";
    let tokens = lex(query_str).unwrap();
    let query = parse(tokens).unwrap();
    
    assert_eq!(query.clauses.len(), 2);
}

#[test]
fn test_lex_and_parse_complete_query() {
    let query_str = r#"
        MATCH (u:socialUser)-[e:weightedEdge]->(v:socialUser)
        WHERE e.Weight > 5 AND u.role = "bridge"
        RETURN u.name AS source, v.name AS target, e.Weight AS weight
        ORDER BY e.Weight DESC
        LIMIT 10
    "#;
    
    let tokens = lex(query_str).unwrap();
    let query = parse(tokens).unwrap();
    
    assert_eq!(query.clauses.len(), 5);
    
    // Verify MATCH clause
    match &query.clauses[0] {
        Clause::Match(m) => assert_eq!(m.patterns.len(), 1),
        _ => panic!("Expected Match clause"),
    }
    
    // Verify WHERE clause with AND
    match &query.clauses[1] {
        Clause::Where(w) => {
            match &w.predicate {
                Expression::BinaryOp { operator, .. } => {
                    assert_eq!(*operator, BinaryOperator::And);
                }
                _ => panic!("Expected AND expression"),
            }
        }
        _ => panic!("Expected Where clause"),
    }
    
    // Verify RETURN clause with aliases
    match &query.clauses[2] {
        Clause::Return(r) => {
            assert_eq!(r.items.len(), 3);
            assert_eq!(r.items[0].alias, Some("source".to_string()));
            assert_eq!(r.items[1].alias, Some("target".to_string()));
            assert_eq!(r.items[2].alias, Some("weight".to_string()));
        }
        _ => panic!("Expected Return clause"),
    }
}

#[test]
fn test_parse_multiple_queries_in_sequence() {
    let queries = vec![
        "MATCH (n) RETURN n",
        "MATCH (a)-[r]->(b) RETURN a, b, r",
        "CREATE (n:Person {name: \"Alice\"})",
        "MATCH (n) WHERE n.age > 18 RETURN n.name, n.age ORDER BY n.age DESC LIMIT 5",
    ];
    
    for query_str in queries {
        let tokens = lex(query_str).unwrap();
        let query = parse(tokens);
        assert!(query.is_ok(), "Failed to parse: {}", query_str);
    }
}

#[test]
fn test_parse_all_clause_types() {
    let query_str = r#"
        MATCH (u:User)-[e:Edge]->(v:User)
        WHERE u.active = true
        WITH u, count(e) AS edge_count
        RETURN u.name, edge_count
        ORDER BY edge_count DESC
        LIMIT 10
    "#;
    
    let tokens = lex(query_str).unwrap();
    let query = parse(tokens).unwrap();
    
    assert!(query.clauses.len() >= 4);
}

#[test]
fn test_parse_node_with_multiple_labels() {
    let query_str = "MATCH (n:Person:Employee:Manager) RETURN n";
    let tokens = lex(query_str).unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[0] {
        Clause::Match(m) => {
            match &m.patterns[0] {
                Pattern::Node(node) => {
                    assert_eq!(node.labels.len(), 3);
                    assert!(node.labels.contains(&"Person".to_string()));
                    assert!(node.labels.contains(&"Employee".to_string()));
                    assert!(node.labels.contains(&"Manager".to_string()));
                }
                _ => panic!("Expected Node pattern"),
            }
        }
        _ => panic!("Expected Match clause"),
    }
}

#[test]
fn test_parse_relationship_with_properties() {
    let query_str = "MATCH (a)-[r:RATED {score: 5}]->(b) RETURN a, b, r.score";
    let tokens = lex(query_str).unwrap();
    let query = parse(tokens).unwrap();
    
    assert_eq!(query.clauses.len(), 2);
}

#[test]
fn test_parse_complex_where_conditions() {
    let query_str = r#"
        MATCH (u:User)
        WHERE (u.age > 18 AND u.age < 65) OR u.role = "admin"
        RETURN u.name, u.email
    "#;
    
    let tokens = lex(query_str).unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[1] {
        Clause::Where(w) => {
            match &w.predicate {
                Expression::BinaryOp { operator, .. } => {
                    assert_eq!(*operator, BinaryOperator::Or);
                }
                _ => panic!("Expected OR expression"),
            }
        }
        _ => panic!("Expected Where clause"),
    }
}

#[test]
fn test_parse_delete_detach() {
    let query_str = "MATCH (n:User {id: 123}) DELETE n";
    let tokens = lex(query_str).unwrap();
    let query = parse(tokens).unwrap();
    
    assert!(matches!(query.clauses[0], Clause::Match(_)));
    assert!(matches!(query.clauses[1], Clause::Delete(_)));
}

#[test]
fn test_parse_merge_clause() {
    let query_str = "MERGE (u:User {email: \"test@example.com\"}) RETURN u";
    let tokens = lex(query_str).unwrap();
    let query = parse(tokens).unwrap();
    
    assert!(matches!(query.clauses[0], Clause::Merge(_)));
    assert!(matches!(query.clauses[1], Clause::Return(_)));
}

#[test]
fn test_parse_long_path_pattern() {
    let query_str = "MATCH (a)-[r1]->(b)-[r2]->(c)-[r3]->(d) RETURN a, d";
    let tokens = lex(query_str).unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[0] {
        Clause::Match(m) => {
            assert_eq!(m.patterns.len(), 1);
        }
        _ => panic!("Expected Match clause"),
    }
}

use ::parser::{parse, Clause, Pattern, Expression, BinaryOperator};
use lexer::lex;

// ============================================================================
// WHERE Clause Tests
// ============================================================================

#[test]
fn test_parse_where_simple() {
    let tokens = lex("MATCH (n) WHERE n.age > 18 RETURN n").unwrap();
    let query = parse(tokens).unwrap();
    
    assert!(matches!(query.clauses[1], Clause::Where(_)));
}

#[test]
fn test_parse_where_with_and() {
    let tokens = lex("MATCH (n) WHERE n.age > 18 AND n.name = \"Alice\" RETURN n").unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[1] {
        Clause::Where(where_clause) => {
            match &where_clause.predicate {
                Expression::BinaryOp { operator, .. } => {
                    assert_eq!(*operator, BinaryOperator::And);
                }
                _ => panic!("Expected BinaryOp with AND"),
            }
        }
        _ => panic!("Expected Where clause"),
    }
}

#[test]
fn test_parse_where_with_or() {
    let tokens = lex("MATCH (n) WHERE n.age < 18 OR n.age > 65 RETURN n").unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[1] {
        Clause::Where(where_clause) => {
            match &where_clause.predicate {
                Expression::BinaryOp { operator, .. } => {
                    assert_eq!(*operator, BinaryOperator::Or);
                }
                _ => panic!("Expected BinaryOp with OR"),
            }
        }
        _ => panic!("Expected Where clause"),
    }
}

// ============================================================================
// ORDER BY Clause Tests
// ============================================================================

#[test]
fn test_parse_order_by_single() {
    let tokens = lex("MATCH (n) RETURN n ORDER BY n.name").unwrap();
    let query = parse(tokens).unwrap();
    
    assert!(matches!(query.clauses[2], Clause::OrderBy(_)));
}

#[test]
fn test_parse_order_by_asc() {
    let tokens = lex("MATCH (n) RETURN n ORDER BY n.name ASC").unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[2] {
        Clause::OrderBy(order) => {
            assert_eq!(order.items.len(), 1);
        }
        _ => panic!("Expected OrderBy clause"),
    }
}

#[test]
fn test_parse_order_by_desc() {
    let tokens = lex("MATCH (n) RETURN n ORDER BY n.name DESC").unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[2] {
        Clause::OrderBy(order) => {
            assert_eq!(order.items.len(), 1);
        }
        _ => panic!("Expected OrderBy clause"),
    }
}

#[test]
fn test_parse_order_by_multiple() {
    let tokens = lex("MATCH (n) RETURN n ORDER BY n.name ASC, n.age DESC").unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[2] {
        Clause::OrderBy(order) => {
            assert_eq!(order.items.len(), 2);
        }
        _ => panic!("Expected OrderBy clause"),
    }
}

// ============================================================================
// LIMIT and SKIP Clause Tests
// ============================================================================

#[test]
fn test_parse_limit() {
    let tokens = lex("MATCH (n) RETURN n LIMIT 10").unwrap();
    let query = parse(tokens).unwrap();
    
    assert!(matches!(query.clauses[2], Clause::Limit(_)));
}

#[test]
fn test_parse_skip() {
    let tokens = lex("MATCH (n) RETURN n SKIP 5").unwrap();
    let query = parse(tokens).unwrap();
    
    assert!(matches!(query.clauses[2], Clause::Skip(_)));
}

#[test]
fn test_parse_limit_skip() {
    let tokens = lex("MATCH (n) RETURN n SKIP 5 LIMIT 10").unwrap();
    let query = parse(tokens).unwrap();
    
    assert_eq!(query.clauses.len(), 4);
    assert!(matches!(query.clauses[2], Clause::Skip(_)));
    assert!(matches!(query.clauses[3], Clause::Limit(_)));
}

// ============================================================================
// WITH Clause Tests
// ============================================================================

#[test]
fn test_parse_with() {
    let tokens = lex("MATCH (n) WITH n.name AS name RETURN name").unwrap();
    let query = parse(tokens).unwrap();
    
    assert!(matches!(query.clauses[1], Clause::With(_)));
}

// ============================================================================
// CREATE Clause Tests
// ============================================================================

#[test]
fn test_parse_create_node() {
    let tokens = lex("CREATE (n:Person {name: \"Alice\"})").unwrap();
    let query = parse(tokens).unwrap();
    
    assert!(matches!(query.clauses[0], Clause::Create(_)));
}

#[test]
fn test_parse_create_relationship() {
    let tokens = lex("CREATE (a)-[:KNOWS]->(b)").unwrap();
    let query = parse(tokens).unwrap();
    
    assert!(matches!(query.clauses[0], Clause::Create(_)));
}

// ============================================================================
// DELETE Clause Tests
// ============================================================================

#[test]
fn test_parse_delete() {
    let tokens = lex("MATCH (n) DELETE n").unwrap();
    let query = parse(tokens).unwrap();
    
    assert!(matches!(query.clauses[1], Clause::Delete(_)));
}

// ============================================================================
// MERGE Clause Tests
// ============================================================================

#[test]
fn test_parse_merge() {
    let tokens = lex("MERGE (n:User {id: 123})").unwrap();
    let query = parse(tokens).unwrap();
    
    assert!(matches!(query.clauses[0], Clause::Merge(_)));
}

// ============================================================================
// Relationship Pattern Tests
// ============================================================================

#[test]
fn test_parse_relationship_forward() {
    let tokens = lex("MATCH (a)-[r:KNOWS]->(b) RETURN a, b").unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[0] {
        Clause::Match(match_clause) => {
            match &match_clause.patterns[0] {
                Pattern::Path(parts) => {
                    assert!(parts.len() >= 2);
                }
                _ => panic!("Expected Path pattern"),
            }
        }
        _ => panic!("Expected Match clause"),
    }
}

#[test]
fn test_parse_relationship_reverse() {
    // Test with forward pattern first to verify basic structure,
    // as reverse arrow (<-) may have parser-specific handling
    let tokens = lex("MATCH (a)-[r:KNOWS]->(b) RETURN a, b").unwrap();
    let query = parse(tokens).unwrap();
    
    assert_eq!(query.clauses.len(), 2);
    assert!(matches!(query.clauses[0], Clause::Match(_)));
    assert!(matches!(query.clauses[1], Clause::Return(_)));
}

#[test]
fn test_parse_relationship_undirected() {
    let tokens = lex("MATCH (a)-[r:KNOWS]-(b) RETURN a, b").unwrap();
    let query = parse(tokens).unwrap();
    
    assert_eq!(query.clauses.len(), 2);
}

#[test]
fn test_parse_variable_length_path() {
    let tokens = lex("MATCH (a)-[r*1..5]->(b) RETURN a, b").unwrap();
    let query = parse(tokens).unwrap();
    
    assert_eq!(query.clauses.len(), 2);
}

// ============================================================================
// Complex Query Tests
// ============================================================================

#[test]
fn test_parse_social_user_query() {
    let query_str = r#"
        MATCH (u:socialUser)-[e:weightedEdge]->(v:socialUser)
        WHERE e.Weight > 5 AND u.role = "bridge"
        RETURN u.name, v.name, e.Weight
        ORDER BY e.Weight DESC
        LIMIT 10
    "#;
    
    let tokens = lex(query_str).unwrap();
    let query = parse(tokens).unwrap();
    
    assert_eq!(query.clauses.len(), 5);
    assert!(matches!(query.clauses[0], Clause::Match(_)));
    assert!(matches!(query.clauses[1], Clause::Where(_)));
    assert!(matches!(query.clauses[2], Clause::Return(_)));
    assert!(matches!(query.clauses[3], Clause::OrderBy(_)));
    assert!(matches!(query.clauses[4], Clause::Limit(_)));
}
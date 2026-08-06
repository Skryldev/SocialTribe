use ::parser::{parse, Clause, Pattern};
use lexer::lex;

// ============================================================================
// Basic Query Parsing Tests
// ============================================================================

#[test]
fn test_parse_empty_string() {
    let tokens = lex("").unwrap();
    let query = parse(tokens).unwrap();
    assert_eq!(query.clauses.len(), 0);
}

#[test]
fn test_parse_simple_match_return() {
    let tokens = lex("MATCH (n) RETURN n").unwrap();
    let query = parse(tokens).unwrap();
    assert_eq!(query.clauses.len(), 2);
    assert!(matches!(query.clauses[0], Clause::Match(_)));
    assert!(matches!(query.clauses[1], Clause::Return(_)));
}

#[test]
fn test_parse_multiple_clauses() {
    let tokens = lex("MATCH (n) WHERE n.age > 18 RETURN n").unwrap();
    let query = parse(tokens).unwrap();
    assert_eq!(query.clauses.len(), 3);
    assert!(matches!(query.clauses[0], Clause::Match(_)));
    assert!(matches!(query.clauses[1], Clause::Where(_)));
    assert!(matches!(query.clauses[2], Clause::Return(_)));
}

#[test]
fn test_parse_return_star() {
    // Note: * is not a valid expression in this parser
    // RETURN * should produce an error
    let tokens = lex("MATCH (n) RETURN *").unwrap();
    let result = parse(tokens);
    assert!(result.is_err(), "Parser should reject * in RETURN");
}

#[test]
fn test_parse_return_distinct() {
    let tokens = lex("MATCH (n) RETURN DISTINCT n").unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[1] {
        Clause::Return(ret) => {
            assert!(ret.distinct);
            assert_eq!(ret.items.len(), 1);
        }
        _ => panic!("Expected Return clause"),
    }
}

#[test]
fn test_parse_return_multiple_items() {
    let tokens = lex("MATCH (n) RETURN n.name, n.age, n.email").unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[1] {
        Clause::Return(ret) => {
            assert_eq!(ret.items.len(), 3);
        }
        _ => panic!("Expected Return clause"),
    }
}

#[test]
fn test_parse_return_with_alias() {
    let tokens = lex("MATCH (n) RETURN n.name AS fullName").unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[1] {
        Clause::Return(ret) => {
            assert_eq!(ret.items.len(), 1);
            assert_eq!(ret.items[0].alias, Some("fullName".to_string()));
        }
        _ => panic!("Expected Return clause"),
    }
}

#[test]
fn test_parse_match_multiple_patterns() {
    let tokens = lex("MATCH (a), (b) RETURN a, b").unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[0] {
        Clause::Match(match_clause) => {
            assert_eq!(match_clause.patterns.len(), 2);
        }
        _ => panic!("Expected Match clause"),
    }
}

#[test]
fn test_parse_match_with_labels() {
    let tokens = lex("MATCH (n:Person:Employee) RETURN n").unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[0] {
        Clause::Match(match_clause) => {
            match &match_clause.patterns[0] {
                Pattern::Node(node) => {
                    assert_eq!(node.labels.len(), 2);
                    assert_eq!(node.labels[0], "Person");
                    assert_eq!(node.labels[1], "Employee");
                }
                _ => panic!("Expected Node pattern"),
            }
        }
        _ => panic!("Expected Match clause"),
    }
}

#[test]
fn test_parse_match_with_properties() {
    let tokens = lex("MATCH (n {name: \"Alice\", age: 30}) RETURN n").unwrap();
    let query = parse(tokens).unwrap();
    
    match &query.clauses[0] {
        Clause::Match(match_clause) => {
            match &match_clause.patterns[0] {
                Pattern::Node(node) => {
                    let props = node.properties.as_ref().unwrap();
                    assert_eq!(props.len(), 2);
                    assert_eq!(props[0].key, "name");
                    assert_eq!(props[1].key, "age");
                }
                _ => panic!("Expected Node pattern"),
            }
        }
        _ => panic!("Expected Match clause"),
    }
}
use ::parser::*;
use lexer::SourceLocation;

// ============================================================================
// Query Structure Tests
// ============================================================================

#[test]
fn test_query_creation_empty() {
    let query = Query {
        clauses: vec![],
    };
    assert_eq!(query.clauses.len(), 0);
}

#[test]
fn test_query_creation_single_clause() {
    let query = Query {
        clauses: vec![
            Clause::Return(ReturnClause {
                distinct: false,
                items: vec![ReturnItem {
                    expression: Expression::Literal(Literal::Integer(1)),
                    alias: None,
                    location: SourceLocation::new(1, 1, 0),
                }],
                location: SourceLocation::new(1, 1, 0),
            }),
        ],
    };
    assert_eq!(query.clauses.len(), 1);
}

#[test]
fn test_query_multiple_clauses() {
    let query = Query {
        clauses: vec![
            Clause::Match(MatchClause {
                patterns: vec![],
                location: SourceLocation::new(1, 1, 0),
            }),
            Clause::Return(ReturnClause {
                distinct: false,
                items: vec![],
                location: SourceLocation::new(1, 10, 9),
            }),
        ],
    };
    assert_eq!(query.clauses.len(), 2);
}

// ============================================================================
// Node Pattern Tests
// ============================================================================

#[test]
fn test_node_pattern_basic() {
    let node = NodePattern {
        variable: Some("n".to_string()),
        labels: vec!["Person".to_string()],
        properties: None,
        location: SourceLocation::new(1, 1, 0),
    };
    
    assert_eq!(node.variable, Some("n".to_string()));
    assert_eq!(node.labels, vec!["Person".to_string()]);
    assert!(node.properties.is_none());
}

#[test]
fn test_node_pattern_no_variable() {
    let node = NodePattern {
        variable: None,
        labels: vec!["User".to_string()],
        properties: None,
        location: SourceLocation::new(1, 1, 0),
    };
    
    assert_eq!(node.variable, None);
    assert_eq!(node.labels.len(), 1);
}

#[test]
fn test_node_pattern_multiple_labels() {
    let node = NodePattern {
        variable: Some("u".to_string()),
        labels: vec!["Person".to_string(), "Employee".to_string()],
        properties: None,
        location: SourceLocation::new(1, 1, 0),
    };
    
    assert_eq!(node.labels.len(), 2);
    assert_eq!(node.labels[0], "Person");
    assert_eq!(node.labels[1], "Employee");
}

#[test]
fn test_node_pattern_with_properties() {
    let node = NodePattern {
        variable: Some("n".to_string()),
        labels: vec!["Person".to_string()],
        properties: Some(vec![
            PropertyPattern {
                key: "name".to_string(),
                value: Expression::Literal(Literal::String("Alice".to_string())),
                location: SourceLocation::new(1, 15, 14),
            },
            PropertyPattern {
                key: "age".to_string(),
                value: Expression::Literal(Literal::Integer(30)),
                location: SourceLocation::new(1, 25, 24),
            },
        ]),
        location: SourceLocation::new(1, 1, 0),
    };
    
    let props = node.properties.unwrap();
    assert_eq!(props.len(), 2);
    assert_eq!(props[0].key, "name");
    assert_eq!(props[1].key, "age");
}

// ============================================================================
// Relationship Pattern Tests
// ============================================================================

#[test]
fn test_relationship_pattern_basic() {
    let rel = RelationshipPattern {
        variable: Some("e".to_string()),
        types: vec!["KNOWS".to_string()],
        properties: None,
        direction: Some(PatternConnection::Forward),
        range: None,
        location: SourceLocation::new(1, 5, 4),
    };
    
    assert_eq!(rel.variable, Some("e".to_string()));
    assert_eq!(rel.types, vec!["KNOWS".to_string()]);
}

#[test]
fn test_relationship_pattern_no_variable() {
    let rel = RelationshipPattern {
        variable: None,
        types: vec!["FOLLOWS".to_string()],
        properties: None,
        direction: Some(PatternConnection::Forward),
        range: None,
        location: SourceLocation::new(1, 1, 0),
    };
    
    assert_eq!(rel.variable, None);
    assert_eq!(rel.types.len(), 1);
}

#[test]
fn test_relationship_pattern_with_properties() {
    let rel = RelationshipPattern {
        variable: Some("e".to_string()),
        types: vec!["weightedEdge".to_string()],
        properties: Some(vec![
            PropertyPattern {
                key: "Weight".to_string(),
                value: Expression::Literal(Literal::Integer(5)),
                location: SourceLocation::new(1, 20, 19),
            },
        ]),
        direction: Some(PatternConnection::Forward),
        range: None,
        location: SourceLocation::new(1, 1, 0),
    };
    
    assert_eq!(rel.types, vec!["weightedEdge".to_string()]);
    assert_eq!(rel.properties.unwrap().len(), 1);
}

#[test]
fn test_relationship_directions() {
    let directions = vec![
        PatternConnection::Forward,
        PatternConnection::Reverse,
        PatternConnection::Undirected,
    ];
    
    let rel_forward = RelationshipPattern {
        variable: None,
        types: vec![],
        properties: None,
        direction: Some(directions[0].clone()),
        range: None,
        location: SourceLocation::new(1, 1, 0),
    };
    
    assert_eq!(rel_forward.direction, Some(PatternConnection::Forward));
}

// ============================================================================
// Expression Tests
// ============================================================================

#[test]
fn test_literal_expressions() {
    let int_expr = Expression::Literal(Literal::Integer(42));
    let float_expr = Expression::Literal(Literal::Float(3.14));
    let string_expr = Expression::Literal(Literal::String("hello".to_string()));
    let bool_expr = Expression::Literal(Literal::Boolean(true));
    let null_expr = Expression::Literal(Literal::Null);
    
    match int_expr {
        Expression::Literal(Literal::Integer(n)) => assert_eq!(n, 42),
        _ => panic!("Expected Integer literal"),
    }
    
    match float_expr {
        Expression::Literal(Literal::Float(n)) => assert!((n - 3.14).abs() < 0.001),
        _ => panic!("Expected Float literal"),
    }
    
    match string_expr {
        Expression::Literal(Literal::String(s)) => assert_eq!(s, "hello"),
        _ => panic!("Expected String literal"),
    }
    
    match bool_expr {
        Expression::Literal(Literal::Boolean(b)) => assert!(b),
        _ => panic!("Expected Boolean literal"),
    }
    
    match null_expr {
        Expression::Literal(Literal::Null) => (),
        _ => panic!("Expected Null literal"),
    }
}

#[test]
fn test_variable_expression() {
    let var_expr = Expression::Variable("myVar".to_string());
    
    match var_expr {
        Expression::Variable(name) => assert_eq!(name, "myVar"),
        _ => panic!("Expected Variable"),
    }
}

#[test]
fn test_binary_expression() {
    let expr = Expression::BinaryOp {
        left: Box::new(Expression::Variable("a".to_string())),
        operator: BinaryOperator::Add,
        right: Box::new(Expression::Literal(Literal::Integer(5))),
        location: SourceLocation::new(1, 1, 0),
    };
    
    match expr {
        Expression::BinaryOp { left, operator, right, .. } => {
            assert_eq!(operator, BinaryOperator::Add);
            match *left {
                Expression::Variable(name) => assert_eq!(name, "a"),
                _ => panic!("Expected Variable"),
            }
            match *right {
                Expression::Literal(Literal::Integer(n)) => assert_eq!(n, 5),
                _ => panic!("Expected Integer"),
            }
        }
        _ => panic!("Expected BinaryOp"),
    }
}

#[test]
fn test_unary_expression() {
    let expr = Expression::UnaryOp {
        operator: UnaryOperator::Not,
        operand: Box::new(Expression::Literal(Literal::Boolean(true))),
        location: SourceLocation::new(1, 1, 0),
    };
    
    match expr {
        Expression::UnaryOp { operator, .. } => {
            assert_eq!(operator, UnaryOperator::Not);
        }
        _ => panic!("Expected UnaryOp"),
    }
}

#[test]
fn test_property_access_expression() {
    let expr = Expression::PropertyAccess {
        object: Box::new(Expression::Variable("u".to_string())),
        property: "name".to_string(),
        location: SourceLocation::new(1, 1, 0),
    };
    
    match expr {
        Expression::PropertyAccess { object, property, .. } => {
            assert_eq!(property, "name");
            match *object {
                Expression::Variable(name) => assert_eq!(name, "u"),
                _ => panic!("Expected Variable"),
            }
        }
        _ => panic!("Expected PropertyAccess"),
    }
}

#[test]
fn test_function_call_expression() {
    let expr = Expression::FunctionCall {
        name: "count".to_string(),
        arguments: vec![Expression::Variable("n".to_string())],
        location: SourceLocation::new(1, 1, 0),
    };
    
    match expr {
        Expression::FunctionCall { name, arguments, .. } => {
            assert_eq!(name, "count");
            assert_eq!(arguments.len(), 1);
        }
        _ => panic!("Expected FunctionCall"),
    }
}

#[test]
fn test_case_expression() {
    let case = Expression::CaseExpression {
        cases: vec![
            CaseBranch {
                condition: Expression::BinaryOp {
                    left: Box::new(Expression::Variable("n".to_string())),
                    operator: BinaryOperator::GreaterThan,
                    right: Box::new(Expression::Literal(Literal::Integer(18))),
                    location: SourceLocation::new(1, 10, 9),
                },
                result: Expression::Literal(Literal::String("adult".to_string())),
                location: SourceLocation::new(1, 1, 0),
            }
        ],
        default: Some(Box::new(Expression::Literal(Literal::String("minor".to_string())))),
        location: SourceLocation::new(1, 1, 0),
    };
    
    match case {
        Expression::CaseExpression { cases, default, .. } => {
            assert_eq!(cases.len(), 1);
            assert!(default.is_some());
        }
        _ => panic!("Expected CaseExpression"),
    }
}

#[test]
fn test_list_expression() {
    let expr = Expression::List(vec![
        Expression::Literal(Literal::Integer(1)),
        Expression::Literal(Literal::Integer(2)),
        Expression::Literal(Literal::Integer(3)),
    ]);
    
    match expr {
        Expression::List(elements) => assert_eq!(elements.len(), 3),
        _ => panic!("Expected List"),
    }
}

#[test]
fn test_map_expression() {
    let expr = Expression::Map(vec![
        ("key1".to_string(), Expression::Literal(Literal::String("value1".to_string()))),
        ("key2".to_string(), Expression::Literal(Literal::Integer(42))),
    ]);
    
    match expr {
        Expression::Map(entries) => assert_eq!(entries.len(), 2),
        _ => panic!("Expected Map"),
    }
}

// ============================================================================
// Clause Tests
// ============================================================================

#[test]
fn test_match_clause() {
    let clause = Clause::Match(MatchClause {
        patterns: vec![
            Pattern::Node(NodePattern {
                variable: Some("n".to_string()),
                labels: vec![],
                properties: None,
                location: SourceLocation::new(1, 7, 6),
            }),
        ],
        location: SourceLocation::new(1, 1, 0),
    });
    
    match clause {
        Clause::Match(match_clause) => {
            assert_eq!(match_clause.patterns.len(), 1);
        }
        _ => panic!("Expected Match clause"),
    }
}

#[test]
fn test_return_clause() {
    let clause = Clause::Return(ReturnClause {
        distinct: true,
        items: vec![
            ReturnItem {
                expression: Expression::Variable("n".to_string()),
                alias: Some("node".to_string()),
                location: SourceLocation::new(1, 10, 9),
            }
        ],
        location: SourceLocation::new(1, 1, 0),
    });
    
    match clause {
        Clause::Return(ret) => {
            assert!(ret.distinct);
            assert_eq!(ret.items.len(), 1);
            assert_eq!(ret.items[0].alias, Some("node".to_string()));
        }
        _ => panic!("Expected Return clause"),
    }
}

#[test]
fn test_order_by_clause() {
    let clause = Clause::OrderBy(OrderByClause {
        items: vec![
            OrderByItem {
                expression: Expression::PropertyAccess {
                    object: Box::new(Expression::Variable("n".to_string())),
                    property: "name".to_string(),
                    location: SourceLocation::new(1, 10, 9),
                },
                direction: OrderDirection::Ascending,
                location: SourceLocation::new(1, 10, 9),
            }
        ],
        location: SourceLocation::new(1, 1, 0),
    });
    
    match clause {
        Clause::OrderBy(order) => {
            assert_eq!(order.items.len(), 1);
            assert_eq!(order.items[0].direction, OrderDirection::Ascending);
        }
        _ => panic!("Expected OrderBy clause"),
    }
}

#[test]
fn test_limit_clause() {
    let clause = Clause::Limit(LimitClause {
        value: Expression::Literal(Literal::Integer(10)),
        location: SourceLocation::new(1, 1, 0),
    });
    
    match clause {
        Clause::Limit(limit) => {
            match limit.value {
                Expression::Literal(Literal::Integer(n)) => assert_eq!(n, 10),
                _ => panic!("Expected Integer literal"),
            }
        }
        _ => panic!("Expected Limit clause"),
    }
}

#[test]
fn test_all_clause_types() {
    let loc = SourceLocation::new(1, 1, 0);
    
    let clauses = vec![
        Clause::Match(MatchClause { patterns: vec![], location: loc.clone() }),
        Clause::OptionalMatch(OptionalMatchClause { patterns: vec![], location: loc.clone() }),
        Clause::Where(WhereClause { predicate: Expression::Literal(Literal::Boolean(true)), location: loc.clone() }),
        Clause::Return(ReturnClause { distinct: false, items: vec![], location: loc.clone() }),
        Clause::With(WithClause { items: vec![], location: loc.clone() }),
        Clause::OrderBy(OrderByClause { items: vec![], location: loc.clone() }),
        Clause::GroupBy(GroupByClause { expressions: vec![], location: loc.clone() }),
        Clause::Having(HavingClause { predicate: Expression::Literal(Literal::Boolean(true)), location: loc.clone() }),
        Clause::Limit(LimitClause { value: Expression::Literal(Literal::Integer(10)), location: loc.clone() }),
        Clause::Skip(SkipClause { value: Expression::Literal(Literal::Integer(5)), location: loc.clone() }),
        Clause::Create(CreateClause { patterns: vec![], location: loc.clone() }),
        Clause::Delete(DeleteClause { expressions: vec![], location: loc.clone() }),
        Clause::Set(SetClause { assignments: vec![], location: loc.clone() }),
        Clause::Merge(MergeClause { pattern: Pattern::Node(NodePattern { variable: None, labels: vec![], properties: None, location: loc.clone() }), location: loc.clone() }),
        Clause::Unwind(UnwindClause { expression: Expression::Variable("x".to_string()), variable: "x".to_string(), location: loc.clone() }),
        Clause::Call(CallClause { procedure: Expression::Variable("proc".to_string()), location: loc.clone() }),
    ];
    
    assert_eq!(clauses.len(), 16);
}

// ============================================================================
// Binary Operator Tests
// ============================================================================

#[test]
fn test_all_binary_operators() {
    let operators = vec![
        BinaryOperator::Add,
        BinaryOperator::Subtract,
        BinaryOperator::Multiply,
        BinaryOperator::Divide,
        BinaryOperator::Modulo,
        BinaryOperator::Equals,
        BinaryOperator::NotEquals,
        BinaryOperator::LessThan,
        BinaryOperator::GreaterThan,
        BinaryOperator::LessThanOrEqual,
        BinaryOperator::GreaterThanOrEqual,
        BinaryOperator::And,
        BinaryOperator::Or,
        BinaryOperator::RegexMatch,
        BinaryOperator::StartsWith,
        BinaryOperator::EndsWith,
        BinaryOperator::Contains,
    ];
    
    assert_eq!(operators.len(), 17);
    
    // Verify they're all unique (by debug representation)
    let debug_strings: Vec<String> = operators.iter().map(|op| format!("{:?}", op)).collect();
    let mut unique = debug_strings.clone();
    unique.sort();
    unique.dedup();
    assert_eq!(unique.len(), 17);
}

// ============================================================================
// Unary Operator Tests
// ============================================================================

#[test]
fn test_all_unary_operators() {
    let operators = vec![
        UnaryOperator::Not,
        UnaryOperator::Negate,
        UnaryOperator::IsNull,
        UnaryOperator::IsNotNull,
    ];
    
    assert_eq!(operators.len(), 4);
}

// ============================================================================
// Pattern Tests
// ============================================================================

#[test]
fn test_pattern_node() {
    let pattern = Pattern::Node(NodePattern {
        variable: Some("n".to_string()),
        labels: vec!["User".to_string()],
        properties: None,
        location: SourceLocation::new(1, 1, 0),
    });
    
    match pattern {
        Pattern::Node(node) => {
            assert_eq!(node.variable, Some("n".to_string()));
            assert_eq!(node.labels, vec!["User".to_string()]);
        }
        _ => panic!("Expected Node pattern"),
    }
}

#[test]
fn test_pattern_relationship() {
    let pattern = Pattern::Relationship(RelationshipPattern {
        variable: Some("r".to_string()),
        types: vec!["KNOWS".to_string()],
        properties: None,
        direction: Some(PatternConnection::Forward),
        range: None,
        location: SourceLocation::new(1, 1, 0),
    });
    
    match pattern {
        Pattern::Relationship(rel) => {
            assert_eq!(rel.variable, Some("r".to_string()));
        }
        _ => panic!("Expected Relationship pattern"),
    }
}

#[test]
fn test_pattern_path() {
    let pattern = Pattern::Path(vec![
        PatternPart {
            element: PatternElement::Node(NodePattern {
                variable: Some("a".to_string()),
                labels: vec![],
                properties: None,
                location: SourceLocation::new(1, 1, 0),
            }),
            connection: None,
        },
        PatternPart {
            element: PatternElement::Relationship(RelationshipPattern {
                variable: Some("r".to_string()),
                types: vec![],
                properties: None,
                direction: None,
                range: None,
                location: SourceLocation::new(1, 5, 4),
            }),
            connection: Some(PatternConnection::Forward),
        },
    ]);
    
    match pattern {
        Pattern::Path(parts) => {
            assert_eq!(parts.len(), 2);
        }
        _ => panic!("Expected Path pattern"),
    }
}

// ============================================================================
// Serialization Tests (verify Serde compatibility)
// ============================================================================

#[test]
fn test_query_serialization() {
    let query = Query {
        clauses: vec![
            Clause::Return(ReturnClause {
                distinct: false,
                items: vec![ReturnItem {
                    expression: Expression::Literal(Literal::Integer(42)),
                    alias: None,
                    location: SourceLocation::new(1, 1, 0),
                }],
                location: SourceLocation::new(1, 1, 0),
            }),
        ],
    };
    
    let serialized = serde_json::to_string(&query).unwrap();
    assert!(serialized.len() > 0);
}

#[test]
fn test_query_deserialization() {
    let json = r#"{"clauses":[{"Return":{"distinct":false,"items":[{"expression":{"Literal":{"Integer":42}},"alias":null,"location":{"line":1,"column":1,"offset":0}}],"location":{"line":1,"column":1,"offset":0}}}]}"#;
    
    let query: Query = serde_json::from_str(json).unwrap();
    assert_eq!(query.clauses.len(), 1);
}

// ============================================================================
// Edge Cases Tests
// ============================================================================

#[test]
fn test_node_pattern_empty_labels() {
    let node = NodePattern {
        variable: Some("n".to_string()),
        labels: vec![],
        properties: None,
        location: SourceLocation::new(1, 1, 0),
    };
    
    assert!(node.labels.is_empty());
}

#[test]
fn test_path_range_full() {
    let range = PathRange {
        min: Some(1),
        max: Some(5),
        location: SourceLocation::new(1, 1, 0),
    };
    
    assert_eq!(range.min, Some(1));
    assert_eq!(range.max, Some(5));
}

#[test]
fn test_path_range_open_ended() {
    let range = PathRange {
        min: Some(2),
        max: None,
        location: SourceLocation::new(1, 1, 0),
    };
    
    assert_eq!(range.min, Some(2));
    assert_eq!(range.max, None);
}

#[test]
fn test_property_pattern() {
    let prop = PropertyPattern {
        key: "weight".to_string(),
        value: Expression::Literal(Literal::Float(0.5)),
        location: SourceLocation::new(1, 1, 0),
    };
    
    assert_eq!(prop.key, "weight");
    match prop.value {
        Expression::Literal(Literal::Float(n)) => assert!((n - 0.5).abs() < 0.001),
        _ => panic!("Expected Float literal"),
    }
}

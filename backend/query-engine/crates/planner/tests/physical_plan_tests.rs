use planner::logical::*;
use planner::physical::*;
use parser::ast::*;
use lexer::SourceLocation;

// ============================================================================
// Physical Plan Conversion Tests
// ============================================================================

#[test]
fn test_physical_from_node_scan() {
    let logical = LogicalPlan::NodeScan(NodeScan {
        variable: "n".to_string(),
        label: Some("User".to_string()),
    });
    
    let physical = PhysicalPlan::from_logical(&logical);
    match physical {
        PhysicalPlan::TableScan(scan) => {
            assert_eq!(scan.table, "User");
        }
        _ => panic!("Expected TableScan"),
    }
}

#[test]
fn test_physical_from_node_scan_no_label() {
    let logical = LogicalPlan::NodeScan(NodeScan {
        variable: "n".to_string(),
        label: None,
    });
    
    let physical = PhysicalPlan::from_logical(&logical);
    match physical {
        PhysicalPlan::TableScan(scan) => {
            assert_eq!(scan.table, "nodes");
        }
        _ => panic!("Expected TableScan"),
    }
}

#[test]
fn test_physical_from_filter() {
    let logical = LogicalPlan::Filter(Filter {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        predicate: Expression::BinaryOp {
            left: Box::new(Expression::Variable("n".to_string())),
            operator: BinaryOperator::GreaterThan,
            right: Box::new(Expression::Literal(Literal::Integer(18))),
            location: SourceLocation::new(1, 1, 0),
        },
        selectivity: 0.1,
    });
    
    let physical = PhysicalPlan::from_logical(&logical);
    assert!(matches!(physical, PhysicalPlan::FilterExec(_)));
}

#[test]
fn test_physical_from_project() {
    let logical = LogicalPlan::Project(Project {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        expressions: vec![
            ProjectExpression {
                expression: Expression::Variable("n".to_string()),
                alias: Some("node".to_string()),
            }
        ],
    });
    
    let physical = PhysicalPlan::from_logical(&logical);
    match physical {
        PhysicalPlan::ProjectExec(proj) => {
            assert_eq!(proj.columns.len(), 1);
        }
        _ => panic!("Expected ProjectExec"),
    }
}

#[test]
fn test_physical_from_sort() {
    let logical = LogicalPlan::Sort(Sort {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        order_by: vec![SortExpression {
            expression: Expression::Variable("name".to_string()),
            ascending: false,
        }],
    });
    
    let physical = PhysicalPlan::from_logical(&logical);
    assert!(matches!(physical, PhysicalPlan::SortExec(_)));
}

#[test]
fn test_physical_from_limit() {
    let logical = LogicalPlan::Limit(Limit {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        count: 10,
    });
    
    let physical = PhysicalPlan::from_logical(&logical);
    match physical {
        PhysicalPlan::LimitExec(limit) => {
            assert_eq!(limit.limit, 10);
        }
        _ => panic!("Expected LimitExec"),
    }
}

#[test]
fn test_physical_from_skip() {
    let logical = LogicalPlan::Skip(Skip {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        count: 20,
    });
    
    let physical = PhysicalPlan::from_logical(&logical);
    match physical {
        PhysicalPlan::SkipExec(skip) => {
            assert_eq!(skip.count, 20);
        }
        _ => panic!("Expected SkipExec, got {:?}", physical),
    }
}

#[test]
fn test_physical_from_aggregate() {
    let logical = LogicalPlan::Aggregate(Aggregate {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "u".to_string(),
            label: Some("User".to_string()),
        })),
        group_by: vec![Expression::Variable("role".to_string())],
        aggregations: vec![
            AggregationExpression {
                function: "COUNT".to_string(),
                expression: Expression::Variable("u".to_string()),
                alias: Some("cnt".to_string()),
            }
        ],
    });
    
    let physical = PhysicalPlan::from_logical(&logical);
    match physical {
        PhysicalPlan::AggregateExec(agg) => {
            assert!(!agg.group_keys.is_empty());
            assert!(!agg.aggregations.is_empty());
        }
        _ => panic!("Expected AggregateExec, got {:?}", physical),
    }
}

#[test]
fn test_physical_from_expand() {
    let rel = RelationshipPattern {
        variable: Some("e".to_string()),
        types: vec!["weightedEdge".to_string()],
        properties: None,
        direction: Some(PatternConnection::Forward),
        range: Some(PathRange {
            min: Some(1),
            max: Some(3),
            location: SourceLocation::new(1, 1, 0),
        }),
        location: SourceLocation::new(1, 1, 0),
    };
    
    let logical = LogicalPlan::Expand(Expand {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "a".to_string(),
            label: Some("User".to_string()),
        })),
        relationship: rel,
        direction: ExpandDirection::Outgoing,
    });
    
    let physical = PhysicalPlan::from_logical(&logical);
    match physical {
        PhysicalPlan::ExpandExec(expand) => {
            assert_eq!(expand.relationship_type, "weightedEdge");
            assert!(expand.range.is_some());
        }
        _ => panic!("Expected ExpandExec, got {:?}", physical),
    }
}

#[test]
fn test_physical_from_join() {
    let logical = LogicalPlan::Join(Join {
        left: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "a".to_string(),
            label: Some("User".to_string()),
        })),
        right: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "b".to_string(),
            label: None,
        })),
        join_type: JoinType::Inner,
        condition: None,
    });
    
    let physical = PhysicalPlan::from_logical(&logical);
    assert!(matches!(physical, PhysicalPlan::HashJoin(_)));
}

// ============================================================================
// SerializablePathRange Tests
// ============================================================================

#[test]
fn test_serializable_path_range() {
    let range = SerializablePathRange {
        min: Some(1),
        max: Some(5),
    };
    
    let json = serde_json::to_string(&range).unwrap();
    let deserialized: SerializablePathRange = serde_json::from_str(&json).unwrap();
    
    assert_eq!(deserialized.min, Some(1));
    assert_eq!(deserialized.max, Some(5));
}

// ============================================================================
// Deep Nesting Tests
// ============================================================================

#[test]
fn test_deeply_nested_physical_plan() {
    // Build: Project -> Filter -> Sort -> Limit -> NodeScan
    let logical = LogicalPlan::Project(Project {
        input: Box::new(LogicalPlan::Filter(Filter {
            input: Box::new(LogicalPlan::Sort(Sort {
                input: Box::new(LogicalPlan::Limit(Limit {
                    input: Box::new(LogicalPlan::NodeScan(NodeScan {
                        variable: "n".to_string(),
                        label: Some("User".to_string()),
                    })),
                    count: 100,
                })),
                order_by: vec![SortExpression {
                    expression: Expression::Variable("n.name".to_string()),
                    ascending: true,
                }],
            })),
            predicate: Expression::Literal(Literal::Boolean(true)),
            selectivity: 0.5,
        })),
        expressions: vec![ProjectExpression {
            expression: Expression::Variable("n".to_string()),
            alias: None,
        }],
    });
    
    let physical = PhysicalPlan::from_logical(&logical);
    // Should be ProjectExec wrapping the nested structure
    assert!(matches!(physical, PhysicalPlan::ProjectExec(_)));
}

// ============================================================================
// Physical Plan Serialization Tests
// ============================================================================

#[test]
fn test_physical_plan_serialization() {
    let physical = PhysicalPlan::TableScan(TableScanExec {
        table: "nodes".to_string(),
        estimated_rows: 1000,
    });
    
    let json = serde_json::to_string(&physical).unwrap();
    assert!(json.contains("TableScan"));
    assert!(json.contains("nodes"));
}

#[test]
fn test_physical_plan_deserialization() {
    let json = r#"{"TableScan":{"table":"User","estimated_rows":500}}"#;
    let plan: PhysicalPlan = serde_json::from_str(json).unwrap();
    
    match plan {
        PhysicalPlan::TableScan(scan) => {
            assert_eq!(scan.table, "User");
            assert_eq!(scan.estimated_rows, 500);
        }
        _ => panic!("Expected TableScan"),
    }
}

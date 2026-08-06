use planner::logical::*;
use parser::ast::*;
use lexer::SourceLocation;

// ============================================================================
// NodeScan Tests
// ============================================================================

#[test]
fn test_node_scan_creation() {
    let scan = NodeScan {
        variable: "n".to_string(),
        label: Some("Person".to_string()),
    };
    
    assert_eq!(scan.variable, "n");
    assert_eq!(scan.label, Some("Person".to_string()));
}

#[test]
fn test_node_scan_no_label() {
    let scan = NodeScan {
        variable: "x".to_string(),
        label: None,
    };
    
    assert_eq!(scan.label, None);
}

#[test]
fn test_node_scan_estimated_rows_with_label() {
    let plan = LogicalPlan::NodeScan(NodeScan {
        variable: "n".to_string(),
        label: Some("User".to_string()),
    });
    
    assert_eq!(plan.estimated_rows(), 1000);
}

#[test]
fn test_node_scan_estimated_rows_without_label() {
    let plan = LogicalPlan::NodeScan(NodeScan {
        variable: "n".to_string(),
        label: None,
    });
    
    assert_eq!(plan.estimated_rows(), 10000);
}

#[test]
fn test_node_scan_estimated_cost() {
    let plan = LogicalPlan::NodeScan(NodeScan {
        variable: "n".to_string(),
        label: None,
    });
    
    assert_eq!(plan.estimated_cost(), 10.0);
}

// ============================================================================
// Filter Tests
// ============================================================================

#[test]
fn test_filter_creation() {
    let filter = Filter {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        predicate: Expression::Literal(Literal::Boolean(true)),
        selectivity: 0.5,
    };
    
    assert_eq!(filter.selectivity, 0.5);
}

#[test]
fn test_filter_estimated_rows() {
    let plan = LogicalPlan::Filter(Filter {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        predicate: Expression::Literal(Literal::Boolean(true)),
        selectivity: 0.1,
    });
    
    let rows = plan.estimated_rows();
    assert_eq!(rows, 1000); // 10000 * 0.1
}

#[test]
fn test_filter_estimated_cost() {
    let plan = LogicalPlan::Filter(Filter {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        predicate: Expression::Literal(Literal::Boolean(true)),
        selectivity: 0.1,
    });
    
    assert!(plan.estimated_cost() > 10.0);
}

// ============================================================================
// Project Tests
// ============================================================================

#[test]
fn test_project_creation() {
    let project = Project {
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
    };
    
    assert_eq!(project.expressions.len(), 1);
    assert_eq!(project.expressions[0].alias, Some("node".to_string()));
}

#[test]
fn test_project_estimated_rows() {
    let plan = LogicalPlan::Project(Project {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: Some("User".to_string()),
        })),
        expressions: vec![],
    });
    
    assert_eq!(plan.estimated_rows(), 1000);
}

// ============================================================================
// Join Tests
// ============================================================================

#[test]
fn test_join_inner() {
    let plan = LogicalPlan::Join(Join {
        left: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "a".to_string(),
            label: Some("User".to_string()),
        })),
        right: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "b".to_string(),
            label: Some("User".to_string()),
        })),
        join_type: JoinType::Inner,
        condition: None,
    });
    
    let rows = plan.estimated_rows();
    assert_eq!(rows, 1000); // min(1000, 1000)
}

#[test]
fn test_join_cross() {
    let plan = LogicalPlan::Join(Join {
        left: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "a".to_string(),
            label: Some("User".to_string()),
        })),
        right: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "b".to_string(),
            label: None,
        })),
        join_type: JoinType::Cross,
        condition: None,
    });
    
    let rows = plan.estimated_rows();
    assert_eq!(rows, 10_000_000); // 1000 * 10000
}

#[test]
fn test_join_left_outer() {
    let plan = LogicalPlan::Join(Join {
        left: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "a".to_string(),
            label: Some("User".to_string()),
        })),
        right: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "b".to_string(),
            label: None,
        })),
        join_type: JoinType::LeftOuter,
        condition: None,
    });
    
    let rows = plan.estimated_rows();
    assert_eq!(rows, 1000); // left rows
}

// ============================================================================
// Aggregate Tests
// ============================================================================

#[test]
fn test_aggregate_creation() {
    let agg = Aggregate {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "u".to_string(),
            label: Some("User".to_string()),
        })),
        group_by: vec![Expression::Variable("role".to_string())],
        aggregations: vec![
            AggregationExpression {
                function: "COUNT".to_string(),
                expression: Expression::Variable("u".to_string()),
                alias: Some("count".to_string()),
            }
        ],
    };
    
    assert_eq!(agg.group_by.len(), 1);
    assert_eq!(agg.aggregations.len(), 1);
}

#[test]
fn test_aggregate_estimated_rows() {
    let plan = LogicalPlan::Aggregate(Aggregate {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "u".to_string(),
            label: Some("User".to_string()),
        })),
        group_by: vec![Expression::Variable("role".to_string())],
        aggregations: vec![],
    });
    
    let rows = plan.estimated_rows();
    assert!(rows > 0);
}

// ============================================================================
// Sort Tests
// ============================================================================

#[test]
fn test_sort_creation() {
    let sort = Sort {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        order_by: vec![
            SortExpression {
                expression: Expression::Variable("name".to_string()),
                ascending: true,
            }
        ],
    };
    
    assert_eq!(sort.order_by.len(), 1);
    assert!(sort.order_by[0].ascending);
}

#[test]
fn test_sort_estimated_cost() {
    let plan = LogicalPlan::Sort(Sort {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        order_by: vec![SortExpression {
            expression: Expression::Variable("n".to_string()),
            ascending: true,
        }],
    });
    
    let cost = plan.estimated_cost();
    assert!(cost > 10.0); // Should be more than just NodeScan
}

// ============================================================================
// Limit/Skip Tests
// ============================================================================

#[test]
fn test_limit_creation() {
    let plan = LogicalPlan::Limit(Limit {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        count: 10,
    });
    
    let rows = plan.estimated_rows();
    assert_eq!(rows, 10);
}

#[test]
fn test_skip_creation() {
    let plan = LogicalPlan::Skip(Skip {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: Some("User".to_string()),
        })),
        count: 5,
    });
    
    let rows = plan.estimated_rows();
    assert_eq!(rows, 995); // 1000 - 5
}

// ============================================================================
// Expand Tests
// ============================================================================

#[test]
fn test_expand_creation() {
    let rel = RelationshipPattern {
        variable: Some("e".to_string()),
        types: vec!["KNOWS".to_string()],
        properties: None,
        direction: Some(PatternConnection::Forward),
        range: None,
        location: SourceLocation::new(1, 1, 0),
    };
    
    let expand = Expand {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "a".to_string(),
            label: Some("Person".to_string()),
        })),
        relationship: rel,
        direction: ExpandDirection::Outgoing,
    };
    
    assert_eq!(expand.relationship.types[0], "KNOWS");
}

#[test]
fn test_expand_estimated_rows() {
    let rel = RelationshipPattern {
        variable: None,
        types: vec![],
        properties: None,
        direction: None,
        range: None,
        location: SourceLocation::new(1, 1, 0),
    };
    
    let plan = LogicalPlan::Expand(Expand {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "a".to_string(),
            label: Some("Person".to_string()),
        })),
        relationship: rel,
        direction: ExpandDirection::Both,
    });
    
    let rows = plan.estimated_rows();
    assert_eq!(rows, 5000); // 1000 * 5
}

// ============================================================================
// Distinct Tests
// ============================================================================

#[test]
fn test_distinct_estimated_rows() {
    let plan = LogicalPlan::Distinct(Distinct {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
    });
    
    let rows = plan.estimated_rows();
    assert_eq!(rows, 5000); // 10000 / 2
}

// ============================================================================
// Complex Plan Tests
// ============================================================================

#[test]
fn test_complex_plan_estimated_cost() {
    // Build: Project -> Filter -> Sort -> Limit -> NodeScan
    let plan = LogicalPlan::Project(Project {
        input: Box::new(LogicalPlan::Filter(Filter {
            input: Box::new(LogicalPlan::Sort(Sort {
                input: Box::new(LogicalPlan::Limit(Limit {
                    input: Box::new(LogicalPlan::NodeScan(NodeScan {
                        variable: "n".to_string(),
                        label: Some("User".to_string()),
                    })),
                    count: 100,
                })),
                order_by: vec![],
            })),
            predicate: Expression::Literal(Literal::Boolean(true)),
            selectivity: 0.5,
        })),
        expressions: vec![],
    });
    
    let cost = plan.estimated_cost();
    assert!(cost > 0.0);
    
    let rows = plan.estimated_rows();
    assert_eq!(rows, 50); // 1000 -> limit 100 -> filter 0.5 = 50
}

// ============================================================================
// Serialization Tests
// ============================================================================

#[test]
fn test_logical_plan_serialization() {
    let plan = LogicalPlan::NodeScan(NodeScan {
        variable: "n".to_string(),
        label: Some("User".to_string()),
    });
    
    let json = serde_json::to_string(&plan).unwrap();
    assert!(json.len() > 0);
}

#[test]
fn test_logical_plan_deserialization() {
    let json = r#"{"NodeScan":{"variable":"n","label":"User"}}"#;
    let plan: LogicalPlan = serde_json::from_str(json).unwrap();
    
    match plan {
        LogicalPlan::NodeScan(scan) => {
            assert_eq!(scan.variable, "n");
            assert_eq!(scan.label, Some("User".to_string()));
        }
        _ => panic!("Expected NodeScan"),
    }
}

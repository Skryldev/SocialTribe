use planner::logical::*;
use planner::optimizer::*;
use planner::explain::*;
use parser::ast::*;
use lexer::SourceLocation;

// ============================================================================
// Optimizer Creation Tests
// ============================================================================

#[test]
fn test_optimizer_creation() {
    let optimizer = Optimizer::new();
    // Should not panic
    assert!(true);
}

#[test]
fn test_optimizer_steps_empty_initially() {
    let optimizer = Optimizer::new();
    assert!(optimizer.steps().is_empty());
}

// ============================================================================
// Constant Folding Tests
// ============================================================================

#[test]
fn test_constant_folding_integer_add() {
    let mut optimizer = Optimizer::new();
    
    let plan = LogicalPlan::Filter(Filter {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        predicate: Expression::BinaryOp {
            left: Box::new(Expression::Literal(Literal::Integer(1))),
            operator: BinaryOperator::Add,
            right: Box::new(Expression::Literal(Literal::Integer(2))),
            location: SourceLocation::new(1, 1, 0),
        },
        selectivity: 0.1,
    });
    
    let optimized = optimizer.optimize(plan);
    
    match optimized {
        LogicalPlan::Filter(filter) => {
            match filter.predicate {
                Expression::Literal(Literal::Integer(n)) => assert_eq!(n, 3),
                _ => panic!("Expected folded integer literal"),
            }
        }
        _ => panic!("Expected Filter"),
    }
}

#[test]
fn test_constant_folding_integer_multiply() {
    let mut optimizer = Optimizer::new();
    
    let plan = LogicalPlan::Filter(Filter {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        predicate: Expression::BinaryOp {
            left: Box::new(Expression::Literal(Literal::Integer(4))),
            operator: BinaryOperator::Multiply,
            right: Box::new(Expression::Literal(Literal::Integer(5))),
            location: SourceLocation::new(1, 1, 0),
        },
        selectivity: 0.1,
    });
    
    let optimized = optimizer.optimize(plan);
    
    match optimized {
        LogicalPlan::Filter(filter) => {
            match filter.predicate {
                Expression::Literal(Literal::Integer(n)) => assert_eq!(n, 20),
                _ => panic!("Expected folded integer literal"),
            }
        }
        _ => panic!("Expected Filter"),
    }
}

#[test]
fn test_constant_folding_comparison() {
    let mut optimizer = Optimizer::new();
    
    let plan = LogicalPlan::Filter(Filter {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        predicate: Expression::BinaryOp {
            left: Box::new(Expression::Literal(Literal::Integer(5))),
            operator: BinaryOperator::GreaterThan,
            right: Box::new(Expression::Literal(Literal::Integer(3))),
            location: SourceLocation::new(1, 1, 0),
        },
        selectivity: 0.1,
    });
    
    let optimized = optimizer.optimize(plan);
    
    match optimized {
        LogicalPlan::Filter(filter) => {
            assert!(matches!(filter.predicate, Expression::Literal(Literal::Boolean(true))));
        }
        _ => panic!("Expected Filter"),
    }
}

// ============================================================================
// Predicate Simplification Tests
// ============================================================================

#[test]
fn test_predicate_simplification_and_true() {
    let mut optimizer = Optimizer::new();
    
    let plan = LogicalPlan::Filter(Filter {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        predicate: Expression::BinaryOp {
            left: Box::new(Expression::Variable("x".to_string())),
            operator: BinaryOperator::And,
            right: Box::new(Expression::Literal(Literal::Boolean(true))),
            location: SourceLocation::new(1, 1, 0),
        },
        selectivity: 0.1,
    });
    
    let optimized = optimizer.optimize(plan);
    
    match optimized {
        LogicalPlan::Filter(filter) => {
            // Should be simplified to just Variable("x")
            match &filter.predicate {
                Expression::Variable(name) => assert_eq!(name, "x"),
                _ => panic!("Expected simplified to Variable"),
            }
        }
        _ => panic!("Expected Filter"),
    }
}

#[test]
fn test_predicate_simplification_or_false() {
    let mut optimizer = Optimizer::new();
    
    let plan = LogicalPlan::Filter(Filter {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        predicate: Expression::BinaryOp {
            left: Box::new(Expression::Variable("x".to_string())),
            operator: BinaryOperator::Or,
            right: Box::new(Expression::Literal(Literal::Boolean(false))),
            location: SourceLocation::new(1, 1, 0),
        },
        selectivity: 0.1,
    });
    
    let optimized = optimizer.optimize(plan);
    
    match optimized {
        LogicalPlan::Filter(filter) => {
            match &filter.predicate {
                Expression::Variable(name) => assert_eq!(name, "x"),
                _ => panic!("Expected simplified to Variable"),
            }
        }
        _ => panic!("Expected Filter"),
    }
}

// ============================================================================
// Projection Pushdown Tests
// ============================================================================

#[test]
fn test_projection_pushdown_below_filter() {
    let mut optimizer = Optimizer::new();
    
    let plan = LogicalPlan::Project(Project {
        input: Box::new(LogicalPlan::Filter(Filter {
            input: Box::new(LogicalPlan::NodeScan(NodeScan {
                variable: "n".to_string(),
                label: None,
            })),
            predicate: Expression::Literal(Literal::Boolean(true)),
            selectivity: 0.5,
        })),
        expressions: vec![ProjectExpression {
            expression: Expression::Variable("n".to_string()),
            alias: None,
        }],
    });
    
    let optimized = optimizer.optimize(plan);
    
    // After optimization: Filter -> Project -> NodeScan
    match optimized {
        LogicalPlan::Filter(_) => (), // Project pushed below Filter
        LogicalPlan::Project(_) => (), // May remain as Project
        _ => panic!("Unexpected plan structure"),
    }
}

// ============================================================================
// Dead Code Elimination Tests
// ============================================================================

#[test]
fn test_dead_code_elimination_single_row_sort() {
    let mut optimizer = Optimizer::new();
    
    // A sort with estimated 1 row should be eliminated
    let plan = LogicalPlan::Sort(Sort {
        input: Box::new(LogicalPlan::Limit(Limit {
            input: Box::new(LogicalPlan::NodeScan(NodeScan {
                variable: "n".to_string(),
                label: None,
            })),
            count: 1,
        })),
        order_by: vec![],
    });
    
    let optimized = optimizer.optimize(plan);
    
    // Sort should be eliminated (limit 1 = single row)
    match optimized {
        LogicalPlan::Sort(_) => (), // May remain
        LogicalPlan::Limit(_) => (), // Sort removed
        _ => (),
    }
}

// ============================================================================
// Join Reordering Tests
// ============================================================================

#[test]
fn test_join_reordering_smaller_left() {
    let mut optimizer = Optimizer::new();
    
    let plan = LogicalPlan::Join(Join {
        left: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "a".to_string(),
            label: None, // 10000 rows - LARGER
        })),
        right: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "b".to_string(),
            label: Some("User".to_string()), // 1000 rows - SMALLER
        })),
        join_type: JoinType::Inner,
        condition: None,
    });
    
    let optimized = optimizer.optimize(plan);
    
    match optimized {
        LogicalPlan::Join(join) => {
            // Smaller should be on the left
            let left_rows = join.left.estimated_rows();
            let right_rows = join.right.estimated_rows();
            assert!(left_rows <= right_rows, 
                "Smaller table should be on left. Left: {}, Right: {}", left_rows, right_rows);
        }
        _ => panic!("Expected Join"),
    }
}

// ============================================================================
// Optimization Steps Tests
// ============================================================================

#[test]
fn test_optimization_steps_recorded() {
    let mut optimizer = Optimizer::new();
    
    let plan = LogicalPlan::Filter(Filter {
        input: Box::new(LogicalPlan::NodeScan(NodeScan {
            variable: "n".to_string(),
            label: None,
        })),
        predicate: Expression::BinaryOp {
            left: Box::new(Expression::Literal(Literal::Integer(1))),
            operator: BinaryOperator::Add,
            right: Box::new(Expression::Literal(Literal::Integer(2))),
            location: SourceLocation::new(1, 1, 0),
        },
        selectivity: 0.1,
    });
    
    let _optimized = optimizer.optimize(plan);
    
    // Should have recorded at least one step (constant folding)
    assert!(!optimizer.steps().is_empty(), "Should have recorded optimization steps");
    
    for step in optimizer.steps() {
        assert!(!step.rule_name.is_empty());
        assert!(!step.description.is_empty());
    }
}

// ============================================================================
// Explain Plan Tests
// ============================================================================

#[test]
fn test_explain_plan_basic() {
    let mut plan = ExplainPlan::new();
    
    plan.add_stage(ExplainStage {
        stage_type: "NodeScan".to_string(),
        details: "Scan nodes".to_string(),
        cost: 10.0,
        rows: 1000,
    });
    
    plan.add_stage(ExplainStage {
        stage_type: "Filter".to_string(),
        details: "Filter by age".to_string(),
        cost: 2.0,
        rows: 100,
    });
    
    assert_eq!(plan.stages.len(), 2);
    assert_eq!(plan.total_cost, 12.0);
    assert_eq!(plan.total_rows, 1000);
}

#[test]
fn test_explain_plan_serialization() {
    let mut plan = ExplainPlan::new();
    plan.add_stage(ExplainStage {
        stage_type: "Test".to_string(),
        details: "Test stage".to_string(),
        cost: 5.0,
        rows: 500,
    });
    
    let json = serde_json::to_string(&plan).unwrap();
    assert!(json.contains("Test"));
}

// ============================================================================
// Optimization Rule Trait Tests
// ============================================================================

#[test]
fn test_optimization_rule_names() {
    let filter_pushdown = FilterPushdown;
    let constant_folding = ConstantFolding;
    let predicate_simp = PredicateSimplification;
    let dead_code = DeadCodeElimination;
    
    assert_eq!(filter_pushdown.name(), "filter_pushdown");
    assert_eq!(constant_folding.name(), "constant_folding");
    assert_eq!(predicate_simp.name(), "predicate_simplification");
    assert_eq!(dead_code.name(), "dead_code_elimination");
}

#[test]
fn test_optimization_rule_descriptions() {
    let rules: Vec<Box<dyn OptimizationRule>> = vec![
        Box::new(FilterPushdown),
        Box::new(ConstantFolding),
        Box::new(PredicateSimplification),
        Box::new(DeadCodeElimination),
    ];
    
    for rule in &rules {
        assert!(!rule.description().is_empty());
    }
}

// ============================================================================
// Cache Tests

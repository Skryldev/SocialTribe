pub mod logical;
pub mod optimizer;
pub mod physical;
pub mod explain;

pub use logical::*;
pub use optimizer::*;
pub use physical::*;
pub use explain::*;

use parser::ast::*;

/// Main query planner that creates execution plans
pub struct QueryPlanner {
    node_count: usize,
    relationship_count: usize,
}

impl QueryPlanner {
    /// Creates a new query planner
    pub fn new(node_count: usize, relationship_count: usize) -> Self {
        QueryPlanner {
            node_count,
            relationship_count,
        }
    }
    
    /// Creates a logical plan from an AST
    pub fn plan(&self, query: &Query) -> LogicalPlan {
        let mut plan: Option<LogicalPlan> = None;
        
        for clause in &query.clauses {
            plan = Some(match clause {
                Clause::Match(match_clause) => self.plan_match(match_clause, plan),
                Clause::Where(where_clause) => self.plan_where(where_clause, plan),
                Clause::Return(return_clause) => self.plan_return(return_clause, plan),
                Clause::OrderBy(order_by) => self.plan_order_by(order_by, plan),
                Clause::Limit(limit) => self.plan_limit(limit, plan),
                Clause::Skip(skip) => self.plan_skip(skip, plan),
                Clause::GroupBy(group_by) => self.plan_group_by(group_by, plan),
                Clause::Having(having) => self.plan_having(having, plan),
                _ => plan.unwrap_or_else(|| LogicalPlan::NodeScan(NodeScan {
                    variable: "unknown".to_string(),
                    label: None,
                })),
            });
        }
        
        plan.unwrap_or_else(|| LogicalPlan::NodeScan(NodeScan {
            variable: "empty".to_string(),
            label: None,
        }))
    }
    
    /// Plans a MATCH clause
    fn plan_match(&self, match_clause: &MatchClause, input: Option<LogicalPlan>) -> LogicalPlan {
        for pattern in &match_clause.patterns {
            match pattern {
                Pattern::Node(node_pattern) => {
                    let var_name = node_pattern.variable.clone().unwrap_or_else(|| "n".to_string());
                    
                    let mut plan = LogicalPlan::NodeScan(NodeScan {
                        variable: var_name.clone(),
                        label: node_pattern.labels.first().cloned(),
                    });
                    
                    // Handle inline property filters like {name: "User 2"}
                    if let Some(props) = &node_pattern.properties {
                        for prop in props {
                            plan = LogicalPlan::Filter(Filter {
                                input: Box::new(plan),
                                predicate: Expression::BinaryOp {
                                    left: Box::new(Expression::PropertyAccess {
                                        object: Box::new(Expression::Variable(var_name.clone())),
                                        property: prop.key.clone(),
                                        location: prop.location,
                                    }),
                                    operator: BinaryOperator::Equals,
                                    right: Box::new(prop.value.clone()),
                                    location: prop.location,
                                },
                                selectivity: 0.01,
                            });
                        }
                    }
                    
                    return plan;
                }
                Pattern::Path(parts) => {
                    let mut current_plan: Option<LogicalPlan> = None;

                    for part in parts {
                        match &part.element {
                            PatternElement::Node(node) => {
                                if current_plan.is_none() {
                                    let var_name = node.variable.clone().unwrap_or_else(|| "n".to_string());
                                    
                                    let mut node_plan = LogicalPlan::NodeScan(NodeScan {
                                        variable: var_name.clone(),
                                        label: node.labels.first().cloned(),
                                    });
                                    
                                    if let Some(props) = &node.properties {
                                        for prop in props {
                                            node_plan = LogicalPlan::Filter(Filter {
                                                input: Box::new(node_plan),
                                                predicate: Expression::BinaryOp {
                                                    left: Box::new(Expression::PropertyAccess {
                                                        object: Box::new(Expression::Variable(var_name.clone())),
                                                        property: prop.key.clone(),
                                                        location: prop.location,
                                                    }),
                                                    operator: BinaryOperator::Equals,
                                                    right: Box::new(prop.value.clone()),
                                                    location: prop.location,
                                                },
                                                selectivity: 0.01,
                                            });
                                        }
                                    }
                                    
                                    current_plan = Some(node_plan);
                                }
                            }
                            PatternElement::Relationship(rel) => {
                                let source_plan = current_plan.take().unwrap_or_else(|| {
                                    LogicalPlan::NodeScan(NodeScan {
                                        variable: "_anon".to_string(),
                                        label: None,
                                    })
                                });

                                let direction = match &part.connection {
                                    Some(PatternConnection::Reverse) => ExpandDirection::Incoming,
                                    Some(PatternConnection::Undirected) => ExpandDirection::Both,
                                    _ => ExpandDirection::Outgoing,
                                };

                                current_plan = Some(LogicalPlan::Expand(Expand {
                                    input: Box::new(source_plan),
                                    relationship: rel.clone(),
                                    direction,
                                }));
                            }
                        }
                    }

                    if let Some(plan) = current_plan {
                        return plan;
                    }
                }
                _ => {}
            }
        }

        LogicalPlan::NodeScan(NodeScan {
            variable: "default".to_string(),
            label: None,
        })
    }
    
    /// Plans a WHERE clause
    fn plan_where(&self, where_clause: &WhereClause, input: Option<LogicalPlan>) -> LogicalPlan {
        if let Some(input_plan) = input {
            LogicalPlan::Filter(Filter {
                input: Box::new(input_plan),
                predicate: where_clause.predicate.clone(),
                selectivity: 0.1,
            })
        } else {
            LogicalPlan::NodeScan(NodeScan {
                variable: "error".to_string(),
                label: None,
            })
        }
    }
    
    /// Plans a RETURN clause
    fn plan_return(&self, return_clause: &ReturnClause, input: Option<LogicalPlan>) -> LogicalPlan {
        if let Some(input_plan) = input {
            let mut plan = LogicalPlan::Project(Project {
                input: Box::new(input_plan),
                expressions: return_clause.items.iter().map(|item| ProjectExpression {
                    expression: item.expression.clone(),
                    alias: item.alias.clone(),
                }).collect(),
            });
            
            if return_clause.distinct {
                plan = LogicalPlan::Distinct(Distinct {
                    input: Box::new(plan),
                });
            }
            
            plan
        } else {
            LogicalPlan::NodeScan(NodeScan {
                variable: "error".to_string(),
                label: None,
            })
        }
    }
    
    /// Plans ORDER BY
    fn plan_order_by(&self, order_by: &OrderByClause, input: Option<LogicalPlan>) -> LogicalPlan {
        if let Some(input_plan) = input {
            LogicalPlan::Sort(Sort {
                input: Box::new(input_plan),
                order_by: order_by.items.iter().map(|item| SortExpression {
                    expression: item.expression.clone(),
                    ascending: matches!(item.direction, OrderDirection::Ascending),
                }).collect(),
            })
        } else {
            LogicalPlan::NodeScan(NodeScan {
                variable: "error".to_string(),
                label: None,
            })
        }
    }
    
    /// Plans LIMIT
    fn plan_limit(&self, limit: &LimitClause, input: Option<LogicalPlan>) -> LogicalPlan {
        if let Some(input_plan) = input {
            if let Expression::Literal(Literal::Integer(count)) = &limit.value {
                LogicalPlan::Limit(Limit {
                    input: Box::new(input_plan),
                    count: *count,
                })
            } else {
                input_plan
            }
        } else {
            LogicalPlan::NodeScan(NodeScan {
                variable: "error".to_string(),
                label: None,
            })
        }
    }
    
    /// Plans SKIP
    fn plan_skip(&self, skip: &SkipClause, input: Option<LogicalPlan>) -> LogicalPlan {
        if let Some(input_plan) = input {
            if let Expression::Literal(Literal::Integer(count)) = &skip.value {
                LogicalPlan::Skip(Skip {
                    input: Box::new(input_plan),
                    count: *count,
                })
            } else {
                input_plan
            }
        } else {
            LogicalPlan::NodeScan(NodeScan {
                variable: "error".to_string(),
                label: None,
            })
        }
    }

    /// Plans GROUP BY
    fn plan_group_by(&self, group_by: &GroupByClause, input: Option<LogicalPlan>) -> LogicalPlan {
        if let Some(input_plan) = input {
            if let LogicalPlan::Project(project) = &input_plan {
                let mut agg_exprs: Vec<AggregationExpression> = Vec::new();
                
                // FIX: Group keys ONLY from the GROUP BY clause (not from Project)
                let group_exprs: Vec<Expression> = group_by.expressions.clone();
                
                // Extract ONLY aggregation functions from Project
                for proj_expr in &project.expressions {
                    if let Expression::FunctionCall { name, arguments, .. } = &proj_expr.expression {
                        let func_upper = name.to_uppercase();
                        if matches!(func_upper.as_str(), "COUNT" | "SUM" | "AVG" | "MIN" | "MAX") {
                            agg_exprs.push(AggregationExpression {
                                function: func_upper,
                                expression: arguments.first().cloned().unwrap_or(
                                    Expression::Literal(Literal::Integer(1))
                                ),
                                alias: proj_expr.alias.clone(),
                            });
                        }
                    }
                }

                return LogicalPlan::Aggregate(Aggregate {
                    input: Box::new(LogicalPlan::Project(Project {
                        input: project.input.clone(),
                        expressions: project.expressions.clone(),
                    })),
                    group_by: group_exprs,
                    aggregations: agg_exprs,
                });
            }
            
            // Fallback: wrap whatever we have with explicit group keys
            LogicalPlan::Aggregate(Aggregate {
                input: Box::new(input_plan),
                group_by: group_by.expressions.clone(),
                aggregations: Vec::new(),
            })
        } else {
            LogicalPlan::NodeScan(NodeScan {
                variable: "error".to_string(),
                label: None,
            })
        }
    }

    /// Plans HAVING
    fn plan_having(&self, having: &HavingClause, input: Option<LogicalPlan>) -> LogicalPlan {
        if let Some(input_plan) = input {
            LogicalPlan::Filter(Filter {
                input: Box::new(input_plan),
                predicate: having.predicate.clone(),
                selectivity: 0.1,
            })
        } else {
            LogicalPlan::NodeScan(NodeScan {
                variable: "error".to_string(),
                label: None,
            })
        }
    }
    
    /// Creates a physical plan from a logical plan
    pub fn create_physical_plan(&self, logical_plan: &LogicalPlan) -> PhysicalPlan {
        PhysicalPlan::from_logical(logical_plan)
    }
    
    /// Estimates the cost of a plan
    pub fn estimate_cost(&self, plan: &LogicalPlan) -> f64 {
        plan.estimated_cost()
    }
    
    /// Estimates the rows of a plan
    pub fn estimate_rows(&self, plan: &LogicalPlan) -> usize {
        plan.estimated_rows()
    }
}


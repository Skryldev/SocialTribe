// ============================================
// crates/planner/src/physical.rs - FIXED
// ============================================

use crate::logical::*;
use serde::{Deserialize, Serialize};

/// Simplified range for serialization (without SourceLocation)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SerializablePathRange {
    pub min: Option<i64>,
    pub max: Option<i64>,
}

/// Physical plan for execution
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum PhysicalPlan {
    TableScan(TableScanExec),
    FilterExec(FilterExec),
    ProjectExec(ProjectExec),
    HashJoin(HashJoinExec),
    SortExec(SortExec),
    LimitExec(LimitExec),
    SkipExec(SkipExec),
    AggregateExec(AggregateExec),
    ExpandExec(ExpandExec),
}

/// Table scan execution
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TableScanExec {
    pub table: String,
    pub estimated_rows: usize,
}

/// Filter execution
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FilterExec {
    pub input: Box<PhysicalPlan>,
    pub predicate: String,
    pub estimated_rows: usize,
}

/// Project execution
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProjectExec {
    pub input: Box<PhysicalPlan>,
    pub columns: Vec<String>,
}

/// Hash join execution
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HashJoinExec {
    pub left: Box<PhysicalPlan>,
    pub right: Box<PhysicalPlan>,
    pub join_type: String,
}

/// Sort execution
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SortExec {
    pub input: Box<PhysicalPlan>,
    pub sort_keys: Vec<String>,
}

/// Limit execution
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LimitExec {
    pub input: Box<PhysicalPlan>,
    pub limit: usize,
}

/// Skip execution - NEW (proper SkipExec instead of LimitExec with usize::MAX)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SkipExec {
    pub input: Box<PhysicalPlan>,
    pub count: usize,
}

/// Aggregate execution
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AggregateExec {
    pub input: Box<PhysicalPlan>,
    pub group_keys: Vec<String>,
    pub aggregations: Vec<String>,
}

/// Expand execution with serializable range
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExpandExec {
    pub input: Box<PhysicalPlan>,
    pub relationship_type: String,
    pub direction: String,
    pub range: Option<SerializablePathRange>,
}

impl PhysicalPlan {
    /// Converts a logical plan to a physical plan
    pub fn from_logical(logical: &LogicalPlan) -> Self {
        match logical {
            LogicalPlan::NodeScan(scan) => {
                PhysicalPlan::TableScan(TableScanExec {
                    table: scan.label.clone().unwrap_or_else(|| "nodes".to_string()),
                    estimated_rows: scan.variable.len() * 100,
                })
            }
            LogicalPlan::Filter(filter) => {
                PhysicalPlan::FilterExec(FilterExec {
                    input: Box::new(PhysicalPlan::from_logical(&filter.input)),
                    predicate: format!("{:?}", filter.predicate),
                    estimated_rows: filter.input.estimated_rows() / 10,
                })
            }
            LogicalPlan::Project(project) => {
                PhysicalPlan::ProjectExec(ProjectExec {
                    input: Box::new(PhysicalPlan::from_logical(&project.input)),
                    columns: project.expressions.iter().map(|e| format!("{:?}", e.expression)).collect(),
                })
            }
            LogicalPlan::Join(join) => {
                PhysicalPlan::HashJoin(HashJoinExec {
                    left: Box::new(PhysicalPlan::from_logical(&join.left)),
                    right: Box::new(PhysicalPlan::from_logical(&join.right)),
                    join_type: format!("{:?}", join.join_type),
                })
            }
            LogicalPlan::Sort(sort) => {
                PhysicalPlan::SortExec(SortExec {
                    input: Box::new(PhysicalPlan::from_logical(&sort.input)),
                    sort_keys: sort.order_by.iter().map(|e| format!("{:?}", e.expression)).collect(),
                })
            }
            LogicalPlan::Limit(limit) => {
                PhysicalPlan::LimitExec(LimitExec {
                    input: Box::new(PhysicalPlan::from_logical(&limit.input)),
                    limit: limit.count as usize,
                })
            }
            LogicalPlan::Skip(skip) => {
                // FIX: Proper SkipExec instead of LimitExec with usize::MAX
                PhysicalPlan::SkipExec(SkipExec {
                    input: Box::new(PhysicalPlan::from_logical(&skip.input)),
                    count: skip.count as usize,
                })
            }
            LogicalPlan::Aggregate(agg) => {
                PhysicalPlan::AggregateExec(AggregateExec {
                    input: Box::new(PhysicalPlan::from_logical(&agg.input)),
                    group_keys: agg.group_by.iter().map(|e| format!("{:?}", e)).collect(),
                    aggregations: agg.aggregations.iter().map(|e| {
                        format!("FunctionCall {{ name: \"{}\", arguments: [{}] }}", 
                            e.function, 
                            format!("{:?}", e.expression)
                        )
                    }).collect(),
                })
            }
            LogicalPlan::Expand(expand) => {
                let serializable_range = expand.relationship.range.as_ref().map(|r| {
                    SerializablePathRange {
                        min: r.min,
                        max: r.max,
                    }
                });

                PhysicalPlan::ExpandExec(ExpandExec {
                    input: Box::new(PhysicalPlan::from_logical(&expand.input)),
                    relationship_type: expand.relationship.types.first().cloned().unwrap_or_default(),
                    direction: format!("{:?}", expand.direction),
                    range: serializable_range,
                })
            }
            LogicalPlan::Distinct(d) => PhysicalPlan::from_logical(&d.input),
            LogicalPlan::PatternMatch(pm) => PhysicalPlan::from_logical(&pm.input),
            LogicalPlan::Produce(p) => PhysicalPlan::from_logical(&p.input),
        }
    }
}


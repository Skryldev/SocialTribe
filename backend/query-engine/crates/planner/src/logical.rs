use serde::{Deserialize, Serialize};
use parser::ast::*;

/// Logical plan node types
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum LogicalPlan {
    /// Scans all nodes
    NodeScan(NodeScan),
    /// Filters rows based on predicate
    Filter(Filter),
    /// Projects specific expressions
    Project(Project),
    /// Joins two inputs
    Join(Join),
    /// Aggregates rows
    Aggregate(Aggregate),
    /// Sorts rows
    Sort(Sort),
    /// Limits rows
    Limit(Limit),
    /// Skip rows
    Skip(Skip),
    /// Distinct operation
    Distinct(Distinct),
    /// Pattern matching
    PatternMatch(PatternMatch),
    /// Expand relationships
    Expand(Expand),
    /// Produces results
    Produce(Produce),
}

/// Node scan operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NodeScan {
    pub variable: String,
    pub label: Option<String>,
}

/// Filter operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Filter {
    pub input: Box<LogicalPlan>,
    pub predicate: Expression,
    pub selectivity: f64,
}

/// Project operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Project {
    pub input: Box<LogicalPlan>,
    pub expressions: Vec<ProjectExpression>,
}

/// Project expression
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProjectExpression {
    pub expression: Expression,
    pub alias: Option<String>,
}

/// Join operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Join {
    pub left: Box<LogicalPlan>,
    pub right: Box<LogicalPlan>,
    pub join_type: JoinType,
    pub condition: Option<Expression>,
}

/// Join types
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum JoinType {
    Inner,
    LeftOuter,
    Cross,
}

/// Aggregate operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Aggregate {
    pub input: Box<LogicalPlan>,
    pub group_by: Vec<Expression>,
    pub aggregations: Vec<AggregationExpression>,
}

/// Aggregation expression
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AggregationExpression {
    pub function: String,
    pub expression: Expression,
    pub alias: Option<String>,
}

/// Sort operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Sort {
    pub input: Box<LogicalPlan>,
    pub order_by: Vec<SortExpression>,
}

/// Sort expression
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SortExpression {
    pub expression: Expression,
    pub ascending: bool,
}

/// Limit operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Limit {
    pub input: Box<LogicalPlan>,
    pub count: i64,
}

/// Skip operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Skip {
    pub input: Box<LogicalPlan>,
    pub count: i64,
}

/// Distinct operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Distinct {
    pub input: Box<LogicalPlan>,
}

/// Pattern matching operation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PatternMatch {
    pub pattern: Pattern,
    pub input: Box<LogicalPlan>,
}

/// Expand relationships
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Expand {
    pub input: Box<LogicalPlan>,
    pub relationship: RelationshipPattern,
    pub direction: ExpandDirection,
}

/// Expand direction
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ExpandDirection {
    Outgoing,
    Incoming,
    Both,
}

/// Produce results
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Produce {
    pub input: Box<LogicalPlan>,
}

impl LogicalPlan {
    /// Estimates the number of rows this plan will produce
    pub fn estimated_rows(&self) -> usize {
        match self {
            LogicalPlan::NodeScan(scan) => {
                if scan.label.is_some() {
                    1000 // Assume 1000 nodes of each type
                } else {
                    10000 // Assume 10000 total nodes
                }
            }
            LogicalPlan::Filter(filter) => {
                let input_rows = filter.input.estimated_rows();
                (input_rows as f64 * filter.selectivity) as usize
            }
            LogicalPlan::Project(project) => {
                project.input.estimated_rows()
            }
            LogicalPlan::Join(join) => {
                let left_rows = join.left.estimated_rows();
                let right_rows = join.right.estimated_rows();
                match join.join_type {
                    JoinType::Cross => left_rows * right_rows,
                    JoinType::Inner => std::cmp::min(left_rows, right_rows),
                    JoinType::LeftOuter => left_rows,
                }
            }
            LogicalPlan::Aggregate(agg) => {
                agg.group_by.len().max(1) * 10
            }
            LogicalPlan::Sort(sort) => {
                sort.input.estimated_rows()
            }
            LogicalPlan::Limit(limit) => {
                let input_rows = limit.input.estimated_rows();
                std::cmp::min(input_rows, limit.count as usize)
            }
            LogicalPlan::Skip(skip) => {
                let input_rows = skip.input.estimated_rows();
                input_rows.saturating_sub(skip.count as usize)
            }
            LogicalPlan::Distinct(distinct) => {
                distinct.input.estimated_rows() / 2
            }
            LogicalPlan::PatternMatch(pm) => {
                pm.input.estimated_rows() * 2
            }
            LogicalPlan::Expand(expand) => {
            let input_rows = expand.input.estimated_rows();
            if input_rows == 0 {
                1
            } else {
                let range_multiplier = expand.relationship.range.as_ref().map_or(5, |r| {
                    match (r.min, r.max) {
                        (_, Some(max)) => (max * 2) as usize,
                        (Some(min), None) => (min * 2) as usize,
                        (None, None) => 5,
                    }
                });
                input_rows * range_multiplier
                }
            }
            LogicalPlan::Produce(produce) => {
                produce.input.estimated_rows()
            }
        }
    }
    
    /// Estimates the cost of this plan
    pub fn estimated_cost(&self) -> f64 {
        match self {
            LogicalPlan::NodeScan(_) => 10.0,
            LogicalPlan::Filter(f) => {
                f.input.estimated_cost() + f.input.estimated_rows() as f64 * 0.01
            }
            LogicalPlan::Project(p) => {
                p.input.estimated_cost() + p.input.estimated_rows() as f64 * 0.005
            }
            LogicalPlan::Join(j) => {
                let left_cost = j.left.estimated_cost();
                let right_cost = j.right.estimated_cost();
                let join_cost = (j.left.estimated_rows() * j.right.estimated_rows()) as f64 * 0.001;
                left_cost + right_cost + join_cost
            }
            LogicalPlan::Aggregate(a) => {
                a.input.estimated_cost() + a.input.estimated_rows() as f64 * 0.05
            }
            LogicalPlan::Sort(s) => {
                let n = s.input.estimated_rows() as f64;
                let log_factor = if n > 1.0 { n.log2() } else { 1.0 };
                s.input.estimated_cost() + n * log_factor
            }
            LogicalPlan::Limit(l) => {
                l.input.estimated_cost() + l.count as f64 * 0.001
            }
            LogicalPlan::Skip(s) => {
                s.input.estimated_cost() + s.count as f64 * 0.001
            }
            LogicalPlan::Distinct(d) => {
                d.input.estimated_cost() + d.input.estimated_rows() as f64 * 0.02
            }
            LogicalPlan::PatternMatch(pm) => {
                pm.input.estimated_cost() + pm.input.estimated_rows() as f64 * 0.1
            }
            LogicalPlan::Expand(e) => {
                // Base: 0.5 per input row per hop. Variable-length paths scale by max hops.
                let hop_multiplier = e.relationship.range.as_ref().map_or(1.0, |r| {
                    match (r.min, r.max) {
                        (_, Some(max)) => max as f64,
                        (Some(min), None) => (min as f64 * 2.0).max(2.0),
                        (None, None) => 3.0,
                    }
                });
                e.input.estimated_cost() + e.input.estimated_rows() as f64 * 0.5 * hop_multiplier
            }
            LogicalPlan::Produce(p) => {
                p.input.estimated_cost() + p.input.estimated_rows() as f64 * 0.001
            }
        }
    }
}


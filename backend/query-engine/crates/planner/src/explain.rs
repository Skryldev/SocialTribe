use serde::{Deserialize, Serialize};

/// Explains a step in optimization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationStep {
    pub rule_name: String,
    pub description: String,
    pub before: String,
    pub after: String,
}

/// Complete explain plan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExplainPlan {
    pub stages: Vec<ExplainStage>,
    pub total_cost: f64,
    pub total_rows: usize,
}

/// A stage in the explain plan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExplainStage {
    pub stage_type: String,
    pub details: String,
    pub cost: f64,
    pub rows: usize,
}

impl ExplainPlan {
    /// Creates a new explain plan
    pub fn new() -> Self {
        ExplainPlan {
            stages: Vec::new(),
            total_cost: 0.0,
            total_rows: 0,
        }
    }
    
    /// Adds a stage to the explain plan
    pub fn add_stage(&mut self, stage: ExplainStage) {
        self.total_cost += stage.cost;
        self.total_rows = std::cmp::max(self.total_rows, stage.rows);
        self.stages.push(stage);
    }
}


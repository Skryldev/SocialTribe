use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// Import all engine components
use lexer;
use parser;
use semantic;
use planner;

/// Initialize panic hook for better error messages in WASM
#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

/// Get the engine version
#[wasm_bindgen]
pub fn get_version() -> String {
    "1.0.0".to_string()
}

/// Complete compilation result
#[derive(Debug, Serialize, Deserialize)]
pub struct CompilationResult {
    pub success: bool,
    pub tokens: Option<Vec<TokenInfo>>,
    pub ast: Option<String>,
    pub diagnostics: Vec<DiagnosticInfo>,
    pub logical_plan: Option<String>,
    pub optimized_plan: Option<String>,
    pub physical_plan: Option<String>,
    pub explain_data: Option<ExplainData>,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

/// Token information for serialization
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenInfo {
    pub token_type: String,
    pub lexeme: String,
    pub line: usize,
    pub column: usize,
}

/// Diagnostic information for serialization
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiagnosticInfo {
    pub severity: String,
    pub code: String,
    pub message: String,
    pub line: usize,
    pub column: usize,
    pub suggestion: Option<String>,
}

/// Explain plan data
#[derive(Debug, Serialize, Deserialize)]
pub struct ExplainData {
    pub original_query: String,
    pub token_list: Vec<TokenInfo>,
    pub ast_representation: String,
    pub semantic_diagnostics: Vec<DiagnosticInfo>,
    pub logical_plan: String,
    pub optimization_steps: Vec<OptimizationStepInfo>,
    pub optimized_logical_plan: String,
    pub physical_plan: String,
    pub estimated_cost: f64,
    pub estimated_rows: usize,
}

/// Optimization step info
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OptimizationStepInfo {
    pub rule_name: String,
    pub description: String,
    pub before: String,
    pub after: String,
}

/// Helper function to safely convert a value to JsValue
fn to_js_value(value: serde_json::Value) -> JsValue {
    match serde_wasm_bindgen::to_value(&value) {
        Ok(js_value) => js_value,
        Err(e) => {
            let fallback = serde_json::json!({
                "success": false,
                "errors": [format!("Serialization error: {}", e)],
            });
            serde_wasm_bindgen::to_value(&fallback).unwrap_or(JsValue::NULL)
        }
    }
}

/// Helper function to create an error response
fn error_response(message: &str) -> JsValue {
    let fallback = serde_json::json!({
        "success": false,
        "errors": [message],
    });
    serde_wasm_bindgen::to_value(&fallback).unwrap_or(JsValue::NULL)
}

/// Internal function that does the actual compilation with proper error handling
fn compile_query_internal(query: &str, node_count: usize, relationship_count: usize) -> Result<CompilationResult, String> {
    let mut result = CompilationResult {
        success: true,
        tokens: None,
        ast: None,
        diagnostics: Vec::new(),
        logical_plan: None,
        optimized_plan: None,
        physical_plan: None,
        explain_data: None,
        errors: Vec::new(),
        warnings: Vec::new(),
    };
    
    // Step 1: Lexing
    let tokens = match lexer::lex(query) {
        Ok(tokens) => {
            let token_infos: Vec<TokenInfo> = tokens.iter().map(|t| TokenInfo {
                token_type: format!("{:?}", t.token_type()),
                lexeme: t.lexeme().to_string(),
                line: t.location().line,
                column: t.location().column,
            }).collect();
            result.tokens = Some(token_infos);
            tokens
        }
        Err(e) => {
            result.success = false;
            result.errors.push(format!("Lexer error: {}", e));
            return Ok(result);
        }
    };
    
    // Step 2: Parsing
    let query_ast = match parser::parse(tokens) {
        Ok(ast) => {
            match serde_json::to_string(&ast) {
                Ok(json) => result.ast = Some(json),
                Err(e) => {
                    result.ast = Some(format!("{:?}", ast));
                    result.warnings.push(format!("AST serialization warning: {}", e));
                }
            }
            ast
        }
        Err(e) => {
            result.success = false;
            result.errors.push(format!("Parser error: {}", e));
            return Ok(result);
        }
    };
    
    // Step 3: Semantic Validation
    let diagnostics = semantic::validate_query(&query_ast);
    
    for diag in diagnostics.diagnostics() {
        let info = DiagnosticInfo {
            severity: format!("{:?}", diag.severity),
            code: format!("{:?}", diag.code),
            message: diag.message.clone(),
            line: diag.location.line,
            column: diag.location.column,
            suggestion: diag.suggestion.clone(),
        };
        
        match diag.severity {
            semantic::Severity::Error => {
                result.errors.push(diag.message.clone());
                result.success = false;
            }
            semantic::Severity::Warning => {
                result.warnings.push(diag.message.clone());
            }
            _ => {}
        }
        
        result.diagnostics.push(info);
    }
    
    // If there are semantic errors, return early
    if !result.success {
        return Ok(result);
    }
    
    // Step 4: Planning
    let planner = planner::QueryPlanner::new(node_count, relationship_count);
    let logical_plan = planner.plan(&query_ast);
    
    match serde_json::to_string(&logical_plan) {
        Ok(json) => result.logical_plan = Some(json),
        Err(e) => {
            result.logical_plan = Some(format!("{:?}", logical_plan));
            result.warnings.push(format!("Logical plan serialization warning: {}", e));
        }
    }
    
    // Step 5: Optimization
    let mut optimizer = planner::Optimizer::new();
    let optimized_plan = optimizer.optimize(logical_plan);
    
    match serde_json::to_string(&optimized_plan) {
        Ok(json) => result.optimized_plan = Some(json),
        Err(e) => {
            result.optimized_plan = Some(format!("{:?}", optimized_plan));
            result.warnings.push(format!("Optimized plan serialization warning: {}", e));
        }
    }
    
    // Step 6: Physical Plan
    let physical_plan = planner.create_physical_plan(&optimized_plan);
    
    match serde_json::to_string(&physical_plan) {
        Ok(json) => result.physical_plan = Some(json),
        Err(e) => {
            result.physical_plan = Some(format!("{:?}", physical_plan));
            result.warnings.push(format!("Physical plan serialization warning: {}", e));
        }
    }
    
    // Step 7: Explain Data
    let estimated_cost = {
        let cost = planner.estimate_cost(&optimized_plan);
        if cost.is_finite() { cost } else { 0.0 }
    };
    
    let optimization_steps: Vec<OptimizationStepInfo> = optimizer.steps().iter().map(|s| OptimizationStepInfo {
        rule_name: s.rule_name.clone(),
        description: s.description.clone(),
        before: s.before.clone(),
        after: s.after.clone(),
    }).collect();
    
    let explain = ExplainData {
        original_query: query.to_string(),
        token_list: result.tokens.clone().unwrap_or_default(),
        ast_representation: result.ast.clone().unwrap_or_default(),
        semantic_diagnostics: result.diagnostics.clone(),
        logical_plan: result.logical_plan.clone().unwrap_or_default(),
        optimization_steps,
        optimized_logical_plan: result.optimized_plan.clone().unwrap_or_default(),
        physical_plan: result.physical_plan.clone().unwrap_or_default(),
        estimated_cost,
        estimated_rows: planner.estimate_rows(&optimized_plan),
    };
    result.explain_data = Some(explain);
    
    Ok(result)
}

/// Compiles a complete query pipeline with full error handling
#[wasm_bindgen]
pub fn compile_query(query: &str, node_count: usize, relationship_count: usize) -> JsValue {
    let result = std::panic::catch_unwind(|| {
        compile_query_internal(query, node_count, relationship_count)
    });
    
    match result {
        Ok(Ok(compilation_result)) => {
            match serde_json::to_value(&compilation_result) {
                Ok(json_value) => to_js_value(json_value),
                Err(e) => error_response(&format!("Serialization error: {}", e)),
            }
        }
        Ok(Err(error_message)) => {
            error_response(&error_message)
        }
        Err(panic_payload) => {
            let error_message = if let Some(s) = panic_payload.downcast_ref::<String>() {
                s.clone()
            } else if let Some(s) = panic_payload.downcast_ref::<&str>() {
                s.to_string()
            } else {
                "Internal engine error (panic occurred)".to_string()
            };
            error_response(&format!("Engine panic: {}", error_message))
        }
    }
}

/// Only parses the query
#[wasm_bindgen]
pub fn parse_query(query: &str) -> JsValue {
    let result = std::panic::catch_unwind(|| {
        parser::parse_query(query)
    });
    
    match result {
        Ok(Ok(ast)) => {
            let json_result = serde_json::json!({
                "success": true,
                "ast": serde_json::to_string(&ast).unwrap_or_else(|_| format!("{:?}", ast)),
            });
            to_js_value(json_result)
        }
        Ok(Err(e)) => {
            let json_result = serde_json::json!({
                "success": false,
                "error": format!("{}", e),
            });
            to_js_value(json_result)
        }
        Err(_) => {
            error_response("Internal parser panic")
        }
    }
}

/// Only lexes the query
#[wasm_bindgen]
pub fn lex_query(query: &str) -> JsValue {
    let result = std::panic::catch_unwind(|| {
        lexer::lex(query)
    });
    
    match result {
        Ok(Ok(tokens)) => {
            let token_infos: Vec<TokenInfo> = tokens.iter().map(|t| TokenInfo {
                token_type: format!("{}", t.token_type()),
                lexeme: t.lexeme().to_string(),
                line: t.location().line,
                column: t.location().column,
            }).collect();
            
            let json_result = serde_json::json!({
                "success": true,
                "tokens": token_infos,
            });
            to_js_value(json_result)
        }
        Ok(Err(e)) => {
            let json_result = serde_json::json!({
                "success": false,
                "error": format!("{}", e),
            });
            to_js_value(json_result)
        }
        Err(_) => {
            error_response("Internal lexer panic")
        }
    }
}

/// Validates the query semantically
#[wasm_bindgen]
pub fn validate_query(query: &str) -> JsValue {
    let result = std::panic::catch_unwind(|| {
        parser::parse_query(query)
    });
    
    match result {
        Ok(Ok(ast)) => {
            let diagnostics = semantic::validate_query(&ast);
            let diag_infos: Vec<DiagnosticInfo> = diagnostics.diagnostics().iter().map(|d| DiagnosticInfo {
                severity: format!("{:?}", d.severity),
                code: format!("{:?}", d.code),
                message: d.message.clone(),
                line: d.location.line,
                column: d.location.column,
                suggestion: d.suggestion.clone(),
            }).collect();
            
            let json_result = serde_json::json!({
                "success": !diagnostics.has_errors(),
                "diagnostics": diag_infos,
            });
            to_js_value(json_result)
        }
        Ok(Err(e)) => {
            let json_result = serde_json::json!({
                "success": false,
                "error": format!("Parser error: {}", e),
            });
            to_js_value(json_result)
        }
        Err(_) => {
            error_response("Internal validation panic")
        }
    }
}

/// Plans the query without execution
#[wasm_bindgen]
pub fn plan_query(query: &str, node_count: usize, relationship_count: usize) -> JsValue {
    let result = std::panic::catch_unwind(|| {
        match parser::parse_query(query) {
            Ok(ast) => {
                let planner = planner::QueryPlanner::new(node_count, relationship_count);
                let logical_plan = planner.plan(&ast);
                let mut optimizer = planner::Optimizer::new();
                let optimized_plan = optimizer.optimize(logical_plan);
                let physical_plan = planner.create_physical_plan(&optimized_plan);
                
                let estimated_cost = {
                    let cost = planner.estimate_cost(&optimized_plan);
                    if cost.is_finite() { cost } else { 0.0 }
                };
                
                Ok(serde_json::json!({
                    "success": true,
                    "logical_plan": serde_json::to_string(&optimized_plan).unwrap_or_else(|_| format!("{:?}", optimized_plan)),
                    "physical_plan": serde_json::to_string(&physical_plan).unwrap_or_else(|_| format!("{:?}", physical_plan)),
                    "estimated_cost": estimated_cost,
                    "estimated_rows": planner.estimate_rows(&optimized_plan),
                }))
            }
            Err(e) => {
                Ok(serde_json::json!({
                    "success": false,
                    "error": format!("{}", e),
                }))
            }
        }
    });
    
    match result {
        Ok(Ok(json_value)) => to_js_value(json_value),
        Ok(Err(json_value)) => to_js_value(json_value),
        Err(_) => error_response("Internal planner panic"),
    }
}

/// Generates a detailed explain plan
#[wasm_bindgen]
pub fn explain_query(query: &str, node_count: usize, relationship_count: usize) -> JsValue {
    compile_query(query, node_count, relationship_count)
}

/// Analyzes a query and provides optimization suggestions
#[wasm_bindgen]
pub fn analyze_query(query: &str) -> JsValue {
    let result = std::panic::catch_unwind(|| {
        let mut suggestions = Vec::new();
        
        if query.contains("MATCH") && !query.contains("WHERE") {
            suggestions.push("Consider adding a WHERE clause to filter results");
        }
        
        if query.contains("*") && !query.contains("LIMIT") {
            suggestions.push("Consider adding a LIMIT clause to restrict result size");
        }
        
        if query.contains("ORDER BY") && !query.contains("LIMIT") {
            suggestions.push("Adding a LIMIT clause with ORDER BY can improve performance");
        }
        
        serde_json::json!({
            "query": query,
            "suggestions": suggestions,
            "complexity": if query.len() > 100 { "high" } else { "low" },
        })
    });
    
    match result {
        Ok(json_value) => to_js_value(json_value),
        Err(_) => {
            let json_result = serde_json::json!({
                "query": query,
                "suggestions": [],
                "complexity": "unknown",
                "error": "Analysis panic occurred",
            });
            to_js_value(json_result)
        }
    }
}


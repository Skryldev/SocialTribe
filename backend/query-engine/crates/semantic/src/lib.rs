pub mod diagnostics;

pub use diagnostics::*;

use parser::Query;
use lexer::SourceLocation;

pub fn validate_query(query: &Query) -> DiagnosticBag {
    let mut validator = SemanticValidator::new();
    validator.validate(query)
}

/// Semantic validator for graph queries
pub struct SemanticValidator {
    pub diagnostics: DiagnosticBag,
    pub known_types: Vec<String>,
    pub known_properties: Vec<(String, Vec<String>)>,
    pub known_functions: Vec<FunctionSignature>,
}

/// Function signature
#[derive(Debug, Clone)]
pub struct FunctionSignature {
    pub name: String,
    pub min_args: usize,
    pub max_args: usize,
}

impl SemanticValidator {
    /// Creates a new semantic validator with schema knowledge
    pub fn new() -> Self {
        let mut validator = SemanticValidator {
            diagnostics: DiagnosticBag::new(),
            known_types: Vec::new(),
            known_properties: Vec::new(),
            known_functions: Vec::new(),
        };
        
        // Register known types
        validator.known_types.push("socialUser".to_string());
        validator.known_types.push("weightedEdge".to_string());
        
        // Register properties for socialUser
        validator.known_properties.push((
            "socialUser".to_string(),
            vec![
                "id".to_string(),
                "name".to_string(),
                "nodeType".to_string(),
                "role".to_string(),
                "friendCount".to_string(),
                "avgDistance".to_string(),
                "centrality".to_string(),
            ],
        ));
        
        // Register properties for weightedEdge
        validator.known_properties.push((
            "weightedEdge".to_string(),
            vec![
                "Weight".to_string(),
                "createdAt".to_string(),
                "source".to_string(),
                "target".to_string(),
            ],
        ));
        
        // Register known functions
        validator.known_functions.push(FunctionSignature {
            name: "centrality".to_string(),
            min_args: 1,
            max_args: 1,
        });
        validator.known_functions.push(FunctionSignature {
            name: "degree".to_string(),
            min_args: 1,
            max_args: 1,
        });
        validator.known_functions.push(FunctionSignature {
            name: "betweenness".to_string(),
            min_args: 1,
            max_args: 1,
        });
        validator.known_functions.push(FunctionSignature {
            name: "closeness".to_string(),
            min_args: 1,
            max_args: 1,
        });
        validator.known_functions.push(FunctionSignature {
            name: "shortestPath".to_string(),
            min_args: 2,
            max_args: 2,
        });
        validator.known_functions.push(FunctionSignature {
            name: "count".to_string(),
            min_args: 0,
            max_args: 1,
        });
        validator.known_functions.push(FunctionSignature {
            name: "sum".to_string(),
            min_args: 1,
            max_args: 1,
        });
        validator.known_functions.push(FunctionSignature {
            name: "avg".to_string(),
            min_args: 1,
            max_args: 1,
        });
        validator.known_functions.push(FunctionSignature {
            name: "min".to_string(),
            min_args: 1,
            max_args: 1,
        });
        validator.known_functions.push(FunctionSignature {
            name: "max".to_string(),
            min_args: 1,
            max_args: 1,
        });
        validator.known_functions.push(FunctionSignature {
            name: "length".to_string(),
            min_args: 1,
            max_args: 1,
        });
        
        validator
    }
    
    /// Validates a query
    pub fn validate(&mut self, query: &Query) -> DiagnosticBag {
        use parser::ast::*;
        
        if query.clauses.is_empty() {
            self.diagnostics.add_error(
                ErrorCode::InvalidClause,
                "Query must have at least one clause".to_string(),
                SourceLocation::new(0, 0, 0),
            );
            return self.diagnostics.clone();
        }
        
        for clause in &query.clauses {
            self.validate_clause(clause);
        }
        
        let has_return = query.clauses.iter().any(|c| matches!(c, Clause::Return(_)));
        if !has_return {
            self.diagnostics.add_warning(
                ErrorCode::MissingReturn,
                "Query should have a RETURN clause".to_string(),
                SourceLocation::new(0, 0, 0),
            );
        }
        
        self.diagnostics.clone()
    }
    
    fn validate_clause(&mut self, clause: &parser::ast::Clause) {
        use parser::ast::*;
        
        match clause {
            Clause::Match(match_clause) => self.validate_match_clause(match_clause),
            Clause::OptionalMatch(opt_match) => self.validate_optional_match(opt_match),
            Clause::Where(where_clause) => self.validate_where_clause(where_clause),
            Clause::Return(return_clause) => self.validate_return_clause(return_clause),
            Clause::With(with_clause) => self.validate_with_clause(with_clause),
            Clause::OrderBy(order_by) => self.validate_order_by(order_by),
            Clause::GroupBy(group_by) => self.validate_group_by(group_by),
            Clause::Having(having) => self.validate_having(having),
            Clause::Limit(limit) => self.validate_limit(limit),
            Clause::Skip(skip) => self.validate_skip(skip),
            Clause::Create(create) => self.validate_create(create),
            Clause::Delete(delete) => self.validate_delete(delete),
            Clause::Set(set) => self.validate_set(set),
            Clause::Merge(merge) => self.validate_merge(merge),
            Clause::Unwind(unwind) => self.validate_unwind(unwind),
            Clause::Call(call) => self.validate_call(call),
        }
    }
    
    fn validate_match_clause(&mut self, clause: &parser::ast::MatchClause) {
        for pattern in &clause.patterns {
            self.validate_pattern(pattern);
        }
    }
    
    fn validate_optional_match(&mut self, clause: &parser::ast::OptionalMatchClause) {
        for pattern in &clause.patterns {
            self.validate_pattern(pattern);
        }
    }
    
    fn validate_pattern(&mut self, pattern: &parser::ast::Pattern) {
        use parser::ast::*;
        
        match pattern {
            Pattern::Node(node) => self.validate_node_pattern(node),
            Pattern::Relationship(rel) => self.validate_relationship_pattern(rel),
            Pattern::Path(parts) => {
                for part in parts {
                    match &part.element {
                        PatternElement::Node(node) => self.validate_node_pattern(node),
                        PatternElement::Relationship(rel) => self.validate_relationship_pattern(rel),
                    }
                }
            }
        }
    }
    
    fn validate_node_pattern(&mut self, node: &parser::ast::NodePattern) {
        for label in &node.labels {
            if !self.known_types.contains(label) {
                self.diagnostics.add_warning(
                    ErrorCode::UndefinedType,
                    format!("Unknown node type '{}'", label),
                    node.location,
                );
            }
        }
        
        if let Some(properties) = &node.properties {
            for prop in properties {
                for label in &node.labels {
                    if let Some((_, type_props)) = self.known_properties.iter().find(|(t, _)| t == label) {
                        if !type_props.contains(&prop.key) {
                            self.diagnostics.add_warning(
                                ErrorCode::UndefinedProperty,
                                format!("Property '{}' not defined for type '{}'", prop.key, label),
                                prop.location,
                            );
                        }
                    }
                }
                self.validate_expression(&prop.value);
            }
        }
    }
    
    fn validate_relationship_pattern(&mut self, rel: &parser::ast::RelationshipPattern) {
        for rel_type in &rel.types {
            if !self.known_types.contains(rel_type) {
                self.diagnostics.add_warning(
                    ErrorCode::UndefinedType,
                    format!("Unknown relationship type '{}'", rel_type),
                    rel.location,
                );
            }
        }
        
        if let Some(properties) = &rel.properties {
            for prop in properties {
                self.validate_expression(&prop.value);
            }
        }
        
        if let Some(range) = &rel.range {
            if let (Some(min), Some(max)) = (range.min, range.max) {
                if min > max {
                    self.diagnostics.add_error(
                        ErrorCode::InvalidPattern,
                        format!("Range minimum ({}) is greater than maximum ({})", min, max),
                        range.location,
                    );
                }
            }
        }
    }
    
    fn validate_where_clause(&mut self, clause: &parser::ast::WhereClause) {
        self.validate_expression(&clause.predicate);
    }
    
    fn validate_return_clause(&mut self, clause: &parser::ast::ReturnClause) {
        if clause.items.is_empty() {
            self.diagnostics.add_error(
                ErrorCode::InvalidClause,
                "RETURN clause must have at least one item".to_string(),
                clause.location,
            );
        }
        
        for item in &clause.items {
            self.validate_expression(&item.expression);
        }
    }
    
    fn validate_with_clause(&mut self, clause: &parser::ast::WithClause) {
        for item in &clause.items {
            self.validate_expression(&item.expression);
        }
    }
    
    fn validate_order_by(&mut self, clause: &parser::ast::OrderByClause) {
        for item in &clause.items {
            self.validate_expression(&item.expression);
        }
    }
    
    fn validate_group_by(&mut self, clause: &parser::ast::GroupByClause) {
        for expr in &clause.expressions {
            self.validate_expression(expr);
        }
    }
    
    fn validate_having(&mut self, clause: &parser::ast::HavingClause) {
        self.validate_expression(&clause.predicate);
    }
    
    fn validate_limit(&mut self, clause: &parser::ast::LimitClause) {
        self.validate_expression(&clause.value);
    }
    
    fn validate_skip(&mut self, clause: &parser::ast::SkipClause) {
        self.validate_expression(&clause.value);
    }
    
    fn validate_create(&mut self, clause: &parser::ast::CreateClause) {
        for pattern in &clause.patterns {
            self.validate_pattern(pattern);
        }
    }
    
    fn validate_delete(&mut self, clause: &parser::ast::DeleteClause) {
        for expr in &clause.expressions {
            self.validate_expression(expr);
        }
    }
    
    fn validate_set(&mut self, clause: &parser::ast::SetClause) {
        for assignment in &clause.assignments {
            self.validate_expression(&assignment.target);
            self.validate_expression(&assignment.value);
        }
    }
    
    fn validate_merge(&mut self, clause: &parser::ast::MergeClause) {
        self.validate_pattern(&clause.pattern);
    }
    
    fn validate_unwind(&mut self, clause: &parser::ast::UnwindClause) {
        self.validate_expression(&clause.expression);
    }
    
    fn validate_call(&mut self, clause: &parser::ast::CallClause) {
        self.validate_expression(&clause.procedure);
    }
    
    fn validate_expression(&mut self, expr: &parser::ast::Expression) {
        use parser::ast::*;
        
        match expr {
            Expression::BinaryOp { left, right, .. } => {
                self.validate_expression(left);
                self.validate_expression(right);
            }
            Expression::UnaryOp { operand, .. } => {
                self.validate_expression(operand);
            }
            Expression::FunctionCall { name, arguments, location } => {
                let func = self.known_functions.iter().find(|f| f.name == *name);
                match func {
                    Some(sig) => {
                        if arguments.len() < sig.min_args || arguments.len() > sig.max_args {
                            self.diagnostics.add_error(
                                ErrorCode::InvalidArgument,
                                format!(
                                    "Function '{}' expects {} to {} arguments, got {}",
                                    name, sig.min_args, sig.max_args, arguments.len()
                                ),
                                *location,
                            );
                        }
                    }
                    None => {
                        self.diagnostics.add_warning(
                            ErrorCode::InvalidFunction,
                            format!("Unknown function '{}'", name),
                            *location,
                        );
                    }
                }
                
                for arg in arguments {
                    self.validate_expression(arg);
                }
            }
            Expression::PropertyAccess { object, property, location } => {
                self.validate_expression(object);
                if property.is_empty() {
                    self.diagnostics.add_error(
                        ErrorCode::UndefinedProperty,
                        "Property name cannot be empty".to_string(),
                        *location,
                    );
                }
            }
            Expression::CaseExpression { cases, default, .. } => {
                for case in cases {
                    self.validate_expression(&case.condition);
                    self.validate_expression(&case.result);
                }
                if let Some(default_expr) = default {
                    self.validate_expression(default_expr);
                }
            }
            Expression::In { value, list, .. } => {
                self.validate_expression(value);
                self.validate_expression(list);
            }
            Expression::List(elements) => {
                for element in elements {
                    self.validate_expression(element);
                }
            }
            Expression::Map(entries) => {
                for (_, value) in entries {
                    self.validate_expression(value);
                }
            }
            _ => {}
        }
    }
}
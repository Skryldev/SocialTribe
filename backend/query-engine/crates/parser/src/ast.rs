use serde::{Deserialize, Serialize};
use lexer::SourceLocation;

/// Represents a complete query
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Query {
    /// All clauses in the query
    pub clauses: Vec<Clause>,
}

/// All possible clause types
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Clause {
    Match(MatchClause),
    OptionalMatch(OptionalMatchClause),
    Where(WhereClause),
    Return(ReturnClause),
    With(WithClause),
    OrderBy(OrderByClause),
    GroupBy(GroupByClause),
    Having(HavingClause),
    Limit(LimitClause),
    Skip(SkipClause),
    Create(CreateClause),
    Delete(DeleteClause),
    Set(SetClause),
    Merge(MergeClause),
    Unwind(UnwindClause),
    Call(CallClause),
}

/// MATCH clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MatchClause {
    pub patterns: Vec<Pattern>,
    pub location: SourceLocation,
}

/// OPTIONAL MATCH clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OptionalMatchClause {
    pub patterns: Vec<Pattern>,
    pub location: SourceLocation,
}

/// WHERE clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WhereClause {
    pub predicate: Expression,
    pub location: SourceLocation,
}

/// RETURN clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReturnClause {
    pub distinct: bool,
    pub items: Vec<ReturnItem>,
    pub location: SourceLocation,
}

/// Return item
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReturnItem {
    pub expression: Expression,
    pub alias: Option<String>,
    pub location: SourceLocation,
}

/// WITH clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WithClause {
    pub items: Vec<ReturnItem>,
    pub location: SourceLocation,
}

/// ORDER BY clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OrderByClause {
    pub items: Vec<OrderByItem>,
    pub location: SourceLocation,
}

/// Order by item
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OrderByItem {
    pub expression: Expression,
    pub direction: OrderDirection,
    pub location: SourceLocation,
}

/// Sort direction
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum OrderDirection {
    Ascending,
    Descending,
}

/// GROUP BY clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GroupByClause {
    pub expressions: Vec<Expression>,
    pub location: SourceLocation,
}

/// HAVING clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HavingClause {
    pub predicate: Expression,
    pub location: SourceLocation,
}

/// LIMIT clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LimitClause {
    pub value: Expression,
    pub location: SourceLocation,
}

/// SKIP clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SkipClause {
    pub value: Expression,
    pub location: SourceLocation,
}

/// CREATE clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CreateClause {
    pub patterns: Vec<Pattern>,
    pub location: SourceLocation,
}

/// DELETE clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DeleteClause {
    pub expressions: Vec<Expression>,
    pub location: SourceLocation,
}

/// SET clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SetClause {
    pub assignments: Vec<Assignment>,
    pub location: SourceLocation,
}

/// Assignment for SET clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Assignment {
    pub target: Expression,
    pub value: Expression,
    pub location: SourceLocation,
}

/// MERGE clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MergeClause {
    pub pattern: Pattern,
    pub location: SourceLocation,
}

/// UNWIND clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UnwindClause {
    pub expression: Expression,
    pub variable: String,
    pub location: SourceLocation,
}

/// CALL clause
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CallClause {
    pub procedure: Expression,
    pub location: SourceLocation,
}

/// Pattern for matching nodes and relationships
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Pattern {
    Node(NodePattern),
    Relationship(RelationshipPattern),
    Path(Vec<PatternPart>),
}

/// Part of a path pattern
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PatternPart {
    pub element: PatternElement,
    pub connection: Option<PatternConnection>,
}

/// Element in a pattern (node or relationship)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum PatternElement {
    Node(NodePattern),
    Relationship(RelationshipPattern),
}

/// Connection between pattern parts
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum PatternConnection {
    Forward,
    Reverse,
    Undirected,

}

/// Node pattern
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NodePattern {
    pub variable: Option<String>,
    pub labels: Vec<String>,
    pub properties: Option<Vec<PropertyPattern>>,
    pub location: SourceLocation,
}

/// Relationship pattern
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RelationshipPattern {
    pub variable: Option<String>,
    pub types: Vec<String>,
    pub properties: Option<Vec<PropertyPattern>>,
    pub direction: Option<PatternConnection>,
    pub range: Option<PathRange>,
    pub location: SourceLocation,
}

/// Property pattern
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PropertyPattern {
    pub key: String,
    pub value: Expression,
    pub location: SourceLocation,
}

/// Range for variable-length paths
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PathRange {
    pub min: Option<i64>,
    pub max: Option<i64>,
    pub location: SourceLocation,
}

/// Expression types
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Expression {
    /// Literal values
    Literal(Literal),
    /// Variable reference
    Variable(String),
    /// Property access (variable.property)
    PropertyAccess {
        object: Box<Expression>,
        property: String,
        location: SourceLocation,
    },
    /// Parameter reference ($param)
    Parameter(String),
    /// Binary operation
    BinaryOp {
        left: Box<Expression>,
        operator: BinaryOperator,
        right: Box<Expression>,
        location: SourceLocation,
    },
    /// Unary operation
    UnaryOp {
        operator: UnaryOperator,
        operand: Box<Expression>,
        location: SourceLocation,
    },
    /// Function call
    FunctionCall {
        name: String,
        arguments: Vec<Expression>,
        location: SourceLocation,
    },
    /// CASE expression
    CaseExpression {
        cases: Vec<CaseBranch>,
        default: Option<Box<Expression>>,
        location: SourceLocation,
    },
    /// List literal
    List(Vec<Expression>),
    /// Map literal
    Map(Vec<(String, Expression)>),
    /// IN operator
    In {
        value: Box<Expression>,
        list: Box<Expression>,
        location: SourceLocation,
    },
    /// Pattern predicate (EXISTS)
    Exists {
        pattern: Box<Pattern>,
        location: SourceLocation,
    },
}

/// Case branch
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CaseBranch {
    pub condition: Expression,
    pub result: Expression,
    pub location: SourceLocation,
}

/// Binary operators
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum BinaryOperator {
    Add,
    Subtract,
    Multiply,
    Divide,
    Modulo,
    Equals,
    NotEquals,
    LessThan,
    GreaterThan,
    LessThanOrEqual,
    GreaterThanOrEqual,
    And,
    Or,
    RegexMatch,
    StartsWith,
    EndsWith,
    Contains,
}

/// Unary operators
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum UnaryOperator {
    Not,
    Negate,
    IsNull,
    IsNotNull,
}

/// Literal values
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Literal {
    Integer(i64),
    Float(f64),
    String(String),
    Boolean(bool),
    Null,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_query_creation() {
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
    fn test_node_pattern() {
        let node = NodePattern {
            variable: Some("n".to_string()),
            labels: vec!["socialUser".to_string()],
            properties: None,
            location: SourceLocation::new(1, 1, 0),
        };
        
        assert_eq!(node.variable, Some("n".to_string()));
        assert_eq!(node.labels, vec!["socialUser".to_string()]);
    }

    #[test]
    fn test_relationship_pattern() {
        let rel = RelationshipPattern {
            variable: Some("e".to_string()),
            types: vec!["weightedEdge".to_string()],
            properties: Some(vec![
                PropertyPattern {
                    key: "Weight".to_string(),
                    value: Expression::Literal(Literal::Integer(5)),
                    location: SourceLocation::new(1, 20, 19),
                }
            ]),
            direction: Some(PatternConnection::Forward),
            range: None,
            location: SourceLocation::new(1, 1, 0),
        };
        
        assert_eq!(rel.types, vec!["weightedEdge".to_string()]);
        assert_eq!(rel.properties.unwrap().len(), 1);
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
            Expression::BinaryOp { operator, .. } => {
                assert_eq!(operator, BinaryOperator::Add);
            }
            _ => panic!("Expected BinaryOp"),
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
            Expression::CaseExpression { cases, .. } => {
                assert_eq!(cases.len(), 1);
            }
            _ => panic!("Expected CaseExpression"),
        }
    }
}
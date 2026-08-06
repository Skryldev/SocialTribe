use crate::ast::*;
use lexer::{Token, TokenType, SourceLocation};
use thiserror::Error;

/// Errors that can occur during parsing
#[derive(Error, Debug, Clone, PartialEq)]
pub enum ParserError {
    #[error("Unexpected token {found} at {location}, expected {expected}")]
    UnexpectedToken {
        found: String,
        expected: String,
        location: SourceLocation,
    },
    
    #[error("Unexpected end of input at {0}")]
    UnexpectedEOF(SourceLocation),
    
    #[error("Invalid query structure at {location}: {message}")]
    InvalidQuery {
        location: SourceLocation,
        message: String,
    },
    
    #[error("Syntax error at {location}: {message}")]
    SyntaxError {
        location: SourceLocation,
        message: String,
    },
}

/// Recursive descent parser for the graph query language
pub struct Parser {
    tokens: Vec<Token>,
    position: usize,
}

impl Parser {
    /// Creates a new parser from tokens
    pub fn new(tokens: Vec<Token>) -> Self {
        Parser {
            tokens,
            position: 0,
        }
    }
    
    /// Returns the current token
    fn current(&self) -> &Token {
        &self.tokens[self.position]
    }
    
    /// Returns the current token type
    fn current_type(&self) -> &TokenType {
        self.current().token_type()
    }
    
    /// Returns the current location
    fn current_location(&self) -> SourceLocation {
        self.current().location
    }
    
    /// Checks if current token matches a type
    fn check(&self, token_type: &TokenType) -> bool {
        std::mem::discriminant(self.current_type()) == std::mem::discriminant(token_type)
    }
    
    /// Consumes the current token if it matches
    fn consume(&mut self, token_type: &TokenType) -> Result<&Token, ParserError> {
        if self.check(token_type) {
            let token = &self.tokens[self.position];
            self.position += 1;
            Ok(token)
        } else {
            Err(ParserError::UnexpectedToken {
                found: format!("{}", self.current_type()),
                expected: format!("{}", token_type),
                location: self.current_location(),
            })
        }
    }
    
    /// Advances to the next token
    fn advance(&mut self) {
        if self.position < self.tokens.len() - 1 {
            self.position += 1;
        }
    }
    
    /// Parses a complete query
    pub fn parse_query(&mut self) -> Result<Query, ParserError> {
        let mut clauses = Vec::new();
        
        while !matches!(self.current_type(), TokenType::EOF) {
            let clause = self.parse_clause()?;
            clauses.push(clause);
            
            // Optional semicolon
            if matches!(self.current_type(), TokenType::Semicolon) {
                self.advance();
                break;
            }
        }
        
        Ok(Query { clauses })
    }
    
    /// Parses a single clause
    fn parse_clause(&mut self) -> Result<Clause, ParserError> {
        match self.current_type() {
            TokenType::Match => self.parse_match_clause(),
            TokenType::Optional => self.parse_optional_match_clause(),
            TokenType::Where => self.parse_where_clause(),
            TokenType::Return => self.parse_return_clause(),
            TokenType::With => self.parse_with_clause(),
            TokenType::Order => self.parse_order_by_clause(),
            TokenType::Group => self.parse_group_by_clause(),
            TokenType::Having => self.parse_having_clause(),
            TokenType::Limit => self.parse_limit_clause(),
            TokenType::Skip => self.parse_skip_clause(),
            TokenType::Create => self.parse_create_clause(),
            TokenType::Delete => self.parse_delete_clause(),
            TokenType::Set => self.parse_set_clause(),
            TokenType::Merge => self.parse_merge_clause(),
            TokenType::Unwind => self.parse_unwind_clause(),
            TokenType::Call => self.parse_call_clause(),
            _ => Err(ParserError::UnexpectedToken {
                found: format!("{}", self.current_type()),
                expected: "clause".to_string(),
                location: self.current_location(),
            }),
        }
    }
    
    /// Parses MATCH clause
    fn parse_match_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip MATCH
        
        let mut patterns = Vec::new();
        
        loop {
            let pattern = self.parse_pattern()?;
            patterns.push(pattern);
            
            if !matches!(self.current_type(), TokenType::Comma) {
                break;
            }
            self.advance(); // Skip comma
        }
        
        Ok(Clause::Match(MatchClause { patterns, location }))
    }
    
    /// Parses OPTIONAL MATCH clause
    fn parse_optional_match_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip OPTIONAL
        self.consume(&TokenType::Match)?;
        
        let mut patterns = Vec::new();
        
        loop {
            let pattern = self.parse_pattern()?;
            patterns.push(pattern);
            
            if !matches!(self.current_type(), TokenType::Comma) {
                break;
            }
            self.advance();
        }
        
        Ok(Clause::OptionalMatch(OptionalMatchClause { patterns, location }))
    }
    
    /// Parses a pattern (node, relationship, or path)
    fn parse_pattern(&mut self) -> Result<Pattern, ParserError> {
        let first_node = self.parse_node_pattern()?;

        if !matches!(self.current_type(), TokenType::Minus) {
            return Ok(Pattern::Node(first_node));
        }

        let mut parts: Vec<PatternPart> = vec![PatternPart {
            element: PatternElement::Node(first_node),
            connection: None,
        }];

        loop {
            if !matches!(self.current_type(), TokenType::Minus) {
                break;
            }

            let saved = self.position;
            self.advance(); // consume `-`

            let _direction = match self.current_type() {
                TokenType::LeftBracket => {
                    PatternConnection::Forward
                }
                TokenType::Arrow => {
                    self.advance();
                    if !matches!(self.current_type(), TokenType::LeftParen) {
                        self.position = saved;
                        break;
                    }
                    let right = self.parse_node_pattern()?;
                    parts.push(PatternPart {
                        element: PatternElement::Node(right),
                        connection: Some(PatternConnection::Forward),
                    });
                    continue;
                }
                _ => {
                    self.position = saved;
                    break;
                }
            };

            let rel = self.parse_relationship_pattern()?;

            let conn = match self.current_type() {
                TokenType::Arrow => {
                    self.advance();
                    PatternConnection::Forward
                }
                TokenType::ReverseArrow => {
                    self.advance();
                    PatternConnection::Reverse
                }
                TokenType::Minus => {
                    self.advance();
                    PatternConnection::Undirected
                }
                TokenType::DoubleDash => {
                    self.advance();
                    PatternConnection::Undirected
                }
                _ => PatternConnection::Undirected,
            };

            parts.push(PatternPart {
                element: PatternElement::Relationship(rel),
                connection: Some(conn),
            });

            if !matches!(self.current_type(), TokenType::LeftParen) {
                break;
            }
            let right = self.parse_node_pattern()?;
            parts.push(PatternPart {
                element: PatternElement::Node(right),
                connection: None,
            });
        }

        if parts.len() == 1 {
            match parts.remove(0).element {
                PatternElement::Node(n) => Ok(Pattern::Node(n)),
                PatternElement::Relationship(r) => Ok(Pattern::Relationship(r)),
            }
        } else {
            Ok(Pattern::Path(parts))
        }
    }
    
    /// Parses a pattern element
    #[allow(dead_code)]
    fn parse_pattern_element(&mut self) -> Result<PatternElement, ParserError> {
        match self.current_type() {
            TokenType::LeftParen => {
                let node = self.parse_node_pattern()?;
                Ok(PatternElement::Node(node))
            }
            TokenType::LeftBracket => {
                let rel = self.parse_relationship_pattern()?;
                Ok(PatternElement::Relationship(rel))
            }
            _ => Err(ParserError::UnexpectedToken {
                found: format!("{}", self.current_type()),
                expected: "pattern element".to_string(),
                location: self.current_location(),
            }),
        }
    }
    
    /// Parses a pattern connection
    #[allow(dead_code)]
    fn parse_pattern_connection(&mut self) -> Result<Option<PatternConnection>, ParserError> {
        match self.current_type() {
            TokenType::Arrow => {
                self.advance();
                Ok(Some(PatternConnection::Forward))
            }
            TokenType::ReverseArrow => {
                self.advance();
                Ok(Some(PatternConnection::Reverse))
            }
            TokenType::DoubleDash => {
                self.advance();
                Ok(Some(PatternConnection::Undirected))
            }
            TokenType::Minus => {
                self.advance();
                if matches!(self.current_type(), TokenType::Arrow) {
                    self.advance();
                    Ok(Some(PatternConnection::Forward))
                } else if matches!(self.current_type(), TokenType::LeftBracket | TokenType::Minus) {
                    Ok(Some(PatternConnection::Undirected))
                } else {
                    self.position -= 1;
                    Ok(None)
                }
            }
            _ => Ok(None),
        }
    }
    
    /// Parses a node pattern
    fn parse_node_pattern(&mut self) -> Result<NodePattern, ParserError> {
        let location = self.current_location();
        self.consume(&TokenType::LeftParen)?;
        
        let variable = if let TokenType::Identifier(name) = self.current_type() {
            let name = name.clone();
            self.advance();
            Some(name)
        } else {
            None
        };
        
        let mut labels = Vec::new();
        while matches!(self.current_type(), TokenType::Colon) {
            self.advance();
            if let TokenType::TypeName(label) = self.current_type() {
                labels.push(label.clone());
                self.advance();
            } else if let TokenType::Identifier(id) = self.current_type() {
                labels.push(id.clone());
                self.advance();
            } else {
                return Err(ParserError::UnexpectedToken {
                    found: format!("{}", self.current_type()),
                    expected: "type name".to_string(),
                    location: self.current_location(),
                });
            }
        }
        
        let properties = if matches!(self.current_type(), TokenType::LeftBrace) {
            self.advance();
            let mut props = Vec::new();
            
            loop {
                let key = if let TokenType::Identifier(key) = self.current_type() {
                    let key = key.clone();
                    self.advance();
                    key
                } else {
                    return Err(ParserError::UnexpectedToken {
                        found: format!("{}", self.current_type()),
                        expected: "property key".to_string(),
                        location: self.current_location(),
                    });
                };
                
                self.consume(&TokenType::Colon)?;
                let value = self.parse_expression()?;
                
                props.push(PropertyPattern {
                    key,
                    value,
                    location: self.current_location(),
                });
                
                if !matches!(self.current_type(), TokenType::Comma) {
                    break;
                }
                self.advance();
            }
            
            self.consume(&TokenType::RightBrace)?;
            Some(props)
        } else {
            None
        };
        
        self.consume(&TokenType::RightParen)?;
        
        Ok(NodePattern {
            variable,
            labels,
            properties,
            location,
        })
    }
    
    /// Parses a relationship pattern
    fn parse_relationship_pattern(&mut self) -> Result<RelationshipPattern, ParserError> {
        let location = self.current_location();
        self.consume(&TokenType::LeftBracket)?;
        
        let variable = if let TokenType::Identifier(name) = self.current_type() {
            let name = name.clone();
            self.advance();
            Some(name)
        } else {
            None
        };
        
        let mut types = Vec::new();
        while matches!(self.current_type(), TokenType::Colon) {
            self.advance();
            if let TokenType::TypeName(t) = self.current_type() {
                types.push(t.clone());
                self.advance();
            } else if let TokenType::Identifier(id) = self.current_type() {
                types.push(id.clone());
                self.advance();
            }
        }
        
        let range = if matches!(self.current_type(), TokenType::Multiply) {
            self.advance();
            let range = self.parse_path_range()?;
            Some(range)
        } else {
            None
        };
        
        let properties = if matches!(self.current_type(), TokenType::LeftBrace) {
            self.advance();
            let mut props = Vec::new();
            
            loop {
                let key = if let TokenType::Identifier(key) = self.current_type() {
                    let key = key.clone();
                    self.advance();
                    key
                } else {
                    return Err(ParserError::UnexpectedToken {
                        found: format!("{}", self.current_type()),
                        expected: "property key".to_string(),
                        location: self.current_location(),
                    });
                };
                
                self.consume(&TokenType::Colon)?;
                let value = self.parse_expression()?;
                
                props.push(PropertyPattern {
                    key,
                    value,
                    location: self.current_location(),
                });
                
                if !matches!(self.current_type(), TokenType::Comma) {
                    break;
                }
                self.advance();
            }
            
            self.consume(&TokenType::RightBrace)?;
            Some(props)
        } else {
            None
        };
        
        self.consume(&TokenType::RightBracket)?;
        
        Ok(RelationshipPattern {
            variable,
            types,
            properties,
            direction: None,
            range,
            location,
        })
    }
    
    /// Parses a path range
    fn parse_path_range(&mut self) -> Result<PathRange, ParserError> {
        let location = self.current_location();

        let min = if let TokenType::IntegerLiteral(n) = self.current_type() {
            let n = *n;
            self.advance();
            Some(n)
        } else {
            None
        };

        let has_dotdot = matches!(self.current_type(), TokenType::Period);

        let max = if has_dotdot {
            self.advance();
            if matches!(self.current_type(), TokenType::Period) {
                self.advance();
            } else {
                return Err(ParserError::UnexpectedToken {
                    found: format!("{}", self.current_type()),
                    expected: "..".to_string(),
                    location: self.current_location(),
                });
            }

            if let TokenType::IntegerLiteral(n) = self.current_type() {
                let n = *n;
                self.advance();
                Some(n)
            } else {
                None
            }
        } else {
            None
        };

        Ok(PathRange { min, max, location })
    }
    
    /// Parses WHERE clause
    fn parse_where_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip WHERE
        
        let predicate = self.parse_expression()?;
        
        Ok(Clause::Where(WhereClause { predicate, location }))
    }
    
    /// Parses RETURN clause
    fn parse_return_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip RETURN
        
        let distinct = if matches!(self.current_type(), TokenType::Distinct) {
            self.advance();
            true
        } else {
            false
        };
        
        let mut items = Vec::new();
        
        loop {
            let item = self.parse_return_item()?;
            items.push(item);
            
            if !matches!(self.current_type(), TokenType::Comma) {
                break;
            }
            self.advance();
        }
        
        Ok(Clause::Return(ReturnClause {
            distinct,
            items,
            location,
        }))
    }
    
    /// Parses a return item
    fn parse_return_item(&mut self) -> Result<ReturnItem, ParserError> {
        let location = self.current_location();
        let expression = self.parse_expression()?;
        
        let alias = if matches!(self.current_type(), TokenType::As) {
            self.advance();
            if let TokenType::Identifier(name) = self.current_type() {
                let name = name.clone();
                self.advance();
                Some(name)
            } else {
                return Err(ParserError::UnexpectedToken {
                    found: format!("{}", self.current_type()),
                    expected: "alias name".to_string(),
                    location: self.current_location(),
                });
            }
        } else {
            None
        };
        
        Ok(ReturnItem {
            expression,
            alias,
            location,
        })
    }
    
    /// Parses WITH clause
    fn parse_with_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip WITH
        
        let mut items = Vec::new();
        
        loop {
            let item = self.parse_return_item()?;
            items.push(item);
            
            if !matches!(self.current_type(), TokenType::Comma) {
                break;
            }
            self.advance();
        }
        
        Ok(Clause::With(WithClause { items, location }))
    }
    
    /// Parses ORDER BY clause
    fn parse_order_by_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip ORDER
        self.consume(&TokenType::By)?;
        
        let mut items = Vec::new();
        
        loop {
            let item_location = self.current_location();
            let expression = self.parse_expression()?;
            
            let direction = match self.current_type() {
                TokenType::Asc => {
                    self.advance();
                    OrderDirection::Ascending
                }
                TokenType::Desc => {
                    self.advance();
                    OrderDirection::Descending
                }
                _ => OrderDirection::Ascending,
            };
            
            items.push(OrderByItem {
                expression,
                direction,
                location: item_location,
            });
            
            if !matches!(self.current_type(), TokenType::Comma) {
                break;
            }
            self.advance();
        }
        
        Ok(Clause::OrderBy(OrderByClause { items, location }))
    }
    
    /// Parses GROUP BY clause
    fn parse_group_by_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip GROUP
        self.consume(&TokenType::By)?;
        
        let mut expressions = Vec::new();
        
        loop {
            let expr = self.parse_expression()?;
            expressions.push(expr);
            
            if !matches!(self.current_type(), TokenType::Comma) {
                break;
            }
            self.advance();
        }
        
        Ok(Clause::GroupBy(GroupByClause { expressions, location }))
    }
    
    /// Parses HAVING clause
    fn parse_having_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip HAVING
        
        let predicate = self.parse_expression()?;
        
        Ok(Clause::Having(HavingClause { predicate, location }))
    }
    
    /// Parses LIMIT clause
    fn parse_limit_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip LIMIT
        
        let value = self.parse_expression()?;
        
        Ok(Clause::Limit(LimitClause { value, location }))
    }
    
    /// Parses SKIP clause
    fn parse_skip_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip SKIP
        
        let value = self.parse_expression()?;
        
        Ok(Clause::Skip(SkipClause { value, location }))
    }
    
    /// Parses CREATE clause
    fn parse_create_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip CREATE
        
        let mut patterns = Vec::new();
        
        loop {
            let pattern = self.parse_pattern()?;
            patterns.push(pattern);
            
            if !matches!(self.current_type(), TokenType::Comma) {
                break;
            }
            self.advance();
        }
        
        Ok(Clause::Create(CreateClause { patterns, location }))
    }
    
    /// Parses DELETE clause
    fn parse_delete_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip DELETE
        
        let mut expressions = Vec::new();
        
        loop {
            let expr = self.parse_expression()?;
            expressions.push(expr);
            
            if !matches!(self.current_type(), TokenType::Comma) {
                break;
            }
            self.advance();
        }
        
        Ok(Clause::Delete(DeleteClause { expressions, location }))
    }
    
    /// Parses SET clause
    fn parse_set_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip SET
        
        let mut assignments = Vec::new();
        
        loop {
            let assign_location = self.current_location();
            let target = self.parse_expression()?;
            self.consume(&TokenType::Equals)?;
            let value = self.parse_expression()?;
            
            assignments.push(Assignment {
                target,
                value,
                location: assign_location,
            });
            
            if !matches!(self.current_type(), TokenType::Comma) {
                break;
            }
            self.advance();
        }
        
        Ok(Clause::Set(SetClause { assignments, location }))
    }
    
    /// Parses MERGE clause
    fn parse_merge_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip MERGE
        
        let pattern = self.parse_pattern()?;
        
        Ok(Clause::Merge(MergeClause { pattern, location }))
    }
    
    /// Parses UNWIND clause
    fn parse_unwind_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip UNWIND
        
        let expression = self.parse_expression()?;
        
        self.consume(&TokenType::As)?;
        
        let variable = if let TokenType::Identifier(name) = self.current_type() {
            let name = name.clone();
            self.advance();
            name
        } else {
            return Err(ParserError::UnexpectedToken {
                found: format!("{}", self.current_type()),
                expected: "variable name".to_string(),
                location: self.current_location(),
            });
        };
        
        Ok(Clause::Unwind(UnwindClause {
            expression,
            variable,
            location,
        }))
    }
    
    /// Parses CALL clause
    fn parse_call_clause(&mut self) -> Result<Clause, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip CALL
        
        let procedure = self.parse_expression()?;
        
        Ok(Clause::Call(CallClause { procedure, location }))
    }
    
    /// Parses an expression with proper precedence
    fn parse_expression(&mut self) -> Result<Expression, ParserError> {
        self.parse_or_expression()
    }
    
    /// Parses OR expression
    fn parse_or_expression(&mut self) -> Result<Expression, ParserError> {
        let mut left = self.parse_and_expression()?;
        
        while matches!(self.current_type(), TokenType::Or) {
            let location = self.current_location();
            self.advance();
            let right = self.parse_and_expression()?;
            left = Expression::BinaryOp {
                left: Box::new(left),
                operator: BinaryOperator::Or,
                right: Box::new(right),
                location,
            };
        }
        
        Ok(left)
    }
    
    /// Parses AND expression
    fn parse_and_expression(&mut self) -> Result<Expression, ParserError> {
        let mut left = self.parse_comparison_expression()?;
        
        while matches!(self.current_type(), TokenType::And) {
            let location = self.current_location();
            self.advance();
            let right = self.parse_comparison_expression()?;
            left = Expression::BinaryOp {
                left: Box::new(left),
                operator: BinaryOperator::And,
                right: Box::new(right),
                location,
            };
        }
        
        Ok(left)
    }
    
    /// Parses comparison expressions
    fn parse_comparison_expression(&mut self) -> Result<Expression, ParserError> {
        let mut left = self.parse_additive_expression()?;
        
        loop {
            let location = self.current_location();
            let op = match self.current_type() {
                TokenType::Equals => { self.advance(); BinaryOperator::Equals }
                TokenType::NotEquals => { self.advance(); BinaryOperator::NotEquals }
                TokenType::LessThan => { self.advance(); BinaryOperator::LessThan }
                TokenType::GreaterThan => { self.advance(); BinaryOperator::GreaterThan }
                TokenType::LessThanOrEqual => { self.advance(); BinaryOperator::LessThanOrEqual }
                TokenType::GreaterThanOrEqual => { self.advance(); BinaryOperator::GreaterThanOrEqual }
                TokenType::RegexMatch => { self.advance(); BinaryOperator::RegexMatch }
                TokenType::StartsWith => { self.advance(); BinaryOperator::StartsWith }
                TokenType::EndsWith => { self.advance(); BinaryOperator::EndsWith }
                TokenType::Contains => { self.advance(); BinaryOperator::Contains }
                TokenType::In => {
                    self.advance();
                    let right = self.parse_expression()?;
                    left = Expression::In {
                        value: Box::new(left),
                        list: Box::new(right),
                        location,
                    };
                    continue;
                }
                _ => break,
            };
            
            let right = self.parse_additive_expression()?;
            left = Expression::BinaryOp {
                left: Box::new(left),
                operator: op,
                right: Box::new(right),
                location,
            };
        }
        
        Ok(left)
    }
    
    /// Parses additive expressions
    fn parse_additive_expression(&mut self) -> Result<Expression, ParserError> {
        let mut left = self.parse_multiplicative_expression()?;
        
        loop {
            let location = self.current_location();
            let op = match self.current_type() {
                TokenType::Plus => { self.advance(); BinaryOperator::Add }
                TokenType::Minus => { self.advance(); BinaryOperator::Subtract }
                _ => break,
            };
            
            let right = self.parse_multiplicative_expression()?;
            left = Expression::BinaryOp {
                left: Box::new(left),
                operator: op,
                right: Box::new(right),
                location,
            };
        }
        
        Ok(left)
    }
    
    /// Parses multiplicative expressions
    fn parse_multiplicative_expression(&mut self) -> Result<Expression, ParserError> {
        let mut left = self.parse_unary_expression()?;
        
        loop {
            let location = self.current_location();
            let op = match self.current_type() {
                TokenType::Multiply => { self.advance(); BinaryOperator::Multiply }
                TokenType::Divide => { self.advance(); BinaryOperator::Divide }
                TokenType::Modulo => { self.advance(); BinaryOperator::Modulo }
                _ => break,
            };
            
            let right = self.parse_unary_expression()?;
            left = Expression::BinaryOp {
                left: Box::new(left),
                operator: op,
                right: Box::new(right),
                location,
            };
        }
        
        Ok(left)
    }
    
    /// Parses unary expressions
    fn parse_unary_expression(&mut self) -> Result<Expression, ParserError> {
        let location = self.current_location();
        
        match self.current_type() {
            TokenType::Not => {
                self.advance();
                let operand = self.parse_unary_expression()?;
                Ok(Expression::UnaryOp {
                    operator: UnaryOperator::Not,
                    operand: Box::new(operand),
                    location,
                })
            }
            TokenType::Minus => {
                self.advance();
                let operand = self.parse_unary_expression()?;
                Ok(Expression::UnaryOp {
                    operator: UnaryOperator::Negate,
                    operand: Box::new(operand),
                    location,
                })
            }
            _ => self.parse_primary_expression(),
        }
    }
    
    /// Parses primary expressions (literals, variables, function calls, etc.)
    fn parse_primary_expression(&mut self) -> Result<Expression, ParserError> {
        let location = self.current_location();
        
        match self.current_type() {
            TokenType::IntegerLiteral(n) => {
                let n = *n;
                self.advance();
                Ok(Expression::Literal(Literal::Integer(n)))
            }
            TokenType::FloatLiteral(n) => {
                let n = *n;
                self.advance();
                Ok(Expression::Literal(Literal::Float(n)))
            }
            TokenType::StringLiteral(s) => {
                let s = s.clone();
                self.advance();
                Ok(Expression::Literal(Literal::String(s)))
            }
            TokenType::True => {
                self.advance();
                Ok(Expression::Literal(Literal::Boolean(true)))
            }
            TokenType::False => {
                self.advance();
                Ok(Expression::Literal(Literal::Boolean(false)))
            }
            TokenType::Null => {
                self.advance();
                Ok(Expression::Literal(Literal::Null))
            }
            TokenType::Identifier(name) => {
                let name = name.clone();
                self.advance();
                
                if matches!(self.current_type(), TokenType::LeftParen) {
                    self.parse_function_call(name, location)
                } else if matches!(self.current_type(), TokenType::Period) {
                    self.parse_property_access(Expression::Variable(name), location)
                } else {
                    Ok(Expression::Variable(name))
                }
            }
            TokenType::TypeName(name) => {
                let name = name.clone();
                self.advance();

                if matches!(self.current_type(), TokenType::LeftParen) {
                    self.parse_function_call(name, location)
                } else if matches!(self.current_type(), TokenType::Period) {
                    self.parse_property_access(Expression::Variable(name), location)
                } else {
                    Ok(Expression::Variable(name))
                }
            }
            TokenType::Parameter(name) => {
                let name = name.clone();
                self.advance();
                Ok(Expression::Parameter(name))
            }
            TokenType::LeftParen => {
                self.advance();
                let expr = self.parse_expression()?;
                self.consume(&TokenType::RightParen)?;
                Ok(expr)
            }
            TokenType::LeftBracket => {
                self.parse_list_literal()
            }
            TokenType::LeftBrace => {
                self.parse_map_literal()
            }
            TokenType::Case => {
                self.parse_case_expression()
            }
            _ => Err(ParserError::UnexpectedToken {
                found: format!("{}", self.current_type()),
                expected: "expression".to_string(),
                location,
            }),
        }
    }
    
    /// Parses a function call
    fn parse_function_call(&mut self, name: String, location: SourceLocation) -> Result<Expression, ParserError> {
        self.consume(&TokenType::LeftParen)?;
        
        let mut arguments = Vec::new();
        
        if !matches!(self.current_type(), TokenType::RightParen) {
            loop {
                let arg = self.parse_expression()?;
                arguments.push(arg);
                
                if !matches!(self.current_type(), TokenType::Comma) {
                    break;
                }
                self.advance();
            }
        }
        
        self.consume(&TokenType::RightParen)?;
        
        Ok(Expression::FunctionCall {
            name,
            arguments,
            location,
        })
    }
    
    /// Parses property access (variable.property)
    fn parse_property_access(&mut self, object: Expression, location: SourceLocation) -> Result<Expression, ParserError> {
        self.advance(); // Skip period
        
        let property = match self.current_type() {
            TokenType::Identifier(name) => {
                let name = name.clone();
                self.advance();
                name
            }
            TokenType::TypeName(name) => {
                let name = name.clone();
                self.advance();
                name
            }
            _ => {
                return Err(ParserError::UnexpectedToken {
                    found: format!("{}", self.current_type()),
                    expected: "property name".to_string(),
                    location: self.current_location(),
                });
            }
        };
        
        Ok(Expression::PropertyAccess {
            object: Box::new(object),
            property,
            location,
        })
    }
    
    /// Parses a list literal
    fn parse_list_literal(&mut self) -> Result<Expression, ParserError> {
        self.advance(); // Skip [
        
        let mut elements = Vec::new();
        
        if !matches!(self.current_type(), TokenType::RightBracket) {
            loop {
                let element = self.parse_expression()?;
                elements.push(element);
                
                if !matches!(self.current_type(), TokenType::Comma) {
                    break;
                }
                self.advance();
            }
        }
        
        self.consume(&TokenType::RightBracket)?;
        
        Ok(Expression::List(elements))
    }
    
    /// Parses a map literal
    fn parse_map_literal(&mut self) -> Result<Expression, ParserError> {
        self.advance(); // Skip {
        
        let mut entries = Vec::new();
        
        if !matches!(self.current_type(), TokenType::RightBrace) {
            loop {
                let key = if let TokenType::Identifier(key) = self.current_type() {
                    let key = key.clone();
                    self.advance();
                    key
                } else if let TokenType::StringLiteral(key) = self.current_type() {
                    let key = key.clone();
                    self.advance();
                    key
                } else {
                    return Err(ParserError::UnexpectedToken {
                        found: format!("{}", self.current_type()),
                        expected: "map key".to_string(),
                        location: self.current_location(),
                    });
                };
                
                self.consume(&TokenType::Colon)?;
                let value = self.parse_expression()?;
                
                entries.push((key, value));
                
                if !matches!(self.current_type(), TokenType::Comma) {
                    break;
                }
                self.advance();
            }
        }
        
        self.consume(&TokenType::RightBrace)?;
        
        Ok(Expression::Map(entries))
    }
    
    /// Parses CASE expression
    fn parse_case_expression(&mut self) -> Result<Expression, ParserError> {
        let location = self.current_location();
        self.advance(); // Skip CASE
        
        let mut cases = Vec::new();
        
        while matches!(self.current_type(), TokenType::When) {
            let when_location = self.current_location();
            self.advance(); // Skip WHEN
            
            let condition = self.parse_expression()?;
            self.consume(&TokenType::Then)?;
            let result = self.parse_expression()?;
            
            cases.push(CaseBranch {
                condition,
                result,
                location: when_location,
            });
        }
        
        let default = if matches!(self.current_type(), TokenType::Else) {
            self.advance(); // Skip ELSE
            let expr = self.parse_expression()?;
            Some(Box::new(expr))
        } else {
            None
        };
        
        self.consume(&TokenType::End)?;
        
        Ok(Expression::CaseExpression {
            cases,
            default,
            location,
        })
    }
}

/// Parses a query from tokens
pub fn parse(tokens: Vec<Token>) -> Result<Query, ParserError> {
    let mut parser = Parser::new(tokens);
    parser.parse_query()
}
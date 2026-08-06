pub mod ast;
pub mod parser;

pub use ast::*;
pub use parser::{Parser, ParserError, parse};

pub fn parse_query(input: &str) -> Result<Query, ParserError> {
    let tokens = lexer::lex(input)
        .map_err(|e| ParserError::SyntaxError {
            location: lexer::SourceLocation::new(0, 0, 0),
            message: format!("Lexer error: {}", e),
        })?;
    
    parse(tokens)
}
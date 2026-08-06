pub mod token;
pub mod lexer;

pub use token::{Token, TokenType, SourceLocation};
pub use lexer::{Lexer, LexerError};

pub fn lex(input: &str) -> Result<Vec<Token>, LexerError> {
    let mut lexer = Lexer::new(input);
    lexer.tokenize()
}
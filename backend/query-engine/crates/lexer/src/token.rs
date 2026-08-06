use serde::{Deserialize, Serialize};

/// Represents a source location with line, column, and offset information
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SourceLocation {
    /// Line number (1-based)
    pub line: usize,
    /// Column number (1-based)
    pub column: usize,
    /// Byte offset from start of input
    pub offset: usize,
}

impl SourceLocation {
    /// Creates a new SourceLocation
    pub fn new(line: usize, column: usize, offset: usize) -> Self {
        SourceLocation { line, column, offset }
    }
    
    /// Returns a default SourceLocation (0, 0, 0)
    pub fn default_location() -> Self {
        SourceLocation { line: 0, column: 0, offset: 0 }
    }
}

impl Default for SourceLocation {
    fn default() -> Self {
        Self::default_location()
    }
}

impl std::fmt::Display for SourceLocation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "line {}, column {}", self.line, self.column)
    }
}

/// All token types in the graph query language
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum TokenType {
    // Keywords
    Match,
    Where,
    Return,
    With,
    Create,
    Delete,
    Set,
    Merge,
    Unwind,
    Call,
    Optional,
    Case,
    When,
    Then,
    Else,
    End,
    Group,
    By,
    Order,
    Limit,
    Skip,
    Having,
    Asc,
    Desc,
    Distinct,
    As,
    On,
    Yield,
    In,
    And,
    Or,
    Not,
    Is,
    Null,
    True,
    False,
    
    // Operators
    Equals,
    NotEquals,
    LessThan,
    GreaterThan,
    LessThanOrEqual,
    GreaterThanOrEqual,
    Plus,
    Minus,
    Multiply,
    Divide,
    Modulo,
    RegexMatch,
    StartsWith,
    EndsWith,
    Contains,
    
    // Punctuation
    LeftParen,
    RightParen,
    LeftBracket,
    RightBracket,
    LeftBrace,
    RightBrace,
    Colon,
    Semicolon,
    Period,
    Comma,
    Arrow,
    ReverseArrow,
    DoubleDash,
    Dollar,
    At,
    QuestionMark,
    Pipe,
    RangeLiteral,
    
    // Literals
    IntegerLiteral(i64),
    FloatLiteral(f64),
    StringLiteral(String),
    BooleanLiteral(bool),
    
    // Identifiers
    Identifier(String),
    Parameter(String),
    TypeName(String),
    
    // Special
    EOF,
}

impl std::fmt::Display for TokenType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TokenType::Match => write!(f, "MATCH"),
            TokenType::Where => write!(f, "WHERE"),
            TokenType::Return => write!(f, "RETURN"),
            TokenType::With => write!(f, "WITH"),
            TokenType::Create => write!(f, "CREATE"),
            TokenType::Delete => write!(f, "DELETE"),
            TokenType::Set => write!(f, "SET"),
            TokenType::Merge => write!(f, "MERGE"),
            TokenType::Unwind => write!(f, "UNWIND"),
            TokenType::Call => write!(f, "CALL"),
            TokenType::Optional => write!(f, "OPTIONAL"),
            TokenType::Case => write!(f, "CASE"),
            TokenType::When => write!(f, "WHEN"),
            TokenType::Then => write!(f, "THEN"),
            TokenType::Else => write!(f, "ELSE"),
            TokenType::End => write!(f, "END"),
            TokenType::Group => write!(f, "GROUP"),
            TokenType::By => write!(f, "BY"),
            TokenType::Order => write!(f, "ORDER"),
            TokenType::Limit => write!(f, "LIMIT"),
            TokenType::Skip => write!(f, "SKIP"),
            TokenType::Having => write!(f, "HAVING"),
            TokenType::Asc => write!(f, "ASC"),
            TokenType::Desc => write!(f, "DESC"),
            TokenType::Distinct => write!(f, "DISTINCT"),
            TokenType::As => write!(f, "AS"),
            TokenType::On => write!(f, "ON"),
            TokenType::Yield => write!(f, "YIELD"),
            TokenType::In => write!(f, "IN"),
            TokenType::And => write!(f, "AND"),
            TokenType::Or => write!(f, "OR"),
            TokenType::Not => write!(f, "NOT"),
            TokenType::Is => write!(f, "IS"),
            TokenType::Null => write!(f, "NULL"),
            TokenType::True => write!(f, "TRUE"),
            TokenType::False => write!(f, "FALSE"),
            TokenType::Equals => write!(f, "="),
            TokenType::NotEquals => write!(f, "<>"),
            TokenType::LessThan => write!(f, "<"),
            TokenType::GreaterThan => write!(f, ">"),
            TokenType::LessThanOrEqual => write!(f, "<="),
            TokenType::GreaterThanOrEqual => write!(f, ">="),
            TokenType::Plus => write!(f, "+"),
            TokenType::Minus => write!(f, "-"),
            TokenType::Multiply => write!(f, "*"),
            TokenType::Divide => write!(f, "/"),
            TokenType::Modulo => write!(f, "%"),
            TokenType::RegexMatch => write!(f, "=~"),
            TokenType::StartsWith => write!(f, "STARTS WITH"),
            TokenType::EndsWith => write!(f, "ENDS WITH"),
            TokenType::Contains => write!(f, "CONTAINS"),
            TokenType::LeftParen => write!(f, "("),
            TokenType::RightParen => write!(f, ")"),
            TokenType::LeftBracket => write!(f, "["),
            TokenType::RightBracket => write!(f, "]"),
            TokenType::LeftBrace => write!(f, "{{"),
            TokenType::RightBrace => write!(f, "}}"),
            TokenType::Colon => write!(f, ":"),
            TokenType::Semicolon => write!(f, ";"),
            TokenType::Period => write!(f, "."),
            TokenType::Comma => write!(f, ","),
            TokenType::Arrow => write!(f, "->"),
            TokenType::ReverseArrow => write!(f, "<-"),
            TokenType::DoubleDash => write!(f, "--"),
            TokenType::Dollar => write!(f, "$"),
            TokenType::At => write!(f, "@"),
            TokenType::QuestionMark => write!(f, "?"),
            TokenType::Pipe => write!(f, "|"),
            TokenType::RangeLiteral => write!(f, "*"),
            TokenType::IntegerLiteral(n) => write!(f, "{}", n),
            TokenType::FloatLiteral(n) => write!(f, "{}", n),
            TokenType::StringLiteral(s) => write!(f, "\"{}\"", s),
            TokenType::BooleanLiteral(b) => write!(f, "{}", b),
            TokenType::Identifier(id) => write!(f, "{}", id),
            TokenType::Parameter(p) => write!(f, "${}", p),
            TokenType::TypeName(t) => write!(f, ":{}", t),
            TokenType::EOF => write!(f, "EOF"),
        }
    }
}

/// A complete token with type, location, and raw text
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Token {
    /// The type of token
    pub token_type: TokenType,
    /// The source location
    pub location: SourceLocation,
    /// The raw text from source
    pub lexeme: String,
}

impl Token {
    /// Creates a new token
    pub fn new(token_type: TokenType, location: SourceLocation, lexeme: String) -> Self {
        Token {
            token_type,
            location,
            lexeme,
        }
    }
    
    /// Returns a reference to the token type
    pub fn token_type(&self) -> &TokenType {
        &self.token_type
    }
    
    /// Returns the source location
    pub fn location(&self) -> &SourceLocation {
        &self.location
    }
    
    /// Returns the raw lexeme
    pub fn lexeme(&self) -> &str {
        &self.lexeme
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_source_location_creation() {
        let loc = SourceLocation::new(1, 5, 4);
        assert_eq!(loc.line, 1);
        assert_eq!(loc.column, 5);
        assert_eq!(loc.offset, 4);
    }

    #[test]
    fn test_source_location_display() {
        let loc = SourceLocation::new(10, 20, 100);
        assert_eq!(format!("{}", loc), "line 10, column 20");
    }

    #[test]
    fn test_token_creation() {
        let loc = SourceLocation::new(1, 1, 0);
        let token = Token::new(
            TokenType::Identifier("test".to_string()),
            loc,
            "test".to_string(),
        );
        assert_eq!(token.lexeme(), "test");
        assert_eq!(token.location(), &loc);
    }

    #[test]
    fn test_keyword_display() {
        assert_eq!(format!("{}", TokenType::Match), "MATCH");
        assert_eq!(format!("{}", TokenType::Return), "RETURN");
        assert_eq!(format!("{}", TokenType::Where), "WHERE");
    }

    #[test]
    fn test_operator_display() {
        assert_eq!(format!("{}", TokenType::Equals), "=");
        assert_eq!(format!("{}", TokenType::Plus), "+");
        assert_eq!(format!("{}", TokenType::Arrow), "->");
    }

    #[test]
    fn test_literal_display() {
        assert_eq!(format!("{}", TokenType::IntegerLiteral(42)), "42");
        assert_eq!(format!("{}", TokenType::StringLiteral("hello".to_string())), "\"hello\"");
        assert_eq!(format!("{}", TokenType::BooleanLiteral(true)), "true");
    }
}
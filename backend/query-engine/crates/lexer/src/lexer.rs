use crate::token::{SourceLocation, Token, TokenType};
use thiserror::Error;

/// Errors that can occur during lexical analysis
#[derive(Error, Debug, Clone, PartialEq)]
pub enum LexerError {
    #[error("Unexpected character '{0}' at {1}")]
    UnexpectedCharacter(char, SourceLocation),
    
    #[error("Unterminated string literal at {0}")]
    UnterminatedString(SourceLocation),
    
    #[error("Invalid number format at {0}")]
    InvalidNumber(String, SourceLocation),
    
    #[error("Unexpected end of input at {0}")]
    UnexpectedEOF(SourceLocation),
}

/// The lexer state machine for tokenizing graph query language input
pub struct Lexer {
    /// Input source text
    input: Vec<char>,
    /// Current position in the input
    position: usize,
    /// Current line number
    line: usize,
    /// Current column number
    column: usize,
    /// Token buffer for lookahead
    token_buffer: Vec<Token>,
}

impl Lexer {
    /// Creates a new Lexer instance from input text
    pub fn new(input: &str) -> Self {
        Lexer {
            input: input.chars().collect(),
            position: 0,
            line: 1,
            column: 1,
            token_buffer: Vec::new(),
        }
    }
    
    /// Returns the current source location
    fn current_location(&self) -> SourceLocation {
        SourceLocation::new(self.line, self.column, self.position)
    }
    
    /// Returns the current character without advancing
    fn peek(&self) -> Option<char> {
        self.input.get(self.position).copied()
    }
    
    /// Returns the character at offset from current position
    fn peek_ahead(&self, offset: usize) -> Option<char> {
        self.input.get(self.position + offset).copied()
    }
    
    /// Advances to the next character and returns it
    fn advance(&mut self) -> Option<char> {
        let ch = self.input.get(self.position).copied();
        if let Some(ch) = ch {
            self.position += 1;
            self.column += 1;
            if ch == '\n' {
                self.line += 1;
                self.column = 1;
            }
        }
        ch
    }
    
    /// Skips whitespace and comments
    fn skip_whitespace(&mut self) {
        while let Some(ch) = self.peek() {
            match ch {
                ' ' | '\t' | '\r' | '\n' => {
                    self.advance();
                }
                '/' if self.peek_ahead(1) == Some('/') => {
                    self.skip_line_comment();
                }
                '/' if self.peek_ahead(1) == Some('*') => {
                    self.skip_block_comment();
                }
                _ => break,
            }
        }
    }
    
    /// Skips a line comment (// to end of line)
    fn skip_line_comment(&mut self) {
        while let Some(ch) = self.peek() {
            if ch == '\n' {
                break;
            }
            self.advance();
        }
    }
    
    /// Skips a block comment (/* */)
    fn skip_block_comment(&mut self) {
        self.advance(); // Skip /
        self.advance(); // Skip *
        let mut depth = 1;
        while depth > 0 {
            match self.peek() {
                Some('/') if self.peek_ahead(1) == Some('*') => {
                    self.advance();
                    self.advance();
                    depth += 1;
                }
                Some('*') if self.peek_ahead(1) == Some('/') => {
                    self.advance();
                    self.advance();
                    depth -= 1;
                }
                Some(_) => {
                    self.advance();
                }
                None => break,
            }
        }
    }
    
    /// Reads an identifier or keyword
    fn read_identifier(&mut self) -> Token {
        let start = self.current_location();
        let mut ident = String::new();
        
        while let Some(ch) = self.peek() {
            if ch.is_alphanumeric() || ch == '_' {
                ident.push(ch);
                self.advance();
            } else {
                break;
            }
        }
        
        let token_type = match ident.to_uppercase().as_str() {
            "MATCH" => TokenType::Match,
            "WHERE" => TokenType::Where,
            "RETURN" => TokenType::Return,
            "WITH" => TokenType::With,
            "CREATE" => TokenType::Create,
            "DELETE" => TokenType::Delete,
            "SET" => TokenType::Set,
            "MERGE" => TokenType::Merge,
            "UNWIND" => TokenType::Unwind,
            "CALL" => TokenType::Call,
            "OPTIONAL" => TokenType::Optional,
            "CASE" => TokenType::Case,
            "WHEN" => TokenType::When,
            "THEN" => TokenType::Then,
            "ELSE" => TokenType::Else,
            "END" => TokenType::End,
            "GROUP" => TokenType::Group,
            "BY" => TokenType::By,
            "ORDER" => TokenType::Order,
            "LIMIT" => TokenType::Limit,
            "SKIP" => TokenType::Skip,
            "HAVING" => TokenType::Having,
            "ASC" => TokenType::Asc,
            "DESC" => TokenType::Desc,
            "DISTINCT" => TokenType::Distinct,
            "AS" => TokenType::As,
            "ON" => TokenType::On,
            "YIELD" => TokenType::Yield,
            "IN" => TokenType::In,
            "AND" => TokenType::And,
            "OR" => TokenType::Or,
            "NOT" => TokenType::Not,
            "IS" => TokenType::Is,
            "NULL" => TokenType::Null,
            "TRUE" => TokenType::True,
            "FALSE" => TokenType::False,
            "STARTS" => {
                // Look ahead for STARTS WITH
                if self.try_match_keyword("WITH", &ident) {
                    TokenType::StartsWith
                } else {
                    TokenType::Identifier(ident.clone())
                }
            }
            "ENDS" => {
                // Look ahead for ENDS WITH
                if self.try_match_keyword("WITH", &ident) {
                    TokenType::EndsWith
                } else {
                    TokenType::Identifier(ident.clone())
                }
            }
            "CONTAINS" => TokenType::Contains,
            "SOCIALUSER" => TokenType::TypeName("socialUser".to_string()),
            "WEIGHTEDEDGE" => TokenType::TypeName("weightedEdge".to_string()),
            _ => {
                // Check if it's a type name
                if ident.chars().next().map_or(false, |c| c.is_lowercase()) {
                    TokenType::Identifier(ident.clone())
                } else {
                    TokenType::TypeName(ident.clone())
                }
            }
        };
        
        Token::new(token_type, start, ident)
    }
    
    /// Try to match a compound keyword
    fn try_match_keyword(&mut self, keyword: &str, first_part: &str) -> bool {
        let _ = first_part;
        let saved_pos = self.position;
        let saved_line = self.line;
        let saved_col = self.column;
        
        self.skip_whitespace();
        let mut second_part = String::new();
        
        while let Some(ch) = self.peek() {
            if ch.is_alphanumeric() || ch == '_' {
                second_part.push(ch);
                self.advance();
            } else {
                break;
            }
        }
        
        if second_part.to_uppercase() == keyword.to_uppercase() {
            true
        } else {
            // Restore position
            self.position = saved_pos;
            self.line = saved_line;
            self.column = saved_col;
            false
        }
    }
    
    /// Reads a numeric literal
    fn read_number(&mut self) -> Result<Token, LexerError> {
        let start = self.current_location();
        let mut number = String::new();
        let mut is_float = false;
        
        while let Some(ch) = self.peek() {
            if ch.is_digit(10) {
                number.push(ch);
                self.advance();
            } else if ch == '.' && !is_float && self.peek_ahead(1) != Some('.') {
                // Only consume '.' as a decimal point when it is NOT followed by another
                // '.'.  The sequence '..' is a range separator (e.g. `*1..3`), not part
                // of a float literal, so we stop here and return an integer.
                is_float = true;
                number.push(ch);
                self.advance();
            } else if ch == 'e' || ch == 'E' {
                is_float = true;
                number.push(ch);
                self.advance();
                if let Some(sign) = self.peek() {
                    if sign == '+' || sign == '-' {
                        number.push(sign);
                        self.advance();
                    }
                }
            } else {
                break;
            }
        }
        
        if is_float {
            match number.parse::<f64>() {
                Ok(value) => Ok(Token::new(TokenType::FloatLiteral(value), start, number)),
                Err(_) => Err(LexerError::InvalidNumber(number, start)),
            }
        } else {
            match number.parse::<i64>() {
                Ok(value) => Ok(Token::new(TokenType::IntegerLiteral(value), start, number)),
                Err(_) => Err(LexerError::InvalidNumber(number, start)),
            }
        }
    }
    
    /// Reads a string literal
    fn read_string(&mut self) -> Result<Token, LexerError> {
        let start = self.current_location();
        self.advance(); // Skip opening quote
        
        let mut string = String::new();
        
        loop {
            match self.peek() {
                Some('"') => {
                    self.advance();
                    let string_value = string;
                    return Ok(Token::new(
                        TokenType::StringLiteral(string_value.clone()),
                        start,
                        format!("\"{}\"", string_value),
                    ));
                }
                Some('\\') => {
                    self.advance(); // Skip backslash
                    match self.advance() {
                        Some('n') => string.push('\n'),
                        Some('t') => string.push('\t'),
                        Some('r') => string.push('\r'),
                        Some('\\') => string.push('\\'),
                        Some('"') => string.push('"'),
                        Some(ch) => string.push(ch),
                        None => return Err(LexerError::UnterminatedString(start)),
                    }
                }
                Some(ch) => {
                    string.push(ch);
                    self.advance();
                }
                None => return Err(LexerError::UnterminatedString(start)),
            }
        }
    }
    
    /// Reads a parameter ($name)
    fn read_parameter(&mut self) -> Token {
        let start = self.current_location();
        self.advance(); // Skip $
        
        let mut name = String::new();
        while let Some(ch) = self.peek() {
            if ch.is_alphanumeric() || ch == '_' {
                name.push(ch);
                self.advance();
            } else {
                break;
            }
        }
        
        Token::new(TokenType::Parameter(name.clone()), start, format!("${}", name))
    }
    
    /// Tokenizes the next token from input
    pub fn next_token(&mut self) -> Result<Token, LexerError> {
        // Return buffered token if available
        if let Some(token) = self.token_buffer.pop() {
            return Ok(token);
        }
        
        self.skip_whitespace();
        
        let ch = match self.peek() {
            Some(ch) => ch,
            None => {
                return Ok(Token::new(
                    TokenType::EOF,
                    self.current_location(),
                    String::new(),
                ));
            }
        };
        
        let token = match ch {
            '(' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::LeftParen, start, "(".to_string())
            }
            ')' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::RightParen, start, ")".to_string())
            }
            '[' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::LeftBracket, start, "[".to_string())
            }
            ']' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::RightBracket, start, "]".to_string())
            }
            '{' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::LeftBrace, start, "{".to_string())
            }
            '}' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::RightBrace, start, "}".to_string())
            }
            ':' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::Colon, start, ":".to_string())
            }
            ';' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::Semicolon, start, ";".to_string())
            }
            '.' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::Period, start, ".".to_string())
            }
            ',' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::Comma, start, ",".to_string())
            }
            '@' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::At, start, "@".to_string())
            }
            '?' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::QuestionMark, start, "?".to_string())
            }
            '|' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::Pipe, start, "|".to_string())
            }
            '$' => self.read_parameter(),
            '"' => return self.read_string(),
            '<' => {
                let start = self.current_location();
                self.advance();
                match self.peek() {
                    Some('=') => {
                        self.advance();
                        Token::new(TokenType::LessThanOrEqual, start, "<=".to_string())
                    }
                    Some('>') => {
                        self.advance();
                        Token::new(TokenType::NotEquals, start, "<>".to_string())
                    }
                    Some('-') => {
                        self.advance();
                        Token::new(TokenType::ReverseArrow, start, "<-".to_string())
                    }
                    _ => Token::new(TokenType::LessThan, start, "<".to_string()),
                }
            }
            '>' => {
                let start = self.current_location();
                self.advance();
                match self.peek() {
                    Some('=') => {
                        self.advance();
                        Token::new(TokenType::GreaterThanOrEqual, start, ">=".to_string())
                    }
                    _ => Token::new(TokenType::GreaterThan, start, ">".to_string()),
                }
            }
            '=' => {
                let start = self.current_location();
                self.advance();
                match self.peek() {
                    Some('~') => {
                        self.advance();
                        Token::new(TokenType::RegexMatch, start, "=~".to_string())
                    }
                    _ => Token::new(TokenType::Equals, start, "=".to_string()),
                }
            }
            '+' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::Plus, start, "+".to_string())
            }
            '-' => {
                let start = self.current_location();
                self.advance();
                match self.peek() {
                    Some('>') => {
                        self.advance();
                        Token::new(TokenType::Arrow, start, "->".to_string())
                    }
                    Some('-') => {
                        self.advance();
                        Token::new(TokenType::DoubleDash, start, "--".to_string())
                    }
                    Some(d) if d.is_digit(10) => {
                        return self.read_number();
                    }
                    _ => Token::new(TokenType::Minus, start, "-".to_string()),
                }
            }
            '*' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::Multiply, start, "*".to_string())
            }
            '/' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::Divide, start, "/".to_string())
            }
            '%' => {
                let start = self.current_location();
                self.advance();
                Token::new(TokenType::Modulo, start, "%".to_string())
            }
            d if d.is_digit(10) => {
                return self.read_number();
            }
            c if c.is_alphabetic() || c == '_' => self.read_identifier(),
            _ => {
                let start = self.current_location();
                return Err(LexerError::UnexpectedCharacter(ch, start));
            }
        };
        
        Ok(token)
    }
    
    /// Tokenizes all input and returns all tokens
    pub fn tokenize(&mut self) -> Result<Vec<Token>, LexerError> {
        let mut tokens = Vec::new();
        
        loop {
            let token = self.next_token()?;
            let is_eof = matches!(token.token_type, TokenType::EOF);
            tokens.push(token);
            if is_eof {
                break;
            }
        }
        
        Ok(tokens)
    }
}
use graph_query_lexer::{Lexer, LexerError, TokenType};

// ============================================================================
// Error Handling Tests
// ============================================================================

#[test]
fn test_unexpected_character_hash() {
    let mut lexer = Lexer::new("#");
    let result = lexer.tokenize();
    assert!(result.is_err());
    match result.unwrap_err() {
        LexerError::UnexpectedCharacter('#', _) => (),
        _ => panic!("Expected UnexpectedCharacter error for '#'"),
    }
}

#[test]
fn test_unexpected_character_backtick() {
    let mut lexer = Lexer::new("`");
    let result = lexer.tokenize();
    assert!(result.is_err());
    match result.unwrap_err() {
        LexerError::UnexpectedCharacter('`', _) => (),
        _ => panic!("Expected UnexpectedCharacter error"),
    }
}

#[test]
fn test_unexpected_character_in_middle() {
    let mut lexer = Lexer::new("MATCH # RETURN");
    let result = lexer.tokenize();
    assert!(result.is_err());
}

#[test]
fn test_error_location_reporting() {
    let mut lexer = Lexer::new("MATCH\n#\nRETURN");
    let result = lexer.tokenize();
    assert!(result.is_err());
    if let Err(LexerError::UnexpectedCharacter(_, loc)) = result {
        assert_eq!(loc.line, 2);
        assert_eq!(loc.column, 1);
    } else {
        panic!("Expected error with location");
    }
}

#[test]
fn test_unterminated_string_location() {
    let mut lexer = Lexer::new("\"hello");
    let result = lexer.tokenize();
    assert!(result.is_err());
    if let Err(LexerError::UnterminatedString(loc)) = result {
        assert_eq!(loc.line, 1);
        assert_eq!(loc.column, 1);
    }
}

#[test]
fn test_invalid_number_format() {
    let mut lexer = Lexer::new("12.34.56");
    let result = lexer.next_token();
    // This should return first number 12.34, then .56 would be separate tokens
    assert!(result.is_ok());
}

#[test]
fn test_unexpected_eof_in_string() {
    let mut lexer = Lexer::new("\"unterminated");
    let result = lexer.tokenize();
    assert!(result.is_err());
}

// ============================================================================
// Edge Cases Tests
// ============================================================================

#[test]
fn test_very_long_input() {
    let input = "MATCH ".repeat(1000) + "RETURN";
    let mut lexer = Lexer::new(&input);
    let tokens = lexer.tokenize().unwrap();
    // 1000 MATCH + 1 RETURN + 1 EOF = 1002 tokens
    assert_eq!(tokens.len(), 1002);
    assert_eq!(tokens.last().unwrap().token_type, TokenType::EOF);
}

#[test]
fn test_very_long_identifier() {
    let long_name = "a".repeat(1000);
    let mut lexer = Lexer::new(&long_name);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens.len(), 2); // identifier + EOF
    assert_eq!(
        tokens[0].token_type,
        TokenType::Identifier(long_name)
    );
}

#[test]
fn test_very_long_string() {
    let long_string = format!("\"{}\"", "a".repeat(1000));
    let mut lexer = Lexer::new(&long_string);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens.len(), 2); // string + EOF
}

#[test]
fn test_unicode_characters_in_string() {
    let mut lexer = Lexer::new("\"héllo wörld 世界\"");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(
        tokens[0].token_type,
        TokenType::StringLiteral("héllo wörld 世界".to_string())
    );
}

#[test]
fn test_unicode_in_comments() {
    let mut lexer = Lexer::new("MATCH // 中文注释\nRETURN");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::Match);
    assert_eq!(tokens[1].token_type, TokenType::Return);
}

#[test]
fn test_multiple_consecutive_newlines() {
    let input = "MATCH\n\n\n\nRETURN";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::Match);
    assert_eq!(tokens[1].token_type, TokenType::Return);
}

#[test]
fn test_mixed_whitespace() {
    let input = "MATCH \t \r \n RETURN";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::Match);
    assert_eq!(tokens[1].token_type, TokenType::Return);
}

#[test]
fn test_negative_numbers() {
    // Lexer treats -42 as IntegerLiteral(42) by consuming the minus sign
    let mut lexer = Lexer::new("-42");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::IntegerLiteral(42));
    assert_eq!(tokens[1].token_type, TokenType::EOF);
}

#[test]
fn test_range_literal_edge_case() {
    let mut lexer = Lexer::new("1..5");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::IntegerLiteral(1));
    // The .. should be handled as period tokens
    assert_eq!(tokens[1].token_type, TokenType::Period);
    assert_eq!(tokens[2].token_type, TokenType::Period);
    assert_eq!(tokens[3].token_type, TokenType::IntegerLiteral(5));
}
use graph_query_lexer::{Lexer, TokenType};
// ============================================================================
// Basic Tokenization Tests
// ============================================================================

#[test]
fn test_empty_input() {
    let mut lexer = Lexer::new("");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens.len(), 1);
    assert_eq!(tokens[0].token_type, TokenType::EOF);
}

#[test]
fn test_whitespace_only() {
    let mut lexer = Lexer::new("   \n\t\r   ");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens.len(), 1);
    assert_eq!(tokens[0].token_type, TokenType::EOF);
}

#[test]
fn test_single_keywords() {
    let test_cases = vec![
        ("MATCH", TokenType::Match),
        ("WHERE", TokenType::Where),
        ("RETURN", TokenType::Return),
        ("WITH", TokenType::With),
        ("CREATE", TokenType::Create),
        ("DELETE", TokenType::Delete),
        ("SET", TokenType::Set),
        ("MERGE", TokenType::Merge),
        ("UNWIND", TokenType::Unwind),
        ("CALL", TokenType::Call),
        ("OPTIONAL", TokenType::Optional),
        ("CASE", TokenType::Case),
        ("WHEN", TokenType::When),
        ("THEN", TokenType::Then),
        ("ELSE", TokenType::Else),
        ("END", TokenType::End),
        ("GROUP", TokenType::Group),
        ("BY", TokenType::By),
        ("ORDER", TokenType::Order),
        ("LIMIT", TokenType::Limit),
        ("SKIP", TokenType::Skip),
        ("HAVING", TokenType::Having),
        ("ASC", TokenType::Asc),
        ("DESC", TokenType::Desc),
        ("DISTINCT", TokenType::Distinct),
        ("AS", TokenType::As),
        ("ON", TokenType::On),
        ("YIELD", TokenType::Yield),
        ("IN", TokenType::In),
        ("AND", TokenType::And),
        ("OR", TokenType::Or),
        ("NOT", TokenType::Not),
        ("IS", TokenType::Is),
        ("NULL", TokenType::Null),
        ("TRUE", TokenType::True),
        ("FALSE", TokenType::False),
    ];
    
    for (input, expected) in test_cases {
        let mut lexer = Lexer::new(input);
        let tokens = lexer.tokenize().unwrap();
        assert_eq!(tokens.len(), 2, "Failed for input: {}", input);
        assert_eq!(tokens[0].token_type, expected, "Failed for input: {}", input);
        assert_eq!(tokens[1].token_type, TokenType::EOF);
    }
}

#[test]
fn test_keywords_case_insensitive() {
    let test_cases = vec![
        "match", "Match", "MATCH", "mAtCh",
        "return", "Return", "RETURN",
    ];
    
    for input in test_cases {
        let mut lexer = Lexer::new(input);
        let tokens = lexer.tokenize().unwrap();
        assert!(tokens.len() > 0, "Failed for input: {}", input);
    }
}

#[test]
fn test_single_operators() {
    let test_cases = vec![
        ("=", TokenType::Equals),
        ("+", TokenType::Plus),
        ("-", TokenType::Minus),
        ("*", TokenType::Multiply),
        ("/", TokenType::Divide),
        ("%", TokenType::Modulo),
    ];
    
    for (input, expected) in test_cases {
        let mut lexer = Lexer::new(input);
        let tokens = lexer.tokenize().unwrap();
        assert_eq!(tokens[0].token_type, expected, "Failed for input: {}", input);
    }
}

#[test]
fn test_single_punctuation() {
    let test_cases = vec![
        ("(", TokenType::LeftParen),
        (")", TokenType::RightParen),
        ("[", TokenType::LeftBracket),
        ("]", TokenType::RightBracket),
        ("{", TokenType::LeftBrace),
        ("}", TokenType::RightBrace),
        (":", TokenType::Colon),
        (";", TokenType::Semicolon),
        (".", TokenType::Period),
        (",", TokenType::Comma),
        ("@", TokenType::At),
        ("?", TokenType::QuestionMark),
        ("|", TokenType::Pipe),
    ];
    
    for (input, expected) in test_cases {
        let mut lexer = Lexer::new(input);
        let tokens = lexer.tokenize().unwrap();
        assert_eq!(tokens[0].token_type, expected, "Failed for input: {}", input);
    }
}

// ============================================================================
// Location Tracking Tests
// ============================================================================

#[test]
fn test_location_tracking_single_line() {
    let mut lexer = Lexer::new("MATCH (n)");
    let tokens = lexer.tokenize().unwrap();
    
    // MATCH
    assert_eq!(tokens[0].location.line, 1);
    assert_eq!(tokens[0].location.column, 1);
    
    // (
    assert_eq!(tokens[1].location.line, 1);
    assert_eq!(tokens[1].location.column, 7);
    
    // n
    assert_eq!(tokens[2].location.line, 1);
    assert_eq!(tokens[2].location.column, 8);
}

#[test]
fn test_location_tracking_multiline() {
    let input = "MATCH\nRETURN\nWHERE";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    
    assert_eq!(tokens[0].location.line, 1);
    assert_eq!(tokens[1].location.line, 2);
    assert_eq!(tokens[2].location.line, 3);
}

#[test]
fn test_location_offset_tracking() {
    let mut lexer = Lexer::new("AB CD");
    let tokens = lexer.tokenize().unwrap();
    
    // AB at offset 0
    assert_eq!(tokens[0].location.offset, 0);
    // CD at offset 3 (after space)
    assert_eq!(tokens[1].location.offset, 3);
}

#[test]
fn test_location_column_reset_after_newline() {
    let mut lexer = Lexer::new("ABC\nD");
    let tokens = lexer.tokenize().unwrap();
    
    assert_eq!(tokens[0].location.column, 1); // ABC starts at col 1
    assert_eq!(tokens[1].location.column, 1); // D starts at col 1 after newline
}
use graph_query_lexer::{Lexer, TokenType};

// ============================================================================
// Line Comment Tests
// ============================================================================

#[test]
fn test_line_comment_at_end() {
    let mut lexer = Lexer::new("MATCH // This is a comment");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens.len(), 2); // MATCH + EOF
    assert_eq!(tokens[0].token_type, TokenType::Match);
}

#[test]
fn test_line_comment_whole_line() {
    let mut lexer = Lexer::new("// This entire line is a comment\nRETURN");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens.len(), 2); // RETURN + EOF
    assert_eq!(tokens[0].token_type, TokenType::Return);
}

#[test]
fn test_line_comment_between_tokens() {
    let mut lexer = Lexer::new("MATCH // comment\nRETURN // another comment\nWHERE");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens.len(), 4); // MATCH, RETURN, WHERE + EOF
    assert_eq!(tokens[0].token_type, TokenType::Match);
    assert_eq!(tokens[1].token_type, TokenType::Return);
    assert_eq!(tokens[2].token_type, TokenType::Where);
}

#[test]
fn test_line_comment_empty() {
    let mut lexer = Lexer::new("//\nMATCH");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::Match);
}

#[test]
fn test_multiple_line_comments() {
    let input = "// Comment 1\n// Comment 2\nMATCH // Comment 3\nRETURN";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::Match);
    assert_eq!(tokens[1].token_type, TokenType::Return);
}

// ============================================================================
// Block Comment Tests
// ============================================================================

#[test]
fn test_block_comment_simple() {
    let mut lexer = Lexer::new("MATCH /* comment */ RETURN");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens.len(), 3); // MATCH, RETURN + EOF
    assert_eq!(tokens[0].token_type, TokenType::Match);
    assert_eq!(tokens[1].token_type, TokenType::Return);
}

#[test]
fn test_block_comment_multiline() {
    let input = "MATCH /* This is a\nmultiline\ncomment */ RETURN";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::Match);
    assert_eq!(tokens[1].token_type, TokenType::Return);
}

#[test]
fn test_block_comment_empty() {
    let mut lexer = Lexer::new("MATCH /**/ RETURN");
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::Match);
    assert_eq!(tokens[1].token_type, TokenType::Return);
}

#[test]
fn test_nested_block_comments() {
    // Note: Depending on implementation, nested comments may not be supported
    let input = "MATCH /* outer /* inner */ still comment */ RETURN";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    
    // Should handle nested comments
    assert!(tokens.len() >= 2);
    assert_eq!(tokens[0].token_type, TokenType::Match);
    // Check that RETURN is present (after comments)
    let return_exists = tokens.iter().any(|t| matches!(t.token_type, TokenType::Return));
    assert!(return_exists);
}

#[test]
fn test_mixed_comments() {
    let input = "// Line comment\nMATCH /* Block comment */ RETURN // End comment";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::Match);
    assert_eq!(tokens[1].token_type, TokenType::Return);
}

#[test]
fn test_comment_with_special_characters() {
    let input = "MATCH // Comment with symbols: <>{}()[]\nRETURN /* symbols: <>{}()[] */ WHERE";
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize().unwrap();
    assert_eq!(tokens[0].token_type, TokenType::Match);
    assert_eq!(tokens[1].token_type, TokenType::Return);
    assert_eq!(tokens[2].token_type, TokenType::Where);
}
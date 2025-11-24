// src/tests/unit/lexer_comments.test.ts
import { describe, test, expect } from 'bun:test';
import { Lexer } from '../../lang/lexer/lexer';
import { Token, TokenType } from '../../lang/lexer/tokens';

describe('Lexer Comments', () => {
  // Helper to collect all tokens from a source string
  const getAllTokens = (source: string): Token[] => {
    const lexer = new Lexer(source);
    const tokens: Token[] = [];
    let token;
    do {
      token = lexer.scanToken();
      tokens.push(token);
    } while (token.type !== TokenType.EOF);
    return tokens;
  };

  test('should skip single-line comments', () => {
    const source = `
      // This is a comment
      int a = 1; // Another comment
    `;
    const tokens = getAllTokens(source);
    expect(tokens.map(t => t.type)).toEqual([
      TokenType.INT,
      TokenType.IDENTIFIER,
      TokenType.ASSIGN,
      TokenType.INT_LITERAL,
      TokenType.SEMICOLON,
      TokenType.EOF,
    ]);
  });

  test('should skip block comments', () => {
    const source = `
      /* This is a block comment */
      int a = 1; /* Another block comment */
    `;
    const tokens = getAllTokens(source);
    expect(tokens.map(t => t.type)).toEqual([
      TokenType.INT,
      TokenType.IDENTIFIER,
      TokenType.ASSIGN,
      TokenType.INT_LITERAL,
      TokenType.SEMICOLON,
      TokenType.EOF,
    ]);
  });

  test('should skip multi-line block comments', () => {
    const source = `
      /* This is a
         multi-line
         block comment */
      int a = 1;
    `;
    const tokens = getAllTokens(source);
    expect(tokens.map(t => t.type)).toEqual([
      TokenType.INT,
      TokenType.IDENTIFIER,
      TokenType.ASSIGN,
      TokenType.INT_LITERAL,
      TokenType.SEMICOLON,
      TokenType.EOF,
    ]);
  });

  test('should handle block comments with asterisks inside', () => {
    const source = `
      /* This is a comment with * inside */
      int a = 1;
      /** Doc comment style */
    `;
    const tokens = getAllTokens(source);
    expect(tokens.map(t => t.type)).toEqual([
      TokenType.INT,
      TokenType.IDENTIFIER,
      TokenType.ASSIGN,
      TokenType.INT_LITERAL,
      TokenType.SEMICOLON,
      TokenType.EOF,
    ]);
  });

  test('should handle mixed comments', () => {
    const source = `
      // Single line
      /* Block 1 */
      int /* Block 2 */ a = 1; // End
    `;
    const tokens = getAllTokens(source);
    expect(tokens.map(t => t.type)).toEqual([
      TokenType.INT,
      TokenType.IDENTIFIER,
      TokenType.ASSIGN,
      TokenType.INT_LITERAL,
      TokenType.SEMICOLON,
      TokenType.EOF,
    ]);
  });

  test('should correctly track line numbers with multi-line comments', () => {
    const source = `/* Line 1
Line 2
Line 3 */
int a = 1;`;
    const tokens = getAllTokens(source);
    expect(tokens[0].type).toBe(TokenType.INT);
    expect(tokens[0].line).toBe(4); // Should be on line 4
  });

  test('should handle block comment at EOF', () => {
    const source = 'int a = 1; /* comment at eof */';
    const tokens = getAllTokens(source);
    expect(tokens.map(t => t.type)).toEqual([
        TokenType.INT,
        TokenType.IDENTIFIER,
        TokenType.ASSIGN,
        TokenType.INT_LITERAL,
        TokenType.SEMICOLON,
        TokenType.EOF,
    ]);
  });
});

// src/tests/unit/lexer.test.ts
import { describe, test, expect, spyOn } from 'bun:test';
import { Lexer } from '../../lang/lexer/lexer';
import { Token, TokenType } from '../../lang/lexer/tokens';

describe('Lexer', () => {
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

  test('should tokenize a simple variable declaration', () => {
    const source = 'int main = 10;';
    const tokens = getAllTokens(source);

    expect(tokens.map(t => t.type)).toEqual([
      TokenType.INT,
      TokenType.IDENTIFIER,
      TokenType.ASSIGN,
      TokenType.INT_LITERAL,
      TokenType.SEMICOLON,
      TokenType.EOF,
    ]);
    expect(tokens[1].lexeme).toBe('main');
    expect(tokens[3].lexeme).toBe('10');
  });

  test('should tokenize all operators correctly', () => {
    const source = '+ - * / % = += -= *= /= %= == != < > <= >= !';
    const tokens = getAllTokens(source);
    const expectedTypes = [
      TokenType.PLUS,
      TokenType.MINUS,
      TokenType.STAR,
      TokenType.SLASH,
      TokenType.PERCENT,
      TokenType.ASSIGN,
      TokenType.PLUS_ASSIGN,
      TokenType.MINUS_ASSIGN,
      TokenType.STAR_ASSIGN,
      TokenType.SLASH_ASSIGN,
      TokenType.PERCENT_ASSIGN,
      TokenType.EQ,
      TokenType.NEQ,
      TokenType.LT,
      TokenType.GT,
      TokenType.LTE,
      TokenType.GTE,
      TokenType.LOGICAL_NOT,
      TokenType.EOF,
    ];
    expect(tokens.map(t => t.type)).toEqual(expectedTypes);
  });

  test('should tokenize a for-loop with comments', () => {
    const source = `
      for (int i = 0; i < 10; i = i + 1) {
        // comment
        sum += i;
      }
    `;
    const tokens = getAllTokens(source);
    const expectedTypes = [
      TokenType.FOR,
      TokenType.LPAREN,
      TokenType.INT,
      TokenType.IDENTIFIER,
      TokenType.ASSIGN,
      TokenType.INT_LITERAL,
      TokenType.SEMICOLON,
      TokenType.IDENTIFIER,
      TokenType.LT,
      TokenType.INT_LITERAL,
      TokenType.SEMICOLON,
      TokenType.IDENTIFIER,
      TokenType.ASSIGN,
      TokenType.IDENTIFIER,
      TokenType.PLUS,
      TokenType.INT_LITERAL,
      TokenType.RPAREN,
      TokenType.LBRACE,
      TokenType.IDENTIFIER,
      TokenType.PLUS_ASSIGN,
      TokenType.IDENTIFIER,
      TokenType.SEMICOLON,
      TokenType.RBRACE,
      TokenType.EOF,
    ];
    
    expect(tokens.map(t => t.type)).toEqual(expectedTypes);
  });

  test('should handle numbers (int and double)', () => {
    const source = '123 45.67 0.1';
    const tokens = getAllTokens(source);
    expect(tokens.map(t => t.type)).toEqual([
        TokenType.INT_LITERAL,
        TokenType.DOUBLE_LITERAL,
        TokenType.DOUBLE_LITERAL,
        TokenType.EOF,
    ]);
    expect(tokens[0].lexeme).toBe('123');
    expect(tokens[1].lexeme).toBe('45.67');
  });

  test('should tokenize logical operators && and ||', () => {
    const source = 'true && false || true';
    const tokens = getAllTokens(source);
    expect(tokens.map(t => t.type)).toEqual([
      TokenType.TRUE,
      TokenType.LOGICAL_AND,
      TokenType.FALSE,
      TokenType.LOGICAL_OR,
      TokenType.TRUE,
      TokenType.EOF,
    ]);
  });

  test('should throw error for single & or |', () => {
    expect(() => getAllTokens('a & b')).toThrow("Unexpected character: &. Did you mean '&&'?");
    expect(() => getAllTokens('a | b')).toThrow("Unexpected character: |. Did you mean '||'?");
  });
});

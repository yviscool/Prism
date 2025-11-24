// src/lang/lexer/lexer.ts

import { Token, TokenType } from './tokens';

/**
 * @file 词法分析器 (Lexer)
 * @description 负责将源代码字符串扫描成令牌 (Token) 流。
 * @author tmac
 */
export class Lexer {
  private source: string;
  private start: number = 0;
  private current: number = 0;
  private line: number = 1;
  private col: number = 1;

  private keywords: Map<string, TokenType>;

  constructor(source: string) {
    this.source = source;
    this.keywords = new Map([
      ['int', TokenType.INT],
      ['double', TokenType.DOUBLE],
      ['bool', TokenType.BOOL],
      ['true', TokenType.TRUE],
      ['false', TokenType.FALSE],
      ['if', TokenType.IF],
      ['else', TokenType.ELSE],
      ['for', TokenType.FOR],
      ['while', TokenType.WHILE],
    ]);
  }

  /**
   * 扫描并返回下一个令牌
   */
  public scanToken(): Token {
    this.skipWhitespace();

    this.start = this.current;

    if (this.isAtEnd()) return this.makeToken(TokenType.EOF);

    const char = this.advance();

    // 标识符或关键字
    if (this.isAlpha(char)) return this.identifier();
    // 数字
    if (this.isDigit(char)) return this.number();

    // 运算符和标点
    switch (char) {
      case '(': return this.makeToken(TokenType.LPAREN);
      case ')': return this.makeToken(TokenType.RPAREN);
      case '{': return this.makeToken(TokenType.LBRACE);
      case '}': return this.makeToken(TokenType.RBRACE);
      case '[': return this.makeToken(TokenType.LBRACKET);
      case ']': return this.makeToken(TokenType.RBRACKET);
      case ';': return this.makeToken(TokenType.SEMICOLON);
      case ',': return this.makeToken(TokenType.COMMA);
      
      case '+': 
        if (this.match('=')) return this.makeToken(TokenType.PLUS_ASSIGN);
        if (this.match('+')) return this.makeToken(TokenType.INC);
        return this.makeToken(TokenType.PLUS);
      case '-': 
        if (this.match('=')) return this.makeToken(TokenType.MINUS_ASSIGN);
        if (this.match('-')) return this.makeToken(TokenType.DEC);
        return this.makeToken(TokenType.MINUS);
      case '*': return this.makeToken(this.match('=') ? TokenType.STAR_ASSIGN : TokenType.STAR);
      case '/':
        // Handle comments
        if (this.match('/')) {
          while (this.peek() !== '\n' && !this.isAtEnd()) this.advance();
          return this.scanToken(); // Rescan for the next token
        } else if (this.match('*')) {
          // Block comments not specified, but good to consider
          throw new Error('Block comments are not supported.');
        }
        return this.makeToken(this.match('=') ? TokenType.SLASH_ASSIGN : TokenType.SLASH);
      case '%': return this.makeToken(this.match('=') ? TokenType.PERCENT_ASSIGN : TokenType.PERCENT);
      
      case '=': return this.makeToken(this.match('=') ? TokenType.EQ : TokenType.ASSIGN);
      case '!': return this.makeToken(this.match('=') ? TokenType.NEQ : TokenType.LOGICAL_NOT);
      case '&':
        if (this.match('&')) return this.makeToken(TokenType.LOGICAL_AND);
        throw new Error(`[${this.line}:${this.col}] Unexpected character: ${char}. Did you mean '&&'?`);
      case '|':
        if (this.match('|')) return this.makeToken(TokenType.LOGICAL_OR);
        throw new Error(`[${this.line}:${this.col}] Unexpected character: ${char}. Did you mean '||'?`);
      case '<': return this.makeToken(this.match('=') ? TokenType.LTE : TokenType.LT);
      case '>': return this.makeToken(this.match('=') ? TokenType.GTE : TokenType.GT);
    }

    // 如果遇到未知字符，可以抛出错误或返回一个 ERROR 令牌
    throw new Error(`[${this.line}:${this.col}] Unexpected character: ${char}`);
  }

  private identifier(): Token {
    while (this.isAlphaNumeric(this.peek())) this.advance();

    const text = this.source.substring(this.start, this.current);
    const type = this.keywords.get(text) || TokenType.IDENTIFIER;
    return this.makeToken(type);
  }


  private number(): Token {
    let isDouble = false;
    while (this.isDigit(this.peek())) this.advance();

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      isDouble = true;
      this.advance(); // Consume the '.'
      while (this.isDigit(this.peek())) this.advance();
    }

    return this.makeToken(isDouble ? TokenType.DOUBLE_LITERAL : TokenType.INT_LITERAL);
  }

  private skipWhitespace(): void {
    while (true) {
      const char = this.peek();
      switch (char) {
        case ' ':
        case '\r':
        case '\t':
          this.advance();
          break;
        case '\n':
          this.line++;
          this.col = 1;
          this.advance();
          break;
        // Comments
        case '/':
          if (this.peekNext() === '/') {
            while (this.peek() !== '\n' && !this.isAtEnd()) this.advance();
          } else {
            return;
          }
          break;
        default:
          return;
      }
    }
  }

  private advance(): string {
    this.current++;
    this.col++;
    return this.source.charAt(this.current - 1);
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source.charAt(this.current);
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source.charAt(this.current + 1);
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source.charAt(this.current) !== expected) return false;
    this.current++;
    this.col++;
    return true;
  }

  private makeToken(type: TokenType): Token {
    const lexeme = this.source.substring(this.start, this.current);
    return { type, lexeme, line: this.line, col: this.col - lexeme.length };
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }
}

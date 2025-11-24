// src/lang/lexer/tokens.ts

/**
 * @file 词法分析器令牌类型定义
 * @author tmac
 */

export enum TokenType {
  // 字面量 (Literals)
  INT_LITERAL,    // 123
  DOUBLE_LITERAL, // 1.23
  STRING_LITERAL, // "hello" (暂不支持，但预留)

  // 标识符 (Identifiers)
  IDENTIFIER,     // my_var

  // 关键字 (Keywords)
  INT,            // int
  DOUBLE,         // double
  BOOL,           // bool
  TRUE,           // true
  FALSE,          // false
  IF,             // if
  ELSE,           // else
  FOR,            // for
  WHILE,          // while
  BREAK,          // break
  CONTINUE,       // continue
  // RETURN,      // 暂不支持

  // 运算符与标点 (Operators & Punctuation)
  PLUS,           // +
  MINUS,          // -
  STAR,           // *
  SLASH,          // /
  PERCENT,        // %
  
  INC,            // ++
  DEC,            // --

  ASSIGN,         // =
  PLUS_ASSIGN,    // +=
  MINUS_ASSIGN,   // -=
  STAR_ASSIGN,    // *=
  SLASH_ASSIGN,   // /=
  PERCENT_ASSIGN, // %=

  EQ,             // ==
  NEQ,            // !=
  LT,             // <
  GT,             // >
  LTE,            // <=
  GTE,            // >=

  LOGICAL_NOT,    // !
  LOGICAL_AND,    // &&
  LOGICAL_OR,     // ||

  LPAREN,         // (
  RPAREN,         // )
  LBRACE,         // {
  RBRACE,         // }
  LBRACKET,       // [
  RBRACKET,       // ]
  
  SEMICOLON,      // ;
  COMMA,          // ,

  // 文件结束符 (End of File)
  EOF,
}

export interface Token {
  type: TokenType;
  lexeme: string; // 原始文本
  line: number;   // 所在行
  col: number;    // 所在列
}

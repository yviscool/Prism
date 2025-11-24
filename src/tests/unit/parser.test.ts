// src/tests/unit/parser.test.ts
import { describe, test, expect, spyOn } from 'bun:test';
import { Lexer } from '../../lang/lexer/lexer';
import { Parser } from '../../lang/parser/parser';
import { Program } from '../../lang/parser/ast';
import { TokenType } from '../../lang/lexer/tokens';

describe('Parser', () => {
  const parseSource = (source: string): Program => {
    const lexer = new Lexer(source);
    const tokens = [];
    let token;
    do {
      token = lexer.scanToken();
      tokens.push(token);
    } while (token.type !== TokenType.EOF);
    
    const parser = new Parser(tokens);
    return parser.parse();
  };

  test('should parse a simple variable declaration', () => {
    const source = 'int a = 10;';
    const ast = parseSource(source);

    // Using snapshot testing to verify the AST structure
    expect(ast).toMatchSnapshot();
  });

  test('should parse an assignment expression', () => {
    const source = 'x = y;';
    const ast = parseSource(source);
    expect(ast).toMatchSnapshot();
  });

  test('should throw an error for invalid assignment target', () => {
    const source = '10 = x;';
    // We expect the parsing process to throw a CompileError
    expect(() => parseSource(source)).toThrow('无效的赋值目标');
  });

  test('should parse a boolean declaration', () => {
    const source = 'bool b = true;';
    const ast = parseSource(source);
    expect(ast).toMatchSnapshot();
  });

  test('should parse arithmetic expressions with correct precedence', () => {
    const source = '1 + 2 * 3 - 4 / 2;';
    const ast = parseSource(source);
    expect(ast).toMatchSnapshot();
    // Expected AST:
    // Program
    //   ExpressionStmt
    //     Binary (op: -, left: Binary (op: +, left: Literal(1), right: Binary (op: *, left: Literal(2), right: Literal(3))), right: Binary (op: /, left: Literal(4), right: Literal(2)))
  });

  test('should parse comparison expressions with correct precedence', () => {
    const source = '1 + 2 == 3 * 4 < 5;';
    const ast = parseSource(source);
    expect(ast).toMatchSnapshot();
    // Expected AST:
    // Program
    //   ExpressionStmt
    //     Binary (op: <, left: Binary (op: ==, left: Binary (op: +, left: Literal(1), right: Literal(2)), right: Binary (op: *, left: Literal(3), right: Literal(4))), right: Literal(5))
  });

  test('should parse logical expressions with correct precedence', () => {
    const source = 'true && false || !true;';
    const ast = parseSource(source);
    expect(ast).toMatchSnapshot();
    // Expected AST:
    // Program
    //   ExpressionStmt
    //     Binary (op: ||, left: Binary (op: &&, left: Literal(true), right: Literal(false)), right: Unary (op: !, right: Literal(true)))
  });

  test('should parse unary expressions', () => {
    const source = '-5 + !true;';
    const ast = parseSource(source);
    expect(ast).toMatchSnapshot();
    // Expected AST:
    // Program
    //   ExpressionStmt
    //     Binary (op: +, left: Unary (op: -, right: Literal(5)), right: Unary (op: !, right: Literal(true)))
  });

  test('should parse grouped expressions with parentheses', () => {
    const source = '(1 + 2) * 3;';
    const ast = parseSource(source);
    expect(ast).toMatchSnapshot();
    // Expected AST:
    // Program
    //   ExpressionStmt
    //     Binary (op: *, left: Binary (op: +, left: Literal(1), right: Literal(2)), right: Literal(3)))
  });

  test('should parse complex mixed expressions', () => {
    const source = 'int result = (a + b) * c == d && !e || f / 2 > 1;';
    const ast = parseSource(source);
    expect(ast).toMatchSnapshot();
  });
});

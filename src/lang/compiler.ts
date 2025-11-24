// src/lang/compiler.ts
import { Lexer } from './lexer/lexer';
import { Parser } from './parser/parser';
import { CodeGenerator } from './codegen/codegen';
import { Instruction } from '../core/isa/instructions';
import { Token, TokenType } from './lexer/tokens';

/**
 * @file 编译器主入口
 * @description
 * 负责将源代码字符串完整地编译成字节码。
 * 这是连接词法分析、语法分析和代码生成的总指挥。
 * @author tmac
 */
export function compile(source: string): Instruction[] {
  // 1. 词法分析 (Lexer)
  const lexer = new Lexer(source);
  const tokens: Token[] = [];
  let token;
  do {
    token = lexer.scanToken();
    tokens.push(token);
  } while (token.type !== TokenType.EOF);

  // 2. 语法分析 (Parser)
  const parser = new Parser(tokens);
  const ast = parser.parse();

  // 3. 代码生成 (CodeGenerator)
  const generator = new CodeGenerator();
  const bytecode = generator.generate(ast);

  return bytecode;
}

// src/lang/parser/parser.ts

import { Token, TokenType } from '../lexer/tokens';
import * as AST from './ast';
import { CompileError } from '../../shared/errors';

/**
 * @file 语法分析器 (Parser)
 * @description
 * 接收一个令牌流，并根据语言的语法规则构建一个抽象语法树 (AST)。
 * 采用递归下降 (Recursive Descent) 的方法，并为表达式解析使用 Pratt 解析器技术，
 * 以优雅地处理运算符优先级和结合性。
 * @author tmac
 */
export class Parser {
  private tokens: Token[];
  private current: number = 0;

  // 定义运算符优先级
  // 数字越大，优先级越高
  private precedences: Map<TokenType, number> = new Map([
    [TokenType.LOGICAL_OR, 1],
    [TokenType.LOGICAL_AND, 2],
    [TokenType.EQ, 3], [TokenType.NEQ, 3],
    [TokenType.LT, 4], [TokenType.LTE, 4], [TokenType.GT, 4], [TokenType.GTE, 4],
    [TokenType.PLUS, 5], [TokenType.MINUS, 5],
    [TokenType.STAR, 6], [TokenType.SLASH, 6], [TokenType.PERCENT, 6],
  ]);

  constructor(tokens: Token[]) {
    // The lexer already filters out whitespace and comments,
    // so we can directly use the token stream.
    this.tokens = tokens;
  }

  /**
   * 解析整个令牌流并返回 AST 的根节点 (Program)。
   */
  public parse(): AST.Program {
    const statements: AST.Stmt[] = [];
    while (!this.isAtEnd()) {
      try {
        statements.push(this.declaration());
      } catch (e) {
        // 简单错误恢复：同步到下一个语句的开始
        // this.synchronize();
        // 暂时直接抛出
        throw e;
      }
    }
    return { kind: 'Program', body: statements };
  }

  // --- 语句解析 ---

  private declaration(): AST.Stmt {
    // 根据令牌类型判断是变量声明还是其他语句
    if (this.match(TokenType.INT, TokenType.DOUBLE, TokenType.BOOL)) {
      return this.varDeclaration();
    }
    return this.statement();
  }

  private varDeclaration(): AST.Stmt {
    const type = this.previous();
    const declarators: AST.Declarator[] = [];

    do {
      const name = this.consume(TokenType.IDENTIFIER, '应为变量名。');
      let initializer: AST.Expr | undefined = undefined;
      if (this.match(TokenType.ASSIGN)) {
        initializer = this.expression();
      }
      declarators.push({ kind: 'Declarator', name, initializer });
    } while (this.match(TokenType.COMMA));

    this.consume(TokenType.SEMICOLON, "变量声明后应有 ';'。");
    return { kind: 'VarDeclaration', dataType: type, declarators };
  }

  private statement(): AST.Stmt {
    if (this.match(TokenType.IF)) {
      return this.ifStatement();
    }
    if (this.match(TokenType.WHILE)) {
      return this.whileStatement();
    }
    if (this.match(TokenType.FOR)) {
      return this.forStatement();
    }
    if (this.match(TokenType.BREAK)) {
      return this.breakStatement();
    }
    if (this.match(TokenType.CONTINUE)) {
      return this.continueStatement();
    }
    if (this.match(TokenType.LBRACE)) {
      return { kind: 'BlockStmt', body: this.block() };
    }
    if (this.match(TokenType.SEMICOLON)) {
      return { kind: 'EmptyStmt' };
    }
    return this.expressionStatement();
  }

  private breakStatement(): AST.Stmt {
    this.consume(TokenType.SEMICOLON, "break 语句后应有 ';'。");
    return { kind: 'BreakStmt' };
  }

  private continueStatement(): AST.Stmt {
    this.consume(TokenType.SEMICOLON, "continue 语句后应有 ';'。");
    return { kind: 'ContinueStmt' };
  }

  private forStatement(): AST.Stmt {
    this.consume(TokenType.LPAREN, "'for' 后应有 '('。");

    let initializer: AST.VarDeclaration | AST.ExpressionStmt | undefined;
    if (this.match(TokenType.SEMICOLON)) {
      initializer = undefined;
    } else if (this.match(TokenType.INT, TokenType.DOUBLE, TokenType.BOOL)) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    let condition: AST.Expr | undefined;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "循环条件后应有 ';'。");

    let increment: AST.Expr | undefined;
    if (!this.check(TokenType.RPAREN)) {
      increment = this.expression();
    }
    this.consume(TokenType.RPAREN, "for 循环的子句后应有 ')'。");

    const body = this.statement();

    return { kind: 'ForStmt', initializer, condition, increment, body };
  }

  private block(): AST.Stmt[] {
    const statements: AST.Stmt[] = [];


    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      statements.push(this.declaration());
    }

    this.consume(TokenType.RBRACE, "代码块应由 '}' 闭合。");
    return statements;
  }

  private ifStatement(): AST.Stmt {
    this.consume(TokenType.LPAREN, "'if' 后应有 '('。");
    const condition = this.expression();
    this.consume(TokenType.RPAREN, "条件后应有 ')'。");

    const thenBranch = this.statement();
    let elseBranch: AST.Stmt | undefined = undefined;
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.statement();
    }

    return { kind: 'IfStmt', condition, thenBranch, elseBranch };
  }

  private whileStatement(): AST.Stmt {
    this.consume(TokenType.LPAREN, "'while' 后应有 '('。");
    const condition = this.expression();
    this.consume(TokenType.RPAREN, "条件后应有 ')'。");
    const body = this.statement();

    return { kind: 'WhileStmt', condition, body };
  }

  private expressionStatement(): AST.Stmt {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, "表达式语句后应有 ';'。");
    return { kind: 'ExpressionStmt', expression: expr };
  }

  // --- 表达式解析 (Pratt Parser) ---

  // 表达式解析的入口，从最低优先级开始
  private expression(): AST.Expr {
    return this.assignment();
  }

  // Pratt 解析器的核心方法
  // precedence: 当前正在解析的运算符的最小绑定强度
  private parsePrecedence(precedence: number): AST.Expr {
    let expr = this.parsePrefix(); // 首先解析前缀表达式 (字面量, 标识符, 一元表达式, 括号表达式)

    // 循环处理中缀和后缀运算符
    while (true) {
      if (this.match(TokenType.INC, TokenType.DEC)) {
        // 处理后缀 ++ 和 --
        const operator = this.previous();
        if (expr.kind !== 'Identifier') {
          throw this.error(operator, '操作数必须是可修改的左值。');
        }
        expr = { kind: 'Update', operator, argument: expr, prefix: false };
        continue;
      }
      
      if (precedence <= this.getPrecedence(this.peek().type)) {
        // 处理中缀运算符
        const operator = this.advance();
        expr = {
          kind: 'Binary',
          left: expr,
          operator: operator,
          right: this.parsePrecedence(this.getPrecedence(operator.type) + 1),
        };
        continue;
      }
      
      break;
    }

    return expr;
  }

  // 解析前缀表达式 (字面量, 标识符, 一元表达式, 括号表达式)
  private parsePrefix(): AST.Expr {
    if (this.match(TokenType.INT_LITERAL, TokenType.DOUBLE_LITERAL)) {
      return { kind: 'Literal', value: Number(this.previous().lexeme) };
    }
    if (this.match(TokenType.TRUE)) return { kind: 'Literal', value: true };
    if (this.match(TokenType.FALSE)) return { kind: 'Literal', value: false };
    if (this.match(TokenType.IDENTIFIER)) {
      return { kind: 'Identifier', name: this.previous() };
    }
    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RPAREN, "应有 ')' 来闭合表达式。");
      return expr; // 简化处理，直接返回内部表达式
    }
    if (this.match(TokenType.MINUS, TokenType.LOGICAL_NOT)) { // 处理一元运算符
      const operator = this.previous();
      const right = this.parsePrefix(); // 一元运算符的右侧通常是更高优先级的表达式
      return { kind: 'Unary', operator, right };
    }
    // 处理前缀 ++ 和 --
    if (this.match(TokenType.INC, TokenType.DEC)) {
      const operator = this.previous();
      const argument = this.parsePrefix(); // 通常后面跟一个标识符
      if (argument.kind !== 'Identifier') {
        throw this.error(operator, '操作数必须是可修改的左值。');
      }
      return { kind: 'Update', operator, argument, prefix: true };
    }

    throw this.error(this.peek(), '预期的表达式。');
  }

  // 获取运算符的优先级
  private getPrecedence(type: TokenType): number {
    return this.precedences.get(type) || 0;
  }

  // 赋值表达式 (特殊处理，因为赋值是右结合的，且优先级低于其他二元运算符)
  private assignment(): AST.Expr {
    const expr = this.parsePrecedence(1); // 解析左侧，通常是一个标识符

    if (this.match(
      TokenType.ASSIGN, TokenType.PLUS_ASSIGN, TokenType.MINUS_ASSIGN, 
      TokenType.STAR_ASSIGN, TokenType.SLASH_ASSIGN, TokenType.PERCENT_ASSIGN
    )) {
      const operator = this.previous();
      const value = this.assignment(); // 赋值是右结合的，递归调用

      if (expr.kind === 'Identifier') {
        const name = (expr as AST.IdentifierExpr).name;
        return { kind: 'Assignment', name, operator, value };
      }

      throw this.error(operator, '无效的赋值目标。');
    }

    return expr;
  }

  // --- 解析器辅助方法 ---

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private error(token: Token, message: string): CompileError {
    const location = token.type === TokenType.EOF ? '文件末尾' : `令牌 '${token.lexeme}'`;
    return new CompileError(`[${token.line}:${token.col}] 错误在 ${location}: ${message}`);
  }
}

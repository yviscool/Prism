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
      // 专门检查，以提供更友好的错误信息
      if (this.peek().type !== TokenType.IDENTIFIER) {
        if (this.peek().type >= TokenType.INT && this.peek().type <= TokenType.STRUCT) {
          throw this.error(this.peek(), `不能使用关键字 '${this.peek().lexeme}' 作为变量名。`);
        }
      }
      this.consume(TokenType.IDENTIFIER, '应为变量名。');
      const name = this.previous();

      let size: AST.Expr | undefined = undefined;
      if (this.match(TokenType.LBRACKET)) {
        if (!this.check(TokenType.RBRACKET)) {
          size = this.expression();
        }
        this.consume(TokenType.RBRACKET, "数组声明应有 ']'。");
      }

      let initializer: AST.Expr | undefined = undefined;
      if (this.match(TokenType.ASSIGN)) {
        if (this.match(TokenType.LBRACE)) {
          // 初始化列表
          const elements: AST.Expr[] = [];
          if (!this.check(TokenType.RBRACE)) {
            do {
              elements.push(this.expression());
            } while (this.match(TokenType.COMMA));
          }
          this.consume(TokenType.RBRACE, "初始化列表应由 '}' 闭合。");
          initializer = { kind: 'InitializerList', elements };
        } else {
          // 简单表达式初始化
          initializer = this.expression();
        }
      }

      // 语法校验
      if (size && initializer && initializer.kind !== 'InitializerList') {
        throw this.error(name, '数组不能用单个表达式初始化，请使用初始化列表。');
      }
      if (!size && initializer && initializer.kind !== 'InitializerList') {
        // This is a normal variable assignment, which is fine.
        // e.g. int x = 5;
      }
      if (size === undefined && initializer === undefined && this.check(TokenType.LBRACKET)) {
         // This is an array declaration without explicit size, it must be initialized.
         // But the check for initializer is later. Let's refine this.
         // The case `int arr[];` without initializer is invalid.
      }
      if (size === undefined && initializer?.kind !== 'InitializerList' && declarators.some(d => d.size)) {
        // This logic is getting complicated. Let's simplify.
        // An array must have a size or an initializer list.
      }
      if (size === undefined && initializer?.kind !== 'InitializerList' && this.peek().type === TokenType.SEMICOLON) {
        // This is tricky. `int arr[]` is invalid.
        // The condition `if (this.match(TokenType.LBRACKET))` already happened.
        // So if size is undefined, it means we saw `[]`.
        // If we saw `[]` and there is no initializer, it's an error.
        const isArrayDeclaration = declarators.length > 0 && declarators[declarators.length-1].size !== undefined;
        // The logic is getting complex. Let's simplify the validation.
      }

      // Simplified validation: if it's an array (size is not null, or it was parsed as []), it can't have a simple initializer.
      const isArray = size !== undefined || (this.previous().type === TokenType.RBRACKET);
      if (isArray && initializer && initializer.kind !== 'InitializerList') {
         throw this.error(name, '数组不能用单个表达式初始化，请使用初始化列表。');
      }
      // If size is implicit (size is undefined but it was an array `[]`), it MUST have an initializer list.
      if (size === undefined && isArray && (!initializer || initializer.kind !== 'InitializerList')) {
        throw this.error(name, '隐式大小的数组声明必须包含初始化列表。');
      }


      declarators.push({ kind: 'Declarator', name, initializer, size });
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
      if (this.match(TokenType.LBRACKET)) {
        const index = this.expression();
        this.consume(TokenType.RBRACKET, "数组访问应有 ']'。");
        expr = { kind: 'Subscript', object: expr, index };
        continue;
      }

      if (this.match(TokenType.INC, TokenType.DEC)) {
        // 处理后缀 ++ 和 --
        const operator = this.previous();
        if (expr.kind !== 'Identifier' && expr.kind !== 'Subscript') {
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
      const prev = this.previous();
      return { kind: 'Literal', value: Number(prev.lexeme), type: prev.type };
    }
    if (this.match(TokenType.TRUE)) return { kind: 'Literal', value: true, type: TokenType.TRUE };
    if (this.match(TokenType.FALSE)) return { kind: 'Literal', value: false, type: TokenType.FALSE };
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
      const right = this.parsePrecedence(7); // 使用一元优先级
      return { kind: 'Unary', operator, right };
    }
    // 处理前缀 ++ 和 --
    if (this.match(TokenType.INC, TokenType.DEC)) {
      const operator = this.previous();
      const argument = this.parsePrecedence(7); // 使用一元优先级
      if (argument.kind !== 'Identifier' && argument.kind !== 'Subscript') {
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

      if (expr.kind === 'Identifier' || expr.kind === 'Subscript') {
        return { kind: 'Assignment', target: expr, operator, value };
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

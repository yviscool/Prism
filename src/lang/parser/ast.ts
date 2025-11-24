// src/lang/parser/ast.ts
import { Token } from '../lexer/tokens';

/**
 * @file 抽象语法树 (AST) 节点类型定义
 * @description
 * 定义了将 C++ 子集源码解析后生成的树状结构。
 * 每个节点代表代码中的一个构造，例如表达式、语句或声明。
 * 这是编译器中连接语法分析和代码生成的关键数据结构。
 * @author tmac
 */

// 所有 AST 节点的基类接口
export interface Node {
  // 'kind' 属性用于在处理节点时进行类型区分 (类似于访问者模式中的 'accept')
  kind: string;
}

// --- 表达式 (Expressions) ---
// 表达式是任何可以被求值的代码片段
export interface Expr extends Node {}

export interface LiteralExpr extends Expr {
  kind: 'Literal';
  value: any; // 字面量的实际值 (e.g., 123, true, "hello")
}

export interface IdentifierExpr extends Expr {
  kind: 'Identifier';
  name: Token; // 包含标识符名称的令牌
}

export interface BinaryExpr extends Expr {
  kind: 'Binary';
  left: Expr;
  operator: Token; // e.g., +, -, *, /
  right: Expr;
}

export interface UnaryExpr extends Expr {
  kind: 'Unary';
  operator: Token; // e.g., -, !
  right: Expr;
}

export interface AssignmentExpr extends Expr {
  kind: 'Assignment';
  name: Token; // 被赋值的标识符
  operator: Token; // 赋值运算符, e.g., =, +=, -=
  value: Expr; // 赋给标识符的表达式
}

export interface UpdateExpr extends Expr {
  kind: 'Update';
  operator: Token; // ++ or --
  argument: Expr;
  prefix: boolean; // true for ++i, false for i++
}

// --- 语句 (Statements) ---
// 语句是执行一个动作的代码片段，但本身不被求值
export interface Stmt extends Node {}

// 代表整个程序的根节点
export interface Program extends Stmt {
    kind: 'Program';
    body: Stmt[];
}

// 代表一个表达式作为一条完整语句的情况 (e.g., "x = 1;")
export interface ExpressionStmt extends Stmt {
  kind: 'ExpressionStmt';
  expression: Expr;
}

// 代表一个代码块 { ... }
export interface BlockStmt extends Stmt {
  kind: 'BlockStmt';
  body: Stmt[];
}

// 代表一个变量声明语句 (e.g., "int a = 10;")
export interface VarDeclaration extends Stmt {
  kind: 'VarDeclaration';
  dataType: Token; // 变量类型令牌 (e.g., 'int')
  name: Token;     // 变量名令牌
  initializer?: Expr; // 可选的初始化表达式
}

// 代表 if-else 语句
export interface IfStmt extends Stmt {
  kind: 'IfStmt';
  condition: Expr;
  thenBranch: Stmt;
  elseBranch?: Stmt;
}

// 代表 while 循环语句
export interface WhileStmt extends Stmt {
  kind: 'WhileStmt';
  condition: Expr;
  body: Stmt;
}

// 未来将添加 ForStmt 等

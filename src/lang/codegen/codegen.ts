// src/lang/codegen/codegen.ts
import * as AST from '../parser/ast';
import { Instruction } from '../../core/isa/instructions';
import { TokenType } from '../lexer/tokens';
import { OpCode } from '../../core/isa/opcodes';
import { createInt, createDouble, createBool } from '../../core/memory/values';
import { SymbolTable } from './symbol-table';

/**
 * @file 代码生成器 (Code Generator)
 * @description
 * 遍历 AST (抽象语法树)，并将其转换为虚拟机可以执行的线性字节码指令序列。
 * 采用访问者模式 (Visitor Pattern) 对不同类型的 AST 节点进行处理。
 * @author tmac
 */
export class CodeGenerator {
  private bytecode: Instruction[] = [];
  private symbolTable: SymbolTable;

  constructor() {
    this.symbolTable = new SymbolTable();
  }

  /**
   * 主入口：接收 AST 程序根节点，返回生成的字节码。
   * @param program AST 的根节点
   * @returns 字节码指令数组
   */
  public generate(program: AST.Program): Instruction[] {
    this.bytecode = [];
    this.symbolTable = new SymbolTable();

    for (const stmt of program.body) {
      this.visit(stmt);
    }
    return this.bytecode;
  }

  /**
   * 访问者模式分发器
   * @param node 当前访问的 AST 节点
   */
  private visit(node: AST.Node): void {
    switch (node.kind) {
      case 'Program':
        for (const stmt of node.body) this.visit(stmt);
        break;
      case 'BlockStmt':
        this.visitBlockStatement(node);
        break;
      case 'VarDeclaration':
        this.visitVarDeclaration(node);
        break;
      case 'IfStmt':
        this.visitIfStatement(node);
        break;
      case 'WhileStmt':
        this.visitWhileStatement(node);
        break;
      case 'ExpressionStmt':
        this.visitExpressionStatement(node);
        break;
      // 表达式
      case 'Assignment':
        this.visitAssignmentExpression(node);
        break;
      case 'Binary':
        this.visitBinaryExpression(node);
        break;
      case 'Unary':
        this.visitUnaryExpression(node);
        break;
      case 'Update':
        this.visitUpdateExpression(node);
        break;
      case 'Literal':
        this.visitLiteral(node);
        break;
      case 'Identifier':
        this.visitIdentifier(node);
        break;
      default:
        // @ts-ignore
        throw new Error(`未知的 AST 节点类型: ${node.kind}`);
    }
  }

  // --- 语句编译器 ---

  private visitBlockStatement(stmt: AST.BlockStmt): void {
    this.symbolTable.enterScope();
    for (const statement of stmt.body) {
      this.visit(statement);
    }
    const numLocals = this.symbolTable.exitScope();
    if (numLocals > 0) {
      this.emit(OpCode.POP_N, numLocals);
    }
  }

  private visitIfStatement(stmt: AST.IfStmt): void {
    // 1. 编译条件
    this.visit(stmt.condition);

    // 2. 发出 JUMP_IF_FALSE 指令，并获取其位置以便后续回填
    const thenJump = this.emitJump(OpCode.JUMP_IF_FALSE);

    // 3. 编译 then 分支
    this.visit(stmt.thenBranch);

    // 4. 如果有 else 分支，发出一个 JUMP 指令跳过 else
    const elseJump = stmt.elseBranch ? this.emitJump(OpCode.JUMP) : null;

    // 5. 回填 then 跳转指令的目标地址 (即当前指令的位置)
    this.patchJump(thenJump);

    // 6. 编译 else 分支
    if (stmt.elseBranch) {
      this.visit(stmt.elseBranch);
      // 7. 回填 else 跳转指令
      if (elseJump) this.patchJump(elseJump);
    }
  }

  private visitWhileStatement(stmt: AST.WhileStmt): void {
    // 1. 记录循环开始的位置
    const loopStart = this.bytecode.length;

    // 2. 编译循环条件
    this.visit(stmt.condition);

    // 3. 发出 JUMP_IF_FALSE 指令跳出循环
    const exitJump = this.emitJump(OpCode.JUMP_IF_FALSE);

    // 4. 编译循环体
    this.visit(stmt.body);

    // 5. 发出 JUMP 指令跳回循环开始的地方
    this.emitLoop(loopStart);

    // 6. 回填跳出循环的指令
    this.patchJump(exitJump);
  }

  private visitVarDeclaration(stmt: AST.VarDeclaration): void {
    // 1. 编译初始化表达式 (如果存在)，将其值推入栈顶
    if (stmt.initializer) {
      this.visit(stmt.initializer);
    } else {
      // 如果没有初始化，根据类型压入默认值
      switch (stmt.dataType.type) {
        case TokenType.INT:
          this.emit(OpCode.PUSH, createInt(0));
          break;
        case TokenType.DOUBLE:
          this.emit(OpCode.PUSH, createDouble(0.0));
          break;
        case TokenType.BOOL:
          this.emit(OpCode.PUSH, createBool(false));
          break;
        default:
          this.emit(OpCode.PUSH, null); // 对于不支持的类型
      }
    }
    
    // 2. 在符号表中定义变量。此时，变量的值就是栈顶的那个值。
    // VM 通过栈的位置来隐式知道这个变量。
    this.symbolTable.define(stmt.name.lexeme);
  }

  private visitExpressionStatement(stmt: AST.ExpressionStmt): void {
    this.visit(stmt.expression);
    // 表达式语句执行完后，其结果通常是无用的，需要从栈上弹出
    this.emit(OpCode.POP);
  }

  // --- 表达式编译器 ---

  private visitAssignmentExpression(expr: AST.AssignmentExpr): void {
    const index = this.symbolTable.resolve(expr.name.lexeme);

    if (expr.operator.type === TokenType.ASSIGN) {
      // 简单赋值: a = b
      // 1. 编译右侧表达式
      this.visit(expr.value);
    } else {
      // 复合赋值: a += b  (等价于 a = a + b)
      // 1. 加载 a 的当前值
      this.emit(OpCode.LOAD, index);
      // 2. 编译右侧表达式
      this.visit(expr.value);
      // 3. 执行相应的二元运算
      switch (expr.operator.type) {
        case TokenType.PLUS_ASSIGN:    this.emit(OpCode.ADD); break;
        case TokenType.MINUS_ASSIGN:   this.emit(OpCode.SUB); break;
        case TokenType.STAR_ASSIGN:    this.emit(OpCode.MUL); break;
        case TokenType.SLASH_ASSIGN:   this.emit(OpCode.DIV); break;
        case TokenType.PERCENT_ASSIGN: this.emit(OpCode.PERCENT); break;
        default:
          throw new Error(`未知的复合赋值运算符: ${expr.operator.lexeme}`);
      }
    }
    
    // 4. 将最终结果存储回变量
    this.emit(OpCode.STORE, index);
  }

  private visitUpdateExpression(expr: AST.UpdateExpr): void {
    if (expr.argument.kind !== 'Identifier') {
      throw new Error('Update expression must have an identifier as an argument.');
    }
    const index = this.symbolTable.resolve(expr.argument.name.lexeme);
    const op = expr.operator.type === TokenType.INC ? OpCode.ADD : OpCode.SUB;

    if (expr.prefix) {
      // ++i: 先加，再加载 (结果是新值)
      this.emit(OpCode.LOAD, index);
      this.emit(OpCode.PUSH, createInt(1));
      this.emit(op);
      this.emit(OpCode.STORE, index);
      this.emit(OpCode.LOAD, index);
    } else {
      // i++: 先加载，再加 (结果是旧值)
      this.emit(OpCode.LOAD, index); // 1. 加载旧值 (这将是表达式的结果)
      this.emit(OpCode.DUP);         // 2. 复制旧值，一个用于计算，一个作为结果
      this.emit(OpCode.PUSH, createInt(1)); // 3. 推入 1
      this.emit(op);                  // 4. 计算新值
      this.emit(OpCode.STORE, index); // 5. 存储新值
      this.emit(OpCode.POP);          // 6. 弹出计算后的新值，留下原来的旧值作为表达式结果
    }
  }

  private visitBinaryExpression(expr: AST.BinaryExpr): void {
    this.visit(expr.left);
    this.visit(expr.right);
    switch (expr.operator.type) {
      case TokenType.PLUS:  this.emit(OpCode.ADD); break;
      case TokenType.MINUS: this.emit(OpCode.SUB); break;
      case TokenType.STAR:  this.emit(OpCode.MUL); break;
      case TokenType.SLASH: this.emit(OpCode.DIV); break;
      case TokenType.PERCENT: this.emit(OpCode.PERCENT); break;
      case TokenType.EQ:    this.emit(OpCode.EQ); break;
      case TokenType.NEQ:   this.emit(OpCode.NEQ); break;
      case TokenType.LT:    this.emit(OpCode.LT); break;
      case TokenType.GT:    this.emit(OpCode.GT); break;
      case TokenType.LTE:   this.emit(OpCode.LTE); break;
      case TokenType.GTE:   this.emit(OpCode.GTE); break;
      default:
        throw new Error(`未知的二元运算符: ${expr.operator.lexeme}`);
    }
  }

  private visitUnaryExpression(expr: AST.UnaryExpr): void {
    this.visit(expr.right);
    switch (expr.operator.type) {
      case TokenType.MINUS: this.emit(OpCode.NEGATE); break;
      case TokenType.LOGICAL_NOT: this.emit(OpCode.NOT); break;
      default:
        throw new Error(`未知的一元运算符: ${expr.operator.lexeme}`);
    }
  }

  private visitLiteral(expr: AST.LiteralExpr): void {
    const value = expr.value;
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        this.emit(OpCode.PUSH, createInt(value));
      } else {
        this.emit(OpCode.PUSH, createDouble(value));
      }
    } else if (typeof value === 'boolean') {
      this.emit(OpCode.PUSH, createBool(value));
    } else {
      this.emit(OpCode.PUSH, null);
    }
  }

  private visitIdentifier(expr: AST.IdentifierExpr): void {
    const index = this.symbolTable.resolve(expr.name.lexeme);
    this.emit(OpCode.LOAD, index);
  }

  // --- 辅助方法 ---

  private emitJump(jumpInstruction: OpCode.JUMP | OpCode.JUMP_IF_FALSE): number {
    this.emit(jumpInstruction, 0); // Placeholder target
    return this.bytecode.length - 1;
  }

  private patchJump(jumpLocation: number): void {
    const target = this.bytecode.length;
    this.bytecode[jumpLocation].operand = target;
  }

  private emitLoop(loopStart: number): void {
    this.emit(OpCode.JUMP, loopStart);
  }

  private emit(opcode: OpCode, operand?: any): void {
    this.bytecode.push({ opcode, operand });
  }
}


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

    // 编译除最后一个之外的所有语句
    for (let i = 0; i < program.body.length - 1; i++) {
      this.visit(program.body[i]);
    }

    // 特殊处理最后一个语句
    const lastStatement = program.body[program.body.length - 1];
    if (lastStatement) {
      // 如果最后一个语句是表达式语句，我们不弹出它的值，
      // 以便它能作为整个程序的返回值。
      if (lastStatement.kind === 'ExpressionStmt') {
        this.visit(lastStatement.expression);
      } else {
        this.visit(lastStatement);
      }
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
      case 'ForStmt':
        this.visitForStatement(node);
        break;
      case 'EmptyStmt':
        // 空语句不生成任何字节码
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
    this.visit(stmt.condition);
    const thenJump = this.emitJump(OpCode.JUMP_IF_FALSE);
    this.visit(stmt.thenBranch);
    const elseJump = stmt.elseBranch ? this.emitJump(OpCode.JUMP) : null;
    this.patchJump(thenJump);
    if (stmt.elseBranch) {
      this.visit(stmt.elseBranch);
      if (elseJump) this.patchJump(elseJump);
    }
  }

  private visitWhileStatement(stmt: AST.WhileStmt): void {
    const loopStart = this.bytecode.length;
    this.visit(stmt.condition);
    const exitJump = this.emitJump(OpCode.JUMP_IF_FALSE);
    this.visit(stmt.body);
    this.emitLoop(loopStart);
    this.patchJump(exitJump);
  }

  private visitForStatement(stmt: AST.ForStmt): void {
    this.symbolTable.enterScope();

    // 1. Initializer
    if (stmt.initializer) {
      this.visit(stmt.initializer);
    }

    let loopStart = this.bytecode.length;
    let exitJump = -1;

    // 2. Condition
    if (stmt.condition) {
      this.visit(stmt.condition);
      exitJump = this.emitJump(OpCode.JUMP_IF_FALSE);
    }

    // 3. Body
    this.visit(stmt.body);

    // 4. Increment
    if (stmt.increment) {
      this.visit(stmt.increment);
      // The result of the increment expression is not used
      this.emit(OpCode.POP);
    }

    // 5. Jump back to the condition
    this.emitLoop(loopStart);

    // 6. Patch the exit jump
    if (exitJump !== -1) {
      this.patchJump(exitJump);
    }

    const numLocals = this.symbolTable.exitScope();
    if (numLocals > 0) {
      this.emit(OpCode.POP_N, numLocals);
    }
  }

  private visitVarDeclaration(stmt: AST.VarDeclaration): void {
    for (const declarator of stmt.declarators) {
      // 1. 编译初始化表达式 (如果存在)，将其值推入栈顶
      if (declarator.initializer) {
        this.visit(declarator.initializer);
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
      this.symbolTable.define(declarator.name.lexeme);
    }
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
    // 特殊处理逻辑运算符以实现短路
    if (expr.operator.type === TokenType.LOGICAL_AND) {
      this.visit(expr.left);
      const endJump = this.emitJump(OpCode.JUMP_IF_FALSE_PEEK);
      this.emit(OpCode.POP); // 弹出左侧的 true 值
      this.visit(expr.right);
      this.patchJump(endJump);
      return;
    }

    if (expr.operator.type === TokenType.LOGICAL_OR) {
      this.visit(expr.left);
      const endJump = this.emitJump(OpCode.JUMP_IF_TRUE_PEEK);
      this.emit(OpCode.POP); // 弹出左侧的 false 值
      this.visit(expr.right);
      this.patchJump(endJump);
      return;
    }

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

  private emitJump(jumpInstruction: OpCode.JUMP | OpCode.JUMP_IF_FALSE | OpCode.JUMP_IF_FALSE_PEEK | OpCode.JUMP_IF_TRUE_PEEK): number {
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


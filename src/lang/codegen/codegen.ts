// src/lang/codegen/codegen.ts
import * as AST from '../parser/ast';
import { Instruction } from '../../core/isa/instructions';
import { TokenType } from '../lexer/tokens';
import { OpCode } from '../../core/isa/opcodes';
import { createInt, createDouble, createBool, createUninitialized } from '../../core/memory/values';
import { SymbolTable } from './symbol-table';
import { CompileError } from '../../shared/errors';

/**
 * @file 代码生成器 (Code Generator)
 * @description
 * 遍历 AST (抽象语法树)，并将其转换为虚拟机可以执行的线性字节码指令序列。
 * 采用访问者模式 (Visitor Pattern) 对不同类型的 AST 节点进行处理。
 * @author tmac
 */
interface LoopContext {
  breakJumps: number[]; // Indices of JUMP instructions for 'break'
  continueLabel: number; // Target index for 'continue'
  continueJumps?: number[]; // Used when continueLabel is not yet known (e.g. For loops)
}

export class CodeGenerator {
  private bytecode: Instruction[] = [];
  private symbolTable: SymbolTable;
  private loopStack: LoopContext[] = [];

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
      case 'BreakStmt':
        this.visitBreakStmt(node as AST.BreakStmt);
        break;
      case 'ContinueStmt':
        this.visitContinueStmt(node as AST.ContinueStmt);
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
      case 'Subscript':
        this.visitSubscriptExpression(node);
        break;
      default:
        // @ts-ignore
        throw new Error(`未知的 AST 节点类型: ${node.kind}`);
    }
  }

  // --- 语句编译器 ---

  private visitSubscriptExpression(expr: AST.SubscriptExpr): void {
    // 编译数组对象和索引，将它们推到栈上
    this.visit(expr.object);
    this.visit(expr.index);
    // 发出加载指令
    this.emit(OpCode.LOAD_IDX);
  }

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

    // Push loop context for break/continue
    // For while loops, continue jumps to the start (condition check)
    this.loopStack.push({ breakJumps: [], continueLabel: loopStart });

    this.visit(stmt.condition);
    const exitJump = this.emitJump(OpCode.JUMP_IF_FALSE);

    this.visit(stmt.body);

    this.emitLoop(loopStart);
    this.patchJump(exitJump);

    // Patch breaks
    const context = this.loopStack.pop()!;
    for (const breakJump of context.breakJumps) {
      this.patchJump(breakJump);
    }
  }

  private visitForStatement(stmt: AST.ForStmt): void {
    this.symbolTable.enterScope();

    // 1. Initializer
    if (stmt.initializer) {
      this.visit(stmt.initializer);
    }

    const loopStart = this.bytecode.length;
    let exitJump = -1;

    // 2. Condition
    if (stmt.condition) {
      this.visit(stmt.condition);
      exitJump = this.emitJump(OpCode.JUMP_IF_FALSE);
    }

    // Prepare loop context.
    // However, the increment code is not yet generated, so we don't know its label.
    // But we know 'continue' should jump to where 'increment' starts.
    // Since 'increment' is generated after 'body', we can't know the exact index yet.
    // Wait... if we generate increment code *after* body, the code looks like:
    // [Init]
    // LoopStart:
    // [Condition] -> JUMP_IF_FALSE Exit
    // [Body]
    // IncrementStart:
    // [Increment]
    // JUMP LoopStart
    // Exit:

    // So 'continue' should jump to IncrementStart.
    // We can use a placeholder for continueLabel, or simply generate a JUMP to a placeholder,
    // and collect all continues to patch them later, similar to breaks.
    // BUT, my current LoopContext structure expects a fixed continueLabel.
    // Let's modify the strategy for FOR loops slightly: we can't set continueLabel immediately.
    // Actually, we can just track continue jumps separately for FOR loops if we wanted,
    // or we can allow `continueLabel` to be -1 and if so, record the jumps in a separate list in context.
    // Simpler approach:
    // We push the context. Since we don't know IncrementStart yet, we can't set continueLabel.
    // But wait, the standard way to handle this in single-pass codegen for structured loops is:
    // Treat 'continue' as a jump to a "continue target".
    // For 'while', continue target = loop start.
    // For 'for', continue target = increment start.

    // Let's defer patching 'continue' for 'for' loops.
    // I will add `continueJumps` to LoopContext.

    // Revised LoopContext logic inline:
    // Note: I need to update LoopContext interface definition if I want to support this properly.
    // Or I can use a trick:
    // `continue` in `for` loop jumps to a specific label. I can generate a label (noop or just the index) later.
    // I will add `continueJumps` to the context and patch them.

    // Let's go with adding `continueJumps` to `LoopContext` in the class property, but I can't edit the interface I just added easily without another diff.
    // Wait, I can just replace the interface definition in this block since it's at the top.

    // Let's assume I will change LoopContext to:
    // interface LoopContext {
    //   breakJumps: number[];
    //   continueLabel: number; // if -1, use continueJumps
    //   continueJumps: number[];
    // }

    // Actually, for `while`, continueLabel is known. For `for`, it is not.
    // So `continueLabel` can be used for `while`, and `continueJumps` for `for`.
    // Or just always use `continueJumps` and patch them?
    // While: continue -> jumps to loopStart. loopStart is known. So we can emit JUMP loopStart immediately.
    // For: continue -> jumps to incrementStart. incrementStart is unknown. We must emit JUMP 0 and patch.

    // Implementation Detail:
    // I'll update LoopContext to include `continueJumps` and make `continueLabel` optional or nullable.

    // Re-planning the visitForStatement logic below based on this thought process.

    const context: LoopContext = { breakJumps: [], continueLabel: -1, continueJumps: [] };
    this.loopStack.push(context);

    // 3. Body
    this.visit(stmt.body);

    // Define the target for 'continue' (start of increment)
    const incrementStart = this.bytecode.length;

    // Patch all collected continue jumps to here
    for (const jump of context.continueJumps!) {
      this.patchJump(jump);
    }

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

    // Patch breaks (to here, the end of loop)
    this.loopStack.pop(); // Pop context
    for (const breakJump of context.breakJumps) {
      this.patchJump(breakJump);
    }

    const numLocals = this.symbolTable.exitScope();
    if (numLocals > 0) {
      this.emit(OpCode.POP_N, numLocals);
    }
  }

  private visitBreakStmt(stmt: AST.BreakStmt): void {
    if (this.loopStack.length === 0) {
      throw new Error("break 语句只能在循环内使用。");
    }
    const context = this.loopStack[this.loopStack.length - 1];
    const jump = this.emitJump(OpCode.JUMP);
    context.breakJumps.push(jump);
  }

  private visitContinueStmt(stmt: AST.ContinueStmt): void {
    if (this.loopStack.length === 0) {
      throw new Error("continue 语句只能在循环内使用。");
    }
    const context = this.loopStack[this.loopStack.length - 1];

    if (context.continueLabel !== -1) {
      // Known target (e.g. while loop)
      this.emit(OpCode.JUMP, context.continueLabel);
    } else {
      // Unknown target (e.g. for loop), record for patching
      const jump = this.emitJump(OpCode.JUMP);
      if (!context.continueJumps) context.continueJumps = [];
      context.continueJumps.push(jump);
    }
  }

  private visitVarDeclaration(stmt: AST.VarDeclaration): void {
    for (const declarator of stmt.declarators) {
      const isArray = declarator.size !== undefined || (declarator.initializer && declarator.initializer.kind === 'InitializerList');

      if (isArray) {
        const initializer = declarator.initializer as AST.InitializerListExpr | undefined;

        // 1. 分配数组
        if (declarator.size) {
          this.visit(declarator.size);
        } else {
          // 隐式大小，从初始化列表获取
          if (!initializer) throw new Error('隐式大小的数组必须被初始化。'); // Should be caught by parser, but as a safeguard.
          this.emit(OpCode.PUSH, createInt(initializer.elements.length));
        }
        this.emit(OpCode.ALLOC_ARR, stmt.dataType); // 栈顶现在是数组指针

        // 2. 初始化数组元素
        if (initializer) {
          if (initializer.kind !== 'InitializerList') throw new Error('数组需要一个初始化列表。'); // Safeguard
          
          // 在编译时检查初始化列表大小
          if (declarator.size && declarator.size.kind === 'Literal') {
            const declaredSize = declarator.size.value as number;
            const initializerSize = initializer.elements.length;
            if (initializerSize > declaredSize) {
              throw new CompileError(`初始化列表的元素数量 (${initializerSize}) 超出数组大小 (${declaredSize})。`);
            }
          }

          for (let i = 0; i < initializer.elements.length; i++) {
            this.emit(OpCode.DUP); // 复制数组指针
            this.emit(OpCode.PUSH, createInt(i)); // 推入索引
            this.visit(initializer.elements[i]); // 推入元素值
            this.emit(OpCode.STORE_IDX); // 存储
            this.emit(OpCode.POP); // 弹出 STORE_IDX 留下的值
          }
        }
      } else {
        // 普通变量声明
        if (declarator.initializer) {
          this.visit(declarator.initializer);
        } else {
          // 如果没有初始化，推入未初始化哨兵值
          this.emit(OpCode.PUSH, createUninitialized());
        }
      }
      
      // 在符号表中定义变量。此时，变量的值(或数组指针)就是栈顶的那个值。
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
    const target = expr.target;

    if (target.kind === 'Identifier') {
      const index = this.symbolTable.resolve(target.name.lexeme);

      if (expr.operator.type === TokenType.ASSIGN) {
        // 简单赋值: a = b
        this.visit(expr.value);
      } else {
        // 复合赋值: a += b (等价于 a = a + b)
        this.emit(OpCode.LOAD, index);
        this.visit(expr.value);
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
      this.emit(OpCode.STORE, index);

    } else if (target.kind === 'Subscript') {
      const subscript = target as AST.SubscriptExpr;
      if (expr.operator.type === TokenType.ASSIGN) {
        // 简单赋值: arr[i] = value
        this.visit(subscript.object);
        this.visit(subscript.index);
        this.visit(expr.value);
        this.emit(OpCode.STORE_IDX);
      } else {
        // 复合赋值: arr[i] += value
        // 这是一个 "read-modify-write" 序列
        // 1. 准备地址以供最终写入
        this.visit(subscript.object);
        this.visit(subscript.index);

        // 2. 准备地址并读取旧值
        this.visit(subscript.object);
        this.visit(subscript.index);
        this.emit(OpCode.LOAD_IDX);

        // 3. 计算新值
        this.visit(expr.value);
        switch (expr.operator.type) {
          case TokenType.PLUS_ASSIGN:    this.emit(OpCode.ADD); break;
          case TokenType.MINUS_ASSIGN:   this.emit(OpCode.SUB); break;
          case TokenType.STAR_ASSIGN:    this.emit(OpCode.MUL); break;
          case TokenType.SLASH_ASSIGN:   this.emit(OpCode.DIV); break;
          case TokenType.PERCENT_ASSIGN: this.emit(OpCode.PERCENT); break;
          default:
            throw new Error(`未知的数组复合赋值运算符: ${expr.operator.lexeme}`);
        }

        // 4. 执行写入, 此时栈顶是 [ptr, index, result]
        this.emit(OpCode.STORE_IDX);
      }
    } else {
      throw new Error('无效的赋值目标');
    }
  }

  private visitUpdateExpression(expr: AST.UpdateExpr): void {
    const op = expr.operator.type === TokenType.INC ? OpCode.ADD : OpCode.SUB;
    const argument = expr.argument;

    if (argument.kind === 'Identifier') {
      const index = this.symbolTable.resolve(argument.name.lexeme);
      if (expr.prefix) {
        // ++i: 先加，再加载 (结果是新值)
        this.emit(OpCode.LOAD, index);
        this.emit(OpCode.PUSH, createInt(1));
        this.emit(op);
        this.emit(OpCode.STORE, index);
        // this.emit(OpCode.LOAD, index); // STORE现在会把值留在栈顶
      } else {
        // i++: 先加载，再加 (结果是旧值)
        this.emit(OpCode.LOAD, index); // 1. 加载旧值 (这将是表达式的结果)
        this.emit(OpCode.DUP);         // 2. 复制旧值，一个用于计算，一个作为结果
        this.emit(OpCode.PUSH, createInt(1)); // 3. 推入 1
        this.emit(op);                  // 4. 计算新值
        this.emit(OpCode.STORE, index); // 5. 存储新值
        this.emit(OpCode.POP);          // 6. 弹出计算后的新值，留下原来的旧值作为表达式结果
      }
    } else if (argument.kind === 'Subscript') {
      const subscript = argument as AST.SubscriptExpr;
      if (expr.prefix) {
        // ++arr[i]
        // 1. 准备地址
        this.visit(subscript.object);
        this.visit(subscript.index);
        // 2. 读取旧值
        this.visit(subscript.object);
        this.visit(subscript.index);
        this.emit(OpCode.LOAD_IDX);
        // 3. 计算新值
        this.emit(OpCode.PUSH, createInt(1));
        this.emit(op);
        // 4. 存储新值, STORE_IDX 会将新值留在栈顶
        this.emit(OpCode.STORE_IDX);
      } else {
        // arr[i]++
        // 1. 加载旧值，作为表达式的结果
        this.visit(subscript.object);
        this.visit(subscript.index);
        this.emit(OpCode.LOAD_IDX);

        // 2. 准备地址和新值用于存储
        this.visit(subscript.object);
        this.visit(subscript.index);
        
        this.visit(subscript.object);
        this.visit(subscript.index);
        this.emit(OpCode.LOAD_IDX);
        this.emit(OpCode.PUSH, createInt(1));
        this.emit(op);

        // 3. 存储新值
        this.emit(OpCode.STORE_IDX); // 此时栈顶是 [old_val, new_val]
        this.emit(OpCode.POP); // 弹出 new_val, 留下 old_val
      }
    } else {
      throw new Error('Update expression must have an identifier or subscript as an argument.');
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


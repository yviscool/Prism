// src/lang/codegen/symbol-table.ts
/**
 * @file 符号表 (Symbol Table)
 * @description
 * 在编译期间跟踪变量、函数等标识符。
 * 支持作用域链，以正确处理变量遮蔽 (shadowing)。
 * @author tmac
 */

interface Symbol {
  name: string;
  // 变量在哪个作用域深度被定义
  depth: number;
}

export class SymbolTable {
  // 一个扁平的数组，存储所有在作用域内的局部变量
  private locals: Symbol[] = [];
  // 当前作用域的深度
  private scopeDepth = 0;

  constructor() {
    // 全局作用域
    this.enterScope();
  }

  /**
   * 进入一个新的作用域。
   */
  enterScope(): void {
    this.scopeDepth++;
  }

  /**
   * 退出当前作用域。
   * @returns 弹出的作用域中局部变量的数量
   */
  exitScope(): number {
    let numLocals = 0;
    // 从后往前，弹出所有属于当前深度的变量
    while (
      this.locals.length > 0 &&
      this.locals[this.locals.length - 1].depth === this.scopeDepth
    ) {
      this.locals.pop();
      numLocals++;
    }
    this.scopeDepth--;
    return numLocals;
  }

  /**
   * 在当前作用域中定义一个新变量。
   * @param name 变量名
   */
  define(name: string): void {
    // 检查是否在同一作用域内重复定义
    for (let i = this.locals.length - 1; i >= 0; i--) {
      const local = this.locals[i];
      if (local.depth < this.scopeDepth) {
        // 已经离开了当前作用域的范围
        break;
      }
      if (local.name === name) {
        throw new Error(`变量 '${name}' 已在当前作用域中定义。`);
      }
    }
    // 将新变量添加到局部变量列表
    this.locals.push({ name, depth: this.scopeDepth });
  }

  /**
   * 从内到外查找一个变量。
   * @param name 变量名
   * @returns 变量的栈槽位索引，如果找不到则抛出错误
   */
  resolve(name: string): number {
    // 从后往前（从内到外）搜索变量
    for (let i = this.locals.length - 1; i >= 0; i--) {
      if (this.locals[i].name === name) {
        return i; // 返回它在 locals 数组中的索引，这就是它的绝对栈槽位
      }
    }

    throw new Error(`未定义的变量 '${name}'。`);
  }
}

// src/core/memory/stack.ts

/**
 * @file 操作数栈 (Operand Stack)
 * @author tmac
 */

import { VMValue } from './values';

const STACK_MAX_SIZE = 1024;

export class OperandStack {
  private stack: VMValue[] = [];

  push(value: VMValue): void {
    if (this.stack.length >= STACK_MAX_SIZE) {
      // 未来: 替换为结构化错误
      throw new Error('Stack overflow');
    }
    this.stack.push(value);
  }

  pop(): VMValue {
    const value = this.stack.pop();
    if (value === undefined) {
      // 未来: 替换为结构化错误
      throw new Error('Stack underflow');
    }
    return value;
  }

  peek(): VMValue {
    const value = this.stack[this.stack.length - 1];
    if (value === undefined) {
      // 未来: 替换为结构化错误
      throw new Error('Stack is empty');
    }
    return value;
  }

  get size(): number {
    return this.stack.length;
  }
}

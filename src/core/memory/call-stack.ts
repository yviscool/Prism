// src/core/memory/call-stack.ts
import { VMValue } from './values';

const STACK_MAX_SIZE = 2048;

/**
 * @file 虚拟机栈
 * @description
 * 一个统一的栈，用于存储局部变量和操作数。
 * 通过栈指针 (sp) 和基址指针 (bp) 来管理。
 * 这种设计简化了 Stage 2 的实现，未来可以演进为更复杂的调用帧结构。
 * @author tmac
 */
export class VMStack {
  private stack: VMValue[] = new Array(STACK_MAX_SIZE);
  public sp: number = 0; // 栈指针 (Stack Pointer)，永远指向下一个可用的空闲槽位

  push(value: VMValue): void {
    if (this.sp >= STACK_MAX_SIZE) {
      // 未来: 替换为结构化错误
      throw new Error('Stack overflow');
    }
    this.stack[this.sp++] = value;
  }

  pop(): VMValue {
    if (this.sp <= 0) {
      // 未来: 替换为结构化错误
      throw new Error('Stack underflow');
    }
    // sp 指向下一个空闲位置，所以需要先减一再访问
    const value = this.stack[--this.sp];
    return value;
  }

  peek(): VMValue {
    if (this.sp <= 0) {
      // 未来: 替换为结构化错误
      throw new Error('Stack is empty');
    }
    return this.stack[this.sp - 1];
  }

  /**
   * 从相对于基址指针的位置加载一个值（用于局部变量）
   * @param basePointer 基址指针 (bp)
   * @param index 变量槽位索引
   * @returns 加载的值
   */
  load(basePointer: number, index: number): VMValue {
    const addr = basePointer + index;
    if (addr < 0 || addr >= this.sp) {
      // 未来: 替换为结构化错误
      throw new Error(`Invalid local variable load at index ${index}`);
    }
    return this.stack[addr];
  }

  /**
   * 将一个值存储到相对于基址指针的位置（用于局部变量）
   * @param basePointer 基址指针 (bp)
   * @param index 变量槽位索引
   * @param value 要存储的值
   */
  store(basePointer: number, index: number, value: VMValue): void {
    const addr = basePointer + index;
    if (addr < 0 || addr >= STACK_MAX_SIZE) {
      // 未来: 替换为结构化错误
      throw new Error(`Invalid local variable store at index ${index}`);
    }
    this.stack[addr] = value;
  }
}

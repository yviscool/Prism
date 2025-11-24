// src/shared/errors.ts
/**
 * @file 结构化错误定义
 * @description 定义编译器错误、运行时错误等，提供丰富的上下文信息。
 * @author tmac
 */

export class EternityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class CompileError extends EternityError {}

export class RuntimeError extends EternityError {
  // 未来可以携带 ip, callstack 等信息用于调试
  constructor(message:string) {
    super(message);
  }
}


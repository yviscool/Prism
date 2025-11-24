// src/core/isa/instructions.ts

/**
 * @file 指令的数据结构定义
 * @author tmac
 */

import { OpCode } from './opcodes';

/**
 * 代表一条完整的 VM 指令。
 * 它包含操作码和可能的参数。
 * 未来可以扩展，包含 SourceMap 信息用于调试。
 */
export interface Instruction {
  opcode: OpCode;
  operand?: any; // 指令的操作数，例如 PUSH 1 中的 1
}

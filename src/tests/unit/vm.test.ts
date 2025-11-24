// src/tests/unit/vm.test.ts

import { describe, test, expect, spyOn } from 'bun:test';
import { VirtualMachine } from '../../core/vm/virtual-machine';
import { OpCode } from '../../core/isa/opcodes';
import { Instruction } from '../../core/isa/instructions';
import { ValueType, createInt } from '../../core/memory/values';

describe('VirtualMachine Stage 1: Bare Metal', () => {
  test('should execute PUSH, ADD, and PRINT correctly', () => {
    // 对应 "PUSH 1, PUSH 2, ADD, PRINT"
    const bytecode: Instruction[] = [
      { opcode: OpCode.PUSH, operand: createInt(1) },
      { opcode: OpCode.PUSH, operand: createInt(2) },
      { opcode: OpCode.ADD },
      { opcode: OpCode.PRINT },
    ];

    const vm = new VirtualMachine(bytecode);

    // 监视 console.log
    const consoleSpy = spyOn(console, 'log');

    const finalResult = vm.runToEnd();

    // 验证最终栈顶结果
    expect(finalResult).not.toBeNull();
    expect(finalResult?.type).toBe(ValueType.INT);
    expect(finalResult?.value).toBe(3);

    // 验证 PRINT 指令的行为
    expect(consoleSpy).toHaveBeenCalledWith(3);

    // 清理 spy
    consoleSpy.mockRestore();
  });

  test('should handle stack operations correctly', () => {
    const bytecode: Instruction[] = [
      { opcode: OpCode.PUSH, operand: createInt(10) },
      { opcode: OpCode.PUSH, operand: createInt(20) },
      { opcode: OpCode.POP },
    ];

    const vm = new VirtualMachine(bytecode);
    const finalResult = vm.runToEnd();

    expect(finalResult).not.toBeNull();
    expect(finalResult?.type).toBe(ValueType.INT);
    expect(finalResult?.value).toBe(10);
  });
});

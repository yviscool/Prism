// src/tests/unit/vm_stage2.test.ts

import { describe, test, expect } from 'bun:test';
import { VirtualMachine } from '../../core/vm/virtual-machine';
import { OpCode } from '../../core/isa/opcodes';
import { Instruction } from '../../core/isa/instructions';
import { ValueType, createInt } from '../../core/memory/values';
import { RuntimeError } from '../../shared/errors';

describe('VirtualMachine Stage 2: Flow & Memory', () => {
  test('should simulate a for-loop with array access', () => {
    // 模拟 C++ 代码:
    // {
    //   int sum = 0;                      // 局部变量 0: sum
    //   int i = 0;                        // 局部变量 1: i
    //   int* arr_ptr;                     // 局部变量 2: arr_ptr
    //   arr_ptr = new int[3];
    //   for (i = 0; i < 3; i = i + 1) {
    //     arr_ptr[i] = i + 10; // 使用 ADD 代替 MUL
    //     sum = sum + arr_ptr[i];
    //   }
    // }
    const bytecode: Instruction[] = [
      // 指令地址 | 指令 & 操作数
      /* 0*/ { opcode: OpCode.RESERVE, operand: 3 },      // 3 locals: sum, i, arr_ptr
      
      /* 1*/ { opcode: OpCode.PUSH, operand: createInt(0) },
      /* 2*/ { opcode: OpCode.STORE, operand: 0 },       // sum = 0

      /* 3*/ { opcode: OpCode.PUSH, operand: createInt(0) },
      /* 4*/ { opcode: OpCode.STORE, operand: 1 },       // i = 0

      /* 5*/ { opcode: OpCode.PUSH, operand: createInt(3) },
      /* 6*/ { opcode: OpCode.ALLOC_ARR },
      /* 7*/ { opcode: OpCode.STORE, operand: 2 },       // arr_ptr = new int[3]

      // 循环检查 (循环头)
      /* 8*/ { opcode: OpCode.LOAD, operand: 1 },        // load i
      /* 9*/ { opcode: OpCode.PUSH, operand: createInt(3) },
      /*10*/ { opcode: OpCode.LT },                      // i < 3
      /*11*/ { opcode: OpCode.JUMP_IF_FALSE, operand: 29 },// if not (i < 3), jump to end

      // 循环体
      // arr_ptr[i] = i + 10
      /*12*/ { opcode: OpCode.LOAD, operand: 2 },        // load arr_ptr
      /*13*/ { opcode: OpCode.LOAD, operand: 1 },        // load i (for index)
      /*14*/ { opcode: OpCode.LOAD, operand: 1 },        // load i (for value)
      /*15*/ { opcode: OpCode.PUSH, operand: createInt(10) },
      /*16*/ { opcode: OpCode.ADD },                     // i + 10
      /*17*/ { opcode: OpCode.STORE_IDX },               // arr_ptr[i] = ...

      // sum = sum + arr_ptr[i]
      /*18*/ { opcode: OpCode.LOAD, operand: 0 },        // load sum
      /*19*/ { opcode: OpCode.LOAD, operand: 2 },        // load arr_ptr
      /*20*/ { opcode: OpCode.LOAD, operand: 1 },        // load i
      /*21*/ { opcode: OpCode.LOAD_IDX },                // load arr_ptr[i]
      /*22*/ { opcode: OpCode.ADD },                     // sum + arr_ptr[i]
      /*23*/ { opcode: OpCode.STORE, operand: 0 },       // store back to sum

      // i = i + 1
      /*24*/ { opcode: OpCode.LOAD, operand: 1 },        // load i
      /*25*/ { opcode: OpCode.PUSH, operand: createInt(1) },
      /*26*/ { opcode: OpCode.ADD },
      /*27*/ { opcode: OpCode.STORE, operand: 1 },       // store back to i

      // 无条件跳转回循环头
      /*28*/ { opcode: OpCode.JUMP, operand: 8 },

      // 循环结束
      /*29*/ { opcode: OpCode.LOAD, operand: 0 },        // load sum to stack top as final result
    ];
    
    // 预期 sum = (0+10) + (1+10) + (2+10) = 10 + 11 + 12 = 33
    const vm = new VirtualMachine(bytecode);
    const finalResult = vm.runToEnd();

    expect(finalResult).not.toBeNull();
    expect(finalResult?.type).toBe(ValueType.INT);
    expect(finalResult?.value).toBe(33);
  });

  test('should throw RuntimeError on array out-of-bounds access', () => {
    const bytecode: Instruction[] = [
      { opcode: OpCode.RESERVE, operand: 1 },          // 1 local: arr_ptr
      
      { opcode: OpCode.PUSH, operand: createInt(1) },  // array size 1
      { opcode: OpCode.ALLOC_ARR },
      { opcode: OpCode.STORE, operand: 0 },            // arr_ptr at locals[0]
      
      { opcode: OpCode.LOAD, operand: 0 },             // load arr_ptr
      { opcode: OpCode.PUSH, operand: createInt(1) },  // index 1 (out of bounds for size 1)
      { opcode: OpCode.LOAD_IDX },
    ];

    const vm = new VirtualMachine(bytecode);
    
    // expect a function to throw, we need to wrap it in an arrow function
    const run = () => vm.runToEnd();

    expect(run).toThrow(new RuntimeError('数组访问越界：索引 1 超出范围 [0, 0]'));
  });
});

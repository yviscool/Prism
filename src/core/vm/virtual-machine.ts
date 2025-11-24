// src/core/vm/virtual-machine.ts

/**
 * @file 永恒内核虚拟机 (Eternity Kernel Virtual Machine)
 * @author tmac
 */

import { Instruction } from '../isa/instructions';
import { OpCode } from '../isa/opcodes';
import { VMStack } from '../memory/call-stack';
import { Heap } from '../memory/heap';
import { createBool, createInt, createPointer, Pointer, ValueType, VMValue } from '../memory/values';
import { Guardian } from './guardian';
import { RuntimeError } from '../../shared/errors';

export class VirtualMachine {
  private instructions: Instruction[] = [];
  private ip: number = 0; // 指令指针 (Instruction Pointer)
  
  private stack: VMStack = new VMStack();
  private bp: number = 0; // 基址指针 (Base Pointer) for the current stack frame

  private heap: Heap = new Heap();
  private guardian: Guardian = new Guardian();

  constructor(bytecode: Instruction[]) {
    this.instructions = bytecode;
  }

  // VM 主执行循环，设计为 Generator 以便未来进行单步调试和可视化
  *run(): Generator<void, VMValue | null, void> {
    while (this.ip < this.instructions.length) {
      const instruction = this.instructions[this.ip];
      this.ip++;

      switch (instruction.opcode) {
        case OpCode.RESERVE:
          this.stack.sp += instruction.operand;
          break;
          
        case OpCode.PUSH:
          // PUSH 的操作数现在被视为一个完整的 VMValue
          this.stack.push(instruction.operand);
          break;

        case OpCode.POP:
          this.stack.pop();
          break;
        
        case OpCode.POP_N:
          for (let i = 0; i < instruction.operand; i++) {
            this.stack.pop();
          }
          break;

        case OpCode.DUP:
          this.stack.push(this.stack.peek());
          break;

        case OpCode.ADD: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          // TODO: Move to ALU
          const result = createInt(left.value + right.value);
          this.stack.push(result);
          break;
        }
        case OpCode.SUB: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          const result = createInt(left.value - right.value);
          this.stack.push(result);
          break;
        }
        case OpCode.MUL: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          const result = createInt(left.value * right.value);
          this.stack.push(result);
          break;
        }
        case OpCode.DIV: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          // 模拟 C++ 整数除法
          const result = createInt(Math.trunc(left.value / right.value));
          this.stack.push(result);
          break;
        }
        case OpCode.PERCENT: {
            const right = this.stack.pop();
            const left = this.stack.pop();
            const result = createInt(left.value % right.value);
            this.stack.push(result);
            break;
        }

        case OpCode.NEGATE: {
          const value = this.stack.pop();
          this.stack.push(createInt(-value.value));
          break;
        }
        case OpCode.NOT: {
          const value = this.stack.pop();
          this.stack.push(createBool(!value.value));
          break;
        }
        
        case OpCode.PRINT: {
          const value = this.stack.peek();
          if (value.type === ValueType.POINTER) {
            console.log(`Pointer(address=${(value.value as Pointer).address})`);
          } else {
            console.log(value.value);
          }
          break;
        }

        // === 变量与作用域 ===
        case OpCode.LOAD:
          this.stack.push(this.stack.load(this.bp, instruction.operand));
          break;
        
        case OpCode.STORE:
          // STORE 不弹出值，以支持 a = b = c
          this.stack.store(this.bp, instruction.operand, this.stack.peek());
          break;

        // === 比较运算 ===
        case OpCode.EQ: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(createBool(left.value === right.value));
          break;
        }
        case OpCode.NEQ: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(createBool(left.value !== right.value));
          break;
        }
        case OpCode.LT: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(createBool(left.value < right.value));
          break;
        }
        case OpCode.GT: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(createBool(left.value > right.value));
          break;
        }
        case OpCode.LTE: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(createBool(left.value <= right.value));
          break;
        }
        case OpCode.GTE: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(createBool(left.value >= right.value));
          break;
        }

        // === 控制流 ===
        case OpCode.JUMP:
          this.ip = instruction.operand;
          break;

        case OpCode.JUMP_IF_FALSE: {
          const value = this.stack.pop();
          // 只有严格的 false, 整数 0, double 0.0 才被认为是假
          let isFalse = false;
          if (value.type === ValueType.BOOL && value.value === false) isFalse = true;
          else if ((value.type === ValueType.INT || value.type === ValueType.DOUBLE) && value.value === 0) isFalse = true;
          
          if (isFalse) {
            this.ip = instruction.operand;
          }
          break;
        }

        // === 堆内存与数组 ===
        case OpCode.ALLOC_ARR: {
          const sizeVal = this.stack.pop();
          if (sizeVal.type !== ValueType.INT) {
            throw new RuntimeError('数组大小必须是整数');
          }
          const address = this.heap.allocArray(sizeVal.value);
          this.stack.push(createPointer(address));
          break;
        }

        case OpCode.LOAD_IDX: {
          const indexVal = this.stack.pop();
          const ptrVal = this.stack.pop();

          if (ptrVal.type !== ValueType.POINTER) throw new RuntimeError('LOAD_IDX 需要一个指针');
          if (indexVal.type !== ValueType.INT) throw new RuntimeError('数组索引必须是整数');

          const address = (ptrVal.value as Pointer).address;
          const index = indexVal.value;

          const rawHeap = this.heap.getRawMemory();
          this.guardian.checkHeapAddress(address, rawHeap.length);
          const arr = rawHeap[address];
          this.guardian.checkArrayBounds(arr.length, index);

          const value = this.heap.load(address, index);
          this.stack.push(value);
          break;
        }

        case OpCode.STORE_IDX: {
          const valueToStore = this.stack.pop();
          const indexVal = this.stack.pop();
          const ptrVal = this.stack.pop();

          if (ptrVal.type !== ValueType.POINTER) throw new RuntimeError('STORE_IDX 需要一个指针');
          if (indexVal.type !== ValueType.INT) throw new RuntimeError('数组索引必须是整数');

          const address = (ptrVal.value as Pointer).address;
          const index = indexVal.value;

          const rawHeap = this.heap.getRawMemory();
          this.guardian.checkHeapAddress(address, rawHeap.length);
          const arr = rawHeap[address];
          this.guardian.checkArrayBounds(arr.length, index);

          this.heap.store(address, index, valueToStore);
          break;
        }

        default:
          throw new Error(`Unknown opcode: ${OpCode[instruction.opcode]}`);
      }
      yield; // 在每条指令执行后暂停，以便外部观察状态
    }

    // 执行完毕，如果栈顶有值，则作为结果返回
    if (this.stack.sp > this.bp) {
      return this.stack.peek();
    }

    return null;
  }

  // 一个简单的执行器，直接运行到底
  runToEnd(): VMValue | null {
    const gen = this.run();
    let result = gen.next();
    while (!result.done) {
      result = gen.next();
    }
    return result.value;
  }
}

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

  private checkInitialized(value: VMValue, count: number = 1): void {
    if (value.type === ValueType.UNINITIALIZED) {
      throw new RuntimeError('使用了未初始化的变量。');
    }
    // A potential future improvement is to check multiple values from the stack at once.
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

        case OpCode.SWAP: {
          const a = this.stack.pop();
          const b = this.stack.pop();
          this.stack.push(a);
          this.stack.push(b);
          break;
        }

        case OpCode.ADD: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.checkInitialized(left);
          this.checkInitialized(right);
          if ((left.type !== ValueType.INT && left.type !== ValueType.DOUBLE) || (right.type !== ValueType.INT && right.type !== ValueType.DOUBLE)) {
            throw new RuntimeError('操作数必须是数字。');
          }
          const result = createInt(left.value + right.value);
          this.stack.push(result);
          break;
        }
        case OpCode.SUB: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.checkInitialized(left);
          this.checkInitialized(right);
          if ((left.type !== ValueType.INT && left.type !== ValueType.DOUBLE) || (right.type !== ValueType.INT && right.type !== ValueType.DOUBLE)) {
            throw new RuntimeError('操作数必须是数字。');
          }
          const result = createInt(left.value - right.value);
          this.stack.push(result);
          break;
        }
        case OpCode.MUL: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.checkInitialized(left);
          this.checkInitialized(right);
          if ((left.type !== ValueType.INT && left.type !== ValueType.DOUBLE) || (right.type !== ValueType.INT && right.type !== ValueType.DOUBLE)) {
            throw new RuntimeError('操作数必须是数字。');
          }
          const result = createInt(left.value * right.value);
          this.stack.push(result);
          break;
        }
        case OpCode.DIV: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.checkInitialized(left);
          this.checkInitialized(right);
          if ((left.type !== ValueType.INT && left.type !== ValueType.DOUBLE) || (right.type !== ValueType.INT && right.type !== ValueType.DOUBLE)) {
            throw new RuntimeError('操作数必须是数字。');
          }
          if (right.value === 0) {
            throw new RuntimeError('不能除以零。');
          }
          const result = createInt(Math.trunc(left.value / right.value));
          this.stack.push(result);
          break;
        }
        case OpCode.PERCENT: {
            const right = this.stack.pop();
            const left = this.stack.pop();
            this.checkInitialized(left);
            this.checkInitialized(right);
            if ((left.type !== ValueType.INT && left.type !== ValueType.DOUBLE) || (right.type !== ValueType.INT && right.type !== ValueType.DOUBLE)) {
                throw new RuntimeError('操作数必须是数字。');
            }
            if (right.value === 0) {
                throw new RuntimeError('不能除以零。');
            }
            const result = createInt(left.value % right.value);
            this.stack.push(result);
            break;
        }

        case OpCode.NEGATE: {
          const value = this.stack.pop();
          this.checkInitialized(value);
          if (value.type !== ValueType.INT && value.type !== ValueType.DOUBLE) {
            throw new RuntimeError('操作数必须是数字。');
          }
          this.stack.push(createInt(-value.value));
          break;
        }
        case OpCode.NOT: {
          const value = this.stack.pop();
          this.checkInitialized(value);
          if (value.type !== ValueType.BOOL) {
            // Or should it coerce? For now, strict.
            // throw new RuntimeError('Operand must be a boolean.');
          }
          this.stack.push(createBool(!value.value));
          break;
        }
        
        case OpCode.PRINT: {
          const value = this.stack.peek();
          this.checkInitialized(value);
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
          const valueToStore = this.stack.peek();
          // Storing an uninitialized value is not an error, but using it is.
          // However, if we do `int b = a;` where a is uninit, `b` becomes uninit.
          // The error is thrown when `b` is used. This is correct.
          // What about `a = b` where b is uninit? `a` becomes uninit.
          // Let's check the value being stored.
          this.checkInitialized(valueToStore);
          this.stack.store(this.bp, instruction.operand, valueToStore);
          break;

        // === 比较运算 ===
        case OpCode.EQ: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.checkInitialized(left);
          this.checkInitialized(right);
          this.stack.push(createBool(left.value === right.value));
          break;
        }
        case OpCode.NEQ: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.checkInitialized(left);
          this.checkInitialized(right);
          this.stack.push(createBool(left.value !== right.value));
          break;
        }
        case OpCode.LT: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.checkInitialized(left);
          this.checkInitialized(right);
          if ((left.type !== ValueType.INT && left.type !== ValueType.DOUBLE) || (right.type !== ValueType.INT && right.type !== ValueType.DOUBLE)) {
            throw new RuntimeError('操作数必须是数字。');
          }
          this.stack.push(createBool(left.value < right.value));
          break;
        }
        case OpCode.GT: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.checkInitialized(left);
          this.checkInitialized(right);
          if ((left.type !== ValueType.INT && left.type !== ValueType.DOUBLE) || (right.type !== ValueType.INT && right.type !== ValueType.DOUBLE)) {
            throw new RuntimeError('操作数必须是数字。');
          }
          this.stack.push(createBool(left.value > right.value));
          break;
        }
        case OpCode.LTE: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.checkInitialized(left);
          this.checkInitialized(right);
          if ((left.type !== ValueType.INT && left.type !== ValueType.DOUBLE) || (right.type !== ValueType.INT && right.type !== ValueType.DOUBLE)) {
            throw new RuntimeError('操作数必须是数字。');
          }
          this.stack.push(createBool(left.value <= right.value));
          break;
        }
        case OpCode.GTE: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.checkInitialized(left);
          this.checkInitialized(right);
          if ((left.type !== ValueType.INT && left.type !== ValueType.DOUBLE) || (right.type !== ValueType.INT && right.type !== ValueType.DOUBLE)) {
            throw new RuntimeError('操作数必须是数字。');
          }
          this.stack.push(createBool(left.value >= right.value));
          break;
        }

        // === 控制流 ===
        case OpCode.JUMP:
          this.ip = instruction.operand;
          break;

        case OpCode.JUMP_IF_FALSE: {
          const value = this.stack.pop();
          this.checkInitialized(value);
          if (value.type !== ValueType.BOOL) {
            throw new RuntimeError('条件表达式必须是布尔值。');
          }
          
          if (value.value === false) {
            this.ip = instruction.operand;
          }
          break;
        }

        case OpCode.JUMP_IF_FALSE_PEEK: {
          const value = this.stack.peek();
          this.checkInitialized(value);
          if (value.type !== ValueType.BOOL) {
            throw new RuntimeError('条件表达式必须是布尔值。');
          }
          if (value.value === false) {
            this.ip = instruction.operand;
          }
          break;
        }

        case OpCode.JUMP_IF_TRUE_PEEK: {
          const value = this.stack.peek();
          this.checkInitialized(value);
          if (value.type !== ValueType.BOOL) {
            throw new RuntimeError('条件表达式必须是布尔值。');
          }
          if (value.value === true) {
            this.ip = instruction.operand;
          }
          break;
        }

        // === 堆内存与数组 ===
        case OpCode.ALLOC_ARR: {
          const sizeVal = this.stack.pop();
          this.checkInitialized(sizeVal);
          if (sizeVal.type !== ValueType.INT) {
            throw new RuntimeError('数组大小必须是整数');
          }
          const typeToken = instruction.operand; // 接收类型
          const address = this.heap.allocArray(sizeVal.value, typeToken);
          this.stack.push(createPointer(address));
          break;
        }

        case OpCode.LOAD_IDX: {
          const indexVal = this.stack.pop();
          const ptrVal = this.stack.pop();
          this.checkInitialized(indexVal);
          this.checkInitialized(ptrVal);

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
          this.checkInitialized(valueToStore);
          this.checkInitialized(indexVal);
          this.checkInitialized(ptrVal);

          if (ptrVal.type !== ValueType.POINTER) throw new RuntimeError('STORE_IDX 需要一个指针');
          if (indexVal.type !== ValueType.INT) throw new RuntimeError('数组索引必须是整数');

          const address = (ptrVal.value as Pointer).address;
          const index = indexVal.value;

          const rawHeap = this.heap.getRawMemory();
          this.guardian.checkHeapAddress(address, rawHeap.length);
          const arr = rawHeap[address];
          this.guardian.checkArrayBounds(arr.length, index);

          this.heap.store(address, index, valueToStore);
          // 赋值表达式应该有返回值，所以把存入的值再推回去
          this.stack.push(valueToStore);
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

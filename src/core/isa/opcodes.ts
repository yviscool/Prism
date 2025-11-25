// src/core/isa/opcodes.ts

/**
 * @file 指令集定义 (Instruction Set Architecture)
 *
 * Eternity VM 的所有操作码 (OpCode) 都在此枚举。
 * 每个 OpCode 是一个单字节的数字。
 *
 * @author tmac
 */

export enum OpCode {
  // === 栈操作 (Stack Operations) ===
  /**
   * PUSH <value>
   * 将一个值推入操作数栈顶。
   * value: 从指令流中紧跟的常量池索引或立即数。
   */
  PUSH,

  /**
   * POP
   * 从操作数栈顶弹出一个值。
   */
  POP,

  /**
   * POP_N <count>
   * 从操作数栈顶弹出 N 个值。
   */
  POP_N,

  /**
   * DUP
   * 复制栈顶的值。
   */
  DUP,

  /**
   * SWAP
   * 交换栈顶的两个值。
   */
  SWAP,

  // === 算术运算 (Arithmetic Operations) ===
  /**
   * ADD
   * 弹出栈顶两个值，相加后将结果推回栈顶。
   */
  ADD,
  /**
   * SUB
   * 弹出栈顶两个值，相减 (a - b) 后将结果推回栈顶。
   */
  SUB,
  /**
   * MUL
   * 弹出栈顶两个值，相乘后将结果推回栈顶。
   */
  MUL,
  /**
   * DIV
   * 弹出栈顶两个值，相除 (a / b) 后将结果推回栈顶。
   */
  DIV,
  /**
   * PERCENT
   * 弹出栈顶两个值，取模 (a % b) 后将结果推回栈顶。
   */
  PERCENT,

  // === 一元运算 (Unary Operations) ===
  /**
   * NEGATE
   * 弹出栈顶的值，取反后推回。
   */
  NEGATE,
  /**
   * NOT
   * 弹出栈顶的值，进行逻辑非操作后推回。
   */
  NOT,

  // === 调试 (Debugging) ===
  /**
   * PRINT
   * 弹出栈顶的值并打印到控制台。
   * (主要用于早期调试)
   */
  PRINT,

  // === 变量与作用域 (Variables & Scope) ===
  /**
   * LOAD <index>
   * 从当前帧的局部变量区加载一个值到操作数栈顶。
   * index: 变量在栈帧中的槽位索引 (相对于基址指针 bp)。
   */
  LOAD,
  /**
   * STORE <index>
   * 将操作数栈顶的值存储到当前帧的局部变量区。
   * index: 变量在栈帧中的槽位索引 (相对于基址指针 bp)。
   * 注意：这不会从栈上弹出值，以支持 a = b = c 这样的链式赋值。
   */
  STORE,

  // === 比较运算 (Comparison Operations) ===
  /**
   * EQ
   * 弹出栈顶两个值，比较是否相等，将布尔结果推回栈顶。
   */
  EQ,
  /**
   * NEQ
   * 弹出栈顶两个值，比较是否不相等，将布尔结果推回栈顶。
   */
  NEQ,
  /**
   * LT
   * 弹出栈顶两个值，比较 a < b，将布尔结果推回栈顶。
   */
  LT,
  /**
   * GT
   * 弹出栈顶两个值，比较 a > b，将布尔结果推回栈顶。
   */
  GT,
  /**
   * LTE
   * 弹出栈顶两个值，比较 a <= b，将布尔结果推回栈顶。
   */
  LTE,
  /**
   * GTE
   * 弹出栈顶两个值，比较 a >= b，将布尔结果推回栈顶。
   */
  GTE,

  // === 控制流 (Control Flow) ===
  /**
   * JUMP <address>
   * 无条件跳转到指定的指令地址。
   * address: 目标指令在字节码中的绝对地址。
   */
  JUMP,
  /**
   * JUMP_IF_FALSE <address>
   * 弹出栈顶的值，如果为假 (false, 0, null)，则跳转到指定地址。
   * address: 目标指令在字节码中的绝对地址。
   */
  JUMP_IF_FALSE,

  /**
   * JUMP_IF_FALSE_PEEK <address>
   * 查看栈顶的值，如果为假，则跳转，但不弹出值。
   */
  JUMP_IF_FALSE_PEEK,
  /**
   * JUMP_IF_TRUE_PEEK <address>
   * 查看栈顶的值，如果为真，则跳转，但不弹出值。
   */
  JUMP_IF_TRUE_PEEK,

  // === 堆内存与数组 (Heap & Array) ===
  /**
   * ALLOC_ARR
   * 弹出栈顶的值作为数组大小，在堆上分配数组，并将指针推回栈顶。
   */
  ALLOC_ARR,
  /**
   * LOAD_IDX
   * 弹出索引和数组指针，加载数组元素，将结果推回栈顶。
   * stack: [... ptr, index] -> [... value]
   */
  LOAD_IDX,
  /**
   * STORE_IDX
   * 弹出值、索引和数组指针，将值存入数组。
   * stack: [... ptr, index, value] -> [...]
   */
  STORE_IDX,
}

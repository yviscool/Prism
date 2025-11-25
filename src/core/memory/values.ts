// src/core/memory/values.ts

/**
 * @file VM 运行时值的类型定义
 * @author tmac
 */

// 值类型枚举
export enum ValueType {
  INT,
  DOUBLE,
  BOOL,
  UNINITIALIZED,
  POINTER,
}

// 基础值接口
interface BaseValue<T extends ValueType, V> {
  type: T;
  value: V;
}

// 具体的 VM 值类型
export type VMInt = BaseValue<ValueType.INT, number>;
export type VMDouble = BaseValue<ValueType.DOUBLE, number>;
export type VMBool = BaseValue<ValueType.BOOL, boolean>;

// --- Uninitialized ---
export interface UninitializedValue extends VMValue {
  type: ValueType.UNINITIALIZED;
  value: null;
}

const uninitializedInstance: UninitializedValue = { type: ValueType.UNINITIALIZED, value: null };

export function createUninitialized(): UninitializedValue {
  return uninitializedInstance;
}


// --- Pointer ---
// 指针类型，用于引用堆内存中的数据
export interface Pointer {
  // 在堆中的地址/索引
  address: number;
  // 指向的数据类型，目前仅支持数组
  type: 'array';
}
export type VMPointer = BaseValue<ValueType.POINTER, Pointer>;

// 所有可能的值类型联合
export type VMValue = VMInt | VMDouble | VMBool | VMPointer;

// 工厂函数，方便创建
export const createInt = (value: number): VMInt => ({
  type: ValueType.INT,
  value: Math.trunc(value), // 保证整数
});

export const createDouble = (value: number): VMDouble => ({
  type: ValueType.DOUBLE,
  value,
});

export const createBool = (value: boolean): VMBool => ({
  type: ValueType.BOOL,
  value,
});

export const createPointer = (address: number, type: 'array' = 'array'): VMPointer => ({
  type: ValueType.POINTER,
  value: { address, type },
});

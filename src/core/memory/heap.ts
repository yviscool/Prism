// src/core/memory/heap.ts
import { VMValue, createInt } from './values';

/**
 * @file 堆内存 (Heap)
 * @description 模拟 C++ 的堆内存，用于存储数组等动态分配的数据。
 * @author tmac
 */
export class Heap {
  // 使用数组的数组来模拟堆内存，外层数组的索引即为“地址”
  private memory: (VMValue[])[] = [];

  /**
   * 在堆上分配一个数组。
   * @param size 数组的期望大小。
   * @param initialValues 可选的初始化值列表。
   * @returns 分配好的数组在堆中的地址（指针）。
   */
  allocArray(size: number, initialValues?: VMValue[]): number {
    const newArray: VMValue[] = new Array(size);

    // 使用提供的初始值或默认值（整数 0）填充数组
    for (let i = 0; i < size; i++) {
      if (initialValues && initialValues[i]) {
        newArray[i] = initialValues[i];
      } else {
        newArray[i] = createInt(0); // C++ 风格，默认初始化为 0
      }
    }

    this.memory.push(newArray);
    // 返回新数组的地址（即它在 memory 数组中的索引）
    return this.memory.length - 1;
  }

  /**
   * 加载堆上数组中的一个元素。
   * @param address 数组的堆地址。
   * @param index 要加载的元素的索引。
   * @returns 加载到的 VMValue。
   * @note 此方法不进行边界检查，检查是 Guardian 的职责。
   */
  load(address: number, index: number): VMValue {
    return this.memory[address][index];
  }

  /**
   * 向堆上数组的一个元素中存储值。
   * @param address 数组的堆地址。
   * @param index 要存储的元素的索引。
   * @param value 要存储的 VMValue。
   * @note 此方法不进行边界检查，检查是 Guardian 的职责。
   */
  store(address: number, index: number, value: VMValue): void {
    this.memory[address][index] = value;
  }

  /**
   * 获取对原始堆内存的引用。
   * @returns 堆内存数组。
   * @warning 此方法应仅由虚拟机内核和 Guardian 等特权组件使用。
   */
  getRawMemory(): (VMValue[])[] {
    return this.memory;
  }
}


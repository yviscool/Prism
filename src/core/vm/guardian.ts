// src/core/vm/guardian.ts
import { RuntimeError } from '../../shared/errors';

/**
 * @file 运行时守卫 (Runtime Guardian)
 * @description 在 VM 执行期间进行实时安全检查，如数组越界、空指针等。
 * @author tmac
 */
export class Guardian {
  /**
   * 检查数组访问是否越界。
   * @param arrayLength 目标数组的长度。
   * @param index 尝试访问的索引。
   */
  checkArrayBounds(arrayLength: number, index: number): void {
    if (index < 0 || index >= arrayLength) {
      throw new RuntimeError(`数组访问越界：索引 ${index} 超出范围 [0, ${arrayLength - 1}]`);
    }
  }

  /**
   * 检查地址是否是有效的堆地址。
   * @param address 要检查的地址。
   * @param heapSize 当前堆的大小（已分配对象的数量）。
   */
  checkHeapAddress(address: number, heapSize: number): void {
    if (address < 0 || address >= heapSize) {
      throw new RuntimeError(`无效的内存地址：试图访问地址 ${address}，但堆大小仅为 ${heapSize}`);
    }
  }
}


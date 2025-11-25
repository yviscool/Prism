// src/tests/integration/cases_array.test.ts
import { describe, test, expect } from 'bun:test';
import { compile } from '../../lang/compiler';
import { VirtualMachine } from '../../core/vm/virtual-machine';
import { RuntimeError } from '../../shared/errors';

describe('Native Arrays', () => {
  function run(source: string) {
    const bytecode = compile(source);
    const vm = new VirtualMachine(bytecode);
    return vm.runToEnd();
  }

  test('should handle basic array declaration and access', () => {
    const source = `
      int arr[3];
      arr[0] = 10;
      arr[1] = 20;
      arr[2] = arr[0] + arr[1];
      arr[2];
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(30);
  });

  test('should throw RuntimeError on out-of-bounds access (negative)', () => {
    const source = `
      int arr[3];
      arr[-1] = 10;
    `;
    expect(() => run(source)).toThrow(new RuntimeError('数组访问越界：索引 -1 超出范围 [0, 2]'));
  });

  test('should throw RuntimeError on out-of-bounds access (equal to length)', () => {
    const source = `
      int arr[3];
      arr[3] = 10;
    `;
    expect(() => run(source)).toThrow(new RuntimeError('数组访问越界：索引 3 超出范围 [0, 2]'));
  });

  test('should handle variable as index', () => {
    const source = `
      int arr[5];
      int sum = 0;
      for (int i = 0; i < 5; i = i + 1) {
        arr[i] = i * 2;
      }
      for (int i = 0; i < 5; i = i + 1) {
        sum = sum + arr[i];
      }
      sum; // 0 + 2 + 4 + 6 + 8 = 20
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(20);
  });

  test('should handle constant expression as array size', () => {
    const source = `
      int arr[2+3]; // size 5
      arr[4] = 123;
      arr[4];
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(123);
  });

  test('should handle compound assignment on array elements', () => {
    const source = `
      int arr[] = {0, 10, 20};
      arr[1] += 5; // 10 + 5 = 15
      arr[1];
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(15);
  });

  test('should handle prefix increment on array elements', () => {
    const source = `
      int arr[] = {10};
      ++arr[0];
      arr[0];
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(11);
  });

  test('should handle postfix increment on array elements', () => {
    const source = `
      int arr[] = {10};
      int y = arr[0]++;
      y;
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(10);
  });

  test('should throw CompileError if initializer list is larger than array size', () => {
    const source = `
      int arr[2] = {1, 2, 3};
    `;
    expect(() => compile(source)).toThrow('初始化列表的元素数量 (3) 超出数组大小 (2)。');
  });

  test('should pad with zeros if initializer list is smaller than array size', () => {
    const source = `
      int arr[5] = {10, 20};
      arr[2]; // Should be 0
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(0);
  });

  test('should zero-initialize when using an empty initializer list', () => {
    const source = `
      int arr[3] = {};
      arr[1];
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(0);
  });

  test('should handle variables and expressions in initializer list', () => {
    const source = `
      int x = 10;
      int arr[] = {x, x + 5, 30};
      arr[1];
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(15);
  });

  test('should correctly pad and handle double arrays', () => {
    const source = `
      double arr[3] = {1.1};
      arr[1]; // Should be 0.0
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(0.0);
  });

  test('should correctly pad and handle bool arrays', () => {
    const source = `
      bool arr[2] = {true};
      arr[1]; // Should be false
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(false);
  });
});


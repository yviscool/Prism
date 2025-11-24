// src/tests/integration/cases_break_continue.test.ts
import { describe, test, expect } from 'bun:test';
import { compile } from '../../lang/compiler';
import { VirtualMachine } from '../../core/vm/virtual-machine';

describe('Break and Continue', () => {
  function run(source: string) {
    const bytecode = compile(source);
    const vm = new VirtualMachine(bytecode);
    return vm.runToEnd();
  }

  test('should handle break in while loop', () => {
    const source = `
      int i = 0;
      int sum = 0;
      while (i < 10) {
        if (i == 5) {
          break;
        }
        sum = sum + i;
        i++;
      }
      sum;
    `;
    const finalValue = run(source);
    // 0 + 1 + 2 + 3 + 4 = 10
    expect(finalValue?.value).toBe(10);
  });

  test('should handle continue in while loop', () => {
    const source = `
      int i = 0;
      int sum = 0;
      while (i < 10) {
        i++;
        if (i % 2 == 0) {
          continue;
        }
        sum = sum + i;
      }
      sum;
    `;
    // i goes 1 to 10
    // sum adds: 1, 3, 5, 7, 9
    // 1+3+5+7+9 = 25
    const finalValue = run(source);
    expect(finalValue?.value).toBe(25);
  });

  test('should handle break in for loop', () => {
    const source = `
      int sum = 0;
      for (int i = 0; i < 10; i++) {
        if (i == 5) {
          break;
        }
        sum = sum + i;
      }
      sum;
    `;
    // 0 + 1 + 2 + 3 + 4 = 10
    const finalValue = run(source);
    expect(finalValue?.value).toBe(10);
  });

  test('should handle continue in for loop', () => {
    const source = `
      int sum = 0;
      for (int i = 0; i < 10; i++) {
        if (i % 2 == 0) {
          continue;
        }
        sum = sum + i;
      }
      sum;
    `;
    // i: 0(skip), 1(add), 2(skip), 3(add), ... 9(add)
    // 1 + 3 + 5 + 7 + 9 = 25
    const finalValue = run(source);
    expect(finalValue?.value).toBe(25);
  });

  test('should handle nested loops with break', () => {
    const source = `
      int sum = 0;
      for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
          if (j == 1) {
            break;
          }
          sum++;
        }
      }
      sum;
    `;
    // i=0: j=0(add), j=1(break) -> sum=1
    // i=1: j=0(add), j=1(break) -> sum=2
    // i=2: j=0(add), j=1(break) -> sum=3
    const finalValue = run(source);
    expect(finalValue?.value).toBe(3);
  });

  test('should handle nested loops with continue', () => {
    const source = `
      int sum = 0;
      for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
          if (j == 1) {
            continue;
          }
          sum++;
        }
      }
      sum;
    `;
    // i=0: j=0(add), j=1(skip), j=2(add) -> sum=2
    // i=1: j=0(add), j=1(skip), j=2(add) -> sum=4
    // i=2: j=0(add), j=1(skip), j=2(add) -> sum=6
    const finalValue = run(source);
    expect(finalValue?.value).toBe(6);
  });

  test('should throw error when break is outside loop', () => {
    expect(() => compile('break;')).toThrow("break 语句只能在循环内使用。");
  });

  test('should throw error when continue is outside loop', () => {
    expect(() => compile('continue;')).toThrow("continue 语句只能在循环内使用。");
  });
});

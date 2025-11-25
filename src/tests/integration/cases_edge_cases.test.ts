// src/tests/integration/cases_edge_cases.test.ts
import { describe, test, expect } from 'bun:test';
import { compile } from '../../lang/compiler';
import { VirtualMachine } from '../../core/vm/virtual-machine';
import { RuntimeError } from '../../shared/errors';

describe('Edge Cases and Error Handling (Stage 3)', () => {
  function run(source: string) {
    const bytecode = compile(source);
    const vm = new VirtualMachine(bytecode);
    return vm.runToEnd();
  }

  function expectRuntimeError(source: string, errorMessage: string) {
    expect(() => run(source)).toThrow(new RuntimeError(errorMessage));
  }

  // --- 1. 类型安全 ---
  describe('Type Safety', () => {
    test('should throw error when adding int and bool', () => {
      expectRuntimeError('int a = 1 + true;', '操作数必须是数字。');
    });

    test('should throw error on non-boolean in if condition', () => {
      expectRuntimeError('if (1) {}', '条件表达式必须是布尔值。');
    });

    test('should throw error on non-boolean in while condition', () => {
      expectRuntimeError('while (1) {}', '条件表达式必须是布尔值。');
    });
  });

  // --- 2. 运算边界 ---
  describe('Arithmetic Boundaries', () => {
    test('should perform integer division correctly', () => {
      const finalValue = run('int a = 5 / 2; a;');
      expect(finalValue?.value).toBe(2);
    });

    test('should throw error on division by zero', () => {
      expectRuntimeError('int a = 5 / 0;', '不能除以零。');
    });
  });

  // --- 3. 作用域与遮蔽 ---
  describe('Scope and Shadowing', () => {
    test('should handle complex shadowing and assignment', () => {
      const source = `
        int a = 1;
        int b = 10;
        {
          int a = 2;
          b = a; // b should become 2
        }
        // a should be 1 again, b should be 2
        int c = a + b; // 1 + 2 = 3
        c;
      `;
      const finalValue = run(source);
      expect(finalValue?.value).toBe(3);
    });

    test('should throw error on use of uninitialized variable', () => {
      const source = `
        int a;
        int b = a + 1;
      `;
      expect(() => run(source)).toThrow(new RuntimeError("使用了未初始化的变量。"));
    });
  });

  // --- 4. 控制流边界 ---
  describe('Control Flow Edge Cases', () => {
    test('should handle if statement with empty block', () => {
      const source = `
        int a = 10;
        if (a > 5) {}
        a = 20;
        a;
      `;
      const finalValue = run(source);
      expect(finalValue?.value).toBe(20);
    });

    test('should handle while loop that never executes', () => {
      const source = `
        int a = 1;
        while (false) {
          a = 2;
        }
        a;
      `;
      const finalValue = run(source);
      expect(finalValue?.value).toBe(1);
    });
  });
});

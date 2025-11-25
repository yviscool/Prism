// src/tests/integration/errors.test.ts
import { describe, test, expect } from 'bun:test';
import { compile } from '../../lang/compiler';
import { VirtualMachine } from '../../core/vm/virtual-machine';
import { RuntimeError, CompileError } from '../../shared/errors';

describe('Error Handling and Edge Cases', () => {
  function run(source: string) {
    const bytecode = compile(source);
    const vm = new VirtualMachine(bytecode);
    return vm.runToEnd();
  }

  function expectRuntimeError(source: string, errorMessage: string) {
    expect(() => run(source)).toThrow(new RuntimeError(errorMessage));
  }

  function expectCompileError(source: string, errorMessage: string) {
    expect(() => compile(source)).toThrow(new CompileError(errorMessage));
  }

  describe('Runtime Errors', () => {
    test('should throw error on division by zero', () => {
      expectRuntimeError('int a = 5 / 0;', '不能除以零。');
    });

    test('should throw error on use of uninitialized variable', () => {
      const source = `int a; int b = a + 1;`;
      expectRuntimeError(source, "使用了未初始化的变量。");
    });

    test('should throw error on array out-of-bounds access (negative)', () => {
      const source = `int arr[3]; arr[-1] = 10;`;
      expectRuntimeError(source, '数组访问越界：索引 -1 超出范围 [0, 2]');
    });

    test('should throw error on array out-of-bounds access (equal to length)', () => {
      const source = `int arr[3]; arr[3] = 10;`;
      expectRuntimeError(source, '数组访问越界：索引 3 超出范围 [0, 2]');
    });
  });

  describe('Type Errors (Runtime)', () => {
    test('should throw error when adding int and bool', () => {
      expectRuntimeError('int a = 1 + true;', '操作数必须是数字。');
    });

    test('should throw error on non-boolean in if condition', () => {
      expectRuntimeError('if (1) {}', '条件表达式必须是布尔值。');
    });
  });

  describe('Compile Errors', () => {
    test('should throw error for update on non-lvalue', () => {
      const source = 'int a = 1, b = 2; (a+b)++;';
      expectCompileError(source, "[1:24] 错误在 令牌 '++': 操作数必须是可修改的左值。");
    });

    test('should throw error when accessing for-loop variable outside loop', () => {
      const source = `for (int i = 0; i < 5; i++) {} int j = i;`;
      expectCompileError(source, "未定义的变量 'i'。");
    });

    test('should throw error when break is outside loop', () => {
      expectCompileError('break;', "break 语句只能在循环内使用。");
    });

    test('should throw error when continue is outside loop', () => {
      expectCompileError('continue;', "continue 语句只能在循环内使用。");
    });

    test('should throw error if initializer list is larger than array size', () => {
      const source = `int arr[2] = {1, 2, 3};`;
      expectCompileError(source, '初始化列表的元素数量 (3) 超出数组大小 (2)。');
    });
  });
});

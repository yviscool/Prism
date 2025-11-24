// src/tests/integration/cases_feature_interactions.test.ts
import { describe, test, expect } from 'bun:test';
import { compile } from '../../lang/compiler';
import { VirtualMachine } from '../../core/vm/virtual-machine';
import { CompileError } from '../../shared/errors';

describe('Feature Interactions', () => {
  function run(source: string) {
    const bytecode = compile(source);
    const vm = new VirtualMachine(bytecode);
    return vm.runToEnd();
  }

  test('should handle for loop with compound assignment and logical operators', () => {
    const source = `
      int sum = 0;
      // Loop from 0 to 9, skipping 5, incrementing by 2
      for (int i = 0; i < 10 && i != 5; i += 2) {
        sum = sum + 1; // count number of iterations
      }
      sum; // i = 0, 2, 4, 6, 8 => 5 iterations
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(5);
  });

  test('should handle evaluation order of postfix increment', () => {
    // We define the behavior: i++ evaluates to the value of i *before* the increment.
    // The increment happens immediately after the value is retrieved.
    // So, j = i++ + i; with i=5 becomes j = 5 + 6;
    const source = `
      int i = 5;
      int j = i++ + i;
      j;
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(11);
  });

  test('should throw compile error when accessing for-loop variable outside loop', () => {
    const source = `
      for (int i = 0; i < 5; i++) {
        // ...
      }
      int j = i; // Error: 'i' is not defined in this scope
    `;
    expect(() => compile(source)).toThrow("未定义的变量 'i'。");
  });

  test('should throw compile error for update on non-lvalue', () => {
    const source = 'int a = 1, b = 2; (a+b)++;';
    expect(() => compile(source)).toThrow('操作数必须是可修改的左值。');
  });
});

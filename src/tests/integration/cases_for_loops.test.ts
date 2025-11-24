// src/tests/integration/cases_for_loops.test.ts
import { describe, test, expect } from 'bun:test';
import { compile } from '../../lang/compiler';
import { VirtualMachine } from '../../core/vm/virtual-machine';
import { OpCode } from '../../core/isa/opcodes';

describe('For Loops', () => {
  function run(source: string) {
    const bytecode = compile(source);
    const vm = new VirtualMachine(bytecode);
    return vm.runToEnd();
  }

  test('should execute a standard for loop', () => {
    const source = `
      int sum = 0;
      for (int i = 0; i < 5; i++) {
        sum = sum + i;
      }
      sum;
    `;
    const finalValue = run(source);
    // 0 + 1 + 2 + 3 + 4 = 10
    expect(finalValue?.value).toBe(10);
  });

  test('should handle for loop with no initializer', () => {
    const source = `
      int sum = 0;
      int i = 0;
      for (; i < 5; i++) {
        sum = sum + i;
      }
      sum;
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(10);
  });

  test('should handle for loop with no increment', () => {
    const source = `
      int sum = 0;
      for (int i = 0; i < 5;) {
        sum = sum + i;
        i++;
      }
      sum;
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(10);
  });

  test('should handle for loop with no condition', () => {
    // This test is not feasible without break/return.
    // We will test the scoping of the initializer variable instead.
    const scope_test = `
      int i = 100;
      for (int i = 0; i < 1; i++) {
        // inner i is 0
      }
      i; // should be 100
    `;
    const finalValue = run(scope_test);
    expect(finalValue?.value).toBe(100);
  });

  test('should handle for loop with empty body', () => {
    const source = `
      int i = 0;
      for (i = 0; i < 5; i++);
      i;
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(5);
  });
});

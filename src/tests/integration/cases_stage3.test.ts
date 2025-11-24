// src/tests/integration/cases_stage3.test.ts
import { describe, test, expect } from 'bun:test';
import { compile } from '../../lang/compiler';
import { VirtualMachine } from '../../core/vm/virtual-machine';
import { VMValue, ValueType } from '../../core/memory/values';

describe('Compiler and VM Integration (Stage 3)', () => {
  function run(source: string): { vm: VirtualMachine, finalValue: VMValue | null } {
    const bytecode = compile(source);
    const vm = new VirtualMachine(bytecode);
    const finalValue = vm.runToEnd();
    return { vm, finalValue };
  }

  test('should compile and run a simple while loop', () => {
    const source = `
      int i = 0;
      int sum = 0;
      while (i < 5) {
        sum = sum + i;
        i = i + 1;
      }
      sum; // The final expression statement's value will be on the stack
    `;

    const { vm, finalValue } = run(source);

    // The final value on the stack should be the result of the `sum;` expression
    expect(finalValue).not.toBeNull();
    expect(finalValue?.type).toBe(ValueType.INT);
    expect(finalValue?.value).toBe(10); // 0 + 1 + 2 + 3 + 4 = 10
  });

  test('should compile and run an if/else statement', () => {
    const source = `
      int x = 10;
      int y = 0;
      if (x > 5) {
        y = 1;
      } else {
        y = 2;
      }
      y;
    `;
    const { finalValue } = run(source);
    expect(finalValue?.value).toBe(1);
  });

  test('should handle nested scopes correctly', () => {
    const source = `
      int a = 1;
      {
        int a = 2;
      }
      a;
    `;
    const { finalValue } = run(source);
    expect(finalValue?.value).toBe(1);
  });
});

// src/tests/integration/cases_multi_declarations.test.ts
import { describe, test, expect } from 'bun:test';
import { compile } from '../../lang/compiler';
import { VirtualMachine } from '../../core/vm/virtual-machine';

describe('Multiple Declarations', () => {
  function run(source: string) {
    const bytecode = compile(source);
    const vm = new VirtualMachine(bytecode);
    return vm.runToEnd();
  }

  test('should handle simple multiple declarations', () => {
    const source = `
      int a, b, c;
      a = 1;
      b = 2;
      c = 3;
      int result = a + b + c;
      result;
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(6);
  });

  test('should handle multiple declarations with initializers', () => {
    const source = `
      int a = 10, b = 20, c = 30;
      int result = a + b + c;
      result;
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(60);
  });

  test('should handle mixed declarations', () => {
    const source = `
      int a, b = 5, c;
      a = 1;
      c = a + b; // 1 + 5 = 6
      c;
    `;
    const finalValue = run(source);
    expect(finalValue?.value).toBe(6);
  });
});

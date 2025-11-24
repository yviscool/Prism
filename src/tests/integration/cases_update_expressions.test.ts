// src/tests/integration/cases_update_expressions.test.ts
import { describe, test, expect } from 'bun:test';
import { compile } from '../../lang/compiler';
import { VirtualMachine } from '../../core/vm/virtual-machine';
import { VMValue, ValueType } from '../../core/memory/values';

describe('Update Expressions (Stage 3)', () => {
  function run(source: string): { vm: VirtualMachine, finalValue: VMValue | null } {
    const bytecode = compile(source);
    const vm = new VirtualMachine(bytecode);
    const finalValue = vm.runToEnd();
    return { vm, finalValue };
  }

  test('should handle postfix increment (i++)', () => {
    const source = `
      int i = 5;
      int j = i++; // j should be 5, i should be 6
      j;
    `;
    const { vm, finalValue } = run(source);
    expect(finalValue?.type).toBe(ValueType.INT);
    expect(finalValue?.value).toBe(5);
  });

  test('should handle prefix increment (++i)', () => {
    const source = `
      int i = 5;
      int j = ++i; // j should be 6, i should be 6
      j;
    `;
    const { finalValue } = run(source);
    expect(finalValue?.type).toBe(ValueType.INT);
    expect(finalValue?.value).toBe(6);
  });

  test('should handle postfix decrement (i--)', () => {
    const source = `
      int i = 5;
      int j = i--; // j should be 5, i should be 4
      j;
    `;
    const { finalValue } = run(source);
    expect(finalValue?.type).toBe(ValueType.INT);
    expect(finalValue?.value).toBe(5);
  });

  test('should handle prefix decrement (--i)', () => {
    const source = `
      int i = 5;
      int j = --i; // j should be 4, i should be 4
      j;
    `;
    const { finalValue } = run(source);
    expect(finalValue?.type).toBe(ValueType.INT);
    expect(finalValue?.value).toBe(4);
  });

  test('should handle update expression in a statement', () => {
    const source = `
      int i = 0;
      i++;
      i;
    `;
    const { finalValue } = run(source);
    expect(finalValue?.type).toBe(ValueType.INT);
    expect(finalValue?.value).toBe(1);
  });
});

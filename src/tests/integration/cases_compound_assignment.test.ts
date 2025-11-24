// src/tests/integration/cases_compound_assignment.test.ts
import { describe, test, expect } from 'bun:test';
import { compile } from '../../lang/compiler';
import { VirtualMachine } from '../../core/vm/virtual-machine';
import { VMValue, ValueType } from '../../core/memory/values';

describe('Compound Assignment (Stage 3)', () => {
  function run(source: string): { vm: VirtualMachine, finalValue: VMValue | null } {
    const bytecode = compile(source);
    const vm = new VirtualMachine(bytecode);
    const finalValue = vm.runToEnd();
    return { vm, finalValue };
  }

  test('should handle += correctly', () => {
    const source = `
      int i = 5;
      i += 10;
      i;
    `;
    const { finalValue } = run(source);
    expect(finalValue?.type).toBe(ValueType.INT);
    expect(finalValue?.value).toBe(15);
  });

  test('should handle -= correctly', () => {
    const source = `
      int i = 15;
      i -= 10;
      i;
    `;
    const { finalValue } = run(source);
    expect(finalValue?.type).toBe(ValueType.INT);
    expect(finalValue?.value).toBe(5);
  });

  test('should handle *= correctly', () => {
    const source = `
      int i = 5;
      i *= 10;
      i;
    `;
    const { finalValue } = run(source);
    expect(finalValue?.type).toBe(ValueType.INT);
    expect(finalValue?.value).toBe(50);
  });

  test('should handle /= correctly with integer division', () => {
    const source = `
      int i = 55;
      i /= 10;
      i;
    `;
    const { finalValue } = run(source);
    expect(finalValue?.type).toBe(ValueType.INT);
    expect(finalValue?.value).toBe(5);
  });

  test('should handle %= correctly', () => {
    const source = `
      int i = 55;
      i %= 10;
      i;
    `;
    const { finalValue } = run(source);
    expect(finalValue?.type).toBe(ValueType.INT);
    expect(finalValue?.value).toBe(5);
  });
});

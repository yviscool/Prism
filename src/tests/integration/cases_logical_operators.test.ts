// src/tests/integration/cases_logical_operators.test.ts
import { describe, test, expect } from 'bun:test';
import { compile } from '../../lang/compiler';
import { VirtualMachine } from '../../core/vm/virtual-machine';
import { RuntimeError } from '../../shared/errors';

describe('Logical Operators and Short-Circuiting', () => {
  function run(source: string) {
    const bytecode = compile(source);
    const vm = new VirtualMachine(bytecode);
    return vm.runToEnd();
  }

  function expectRuntimeError(source: string, errorMessage: string) {
    expect(() => run(source)).toThrow(new RuntimeError(errorMessage));
  }

  // --- Basic Logic ---
  test('should evaluate true && true correctly', () => {
    const finalValue = run('bool a = true && true; a;');
    expect(finalValue?.value).toBe(true);
  });

  test('should evaluate true && false correctly', () => {
    const finalValue = run('bool a = true && false; a;');
    expect(finalValue?.value).toBe(false);
  });

  test('should evaluate false && true correctly', () => {
    const finalValue = run('bool a = false && true; a;');
    expect(finalValue?.value).toBe(false);
  });

  test('should evaluate true || false correctly', () => {
    const finalValue = run('bool a = true || false; a;');
    expect(finalValue?.value).toBe(true);
  });

  test('should evaluate false || true correctly', () => {
    const finalValue = run('bool a = false || true; a;');
    expect(finalValue?.value).toBe(true);
  });

  test('should evaluate false || false correctly', () => {
    const finalValue = run('bool a = false || false; a;');
    expect(finalValue?.value).toBe(false);
  });

  // --- Short-Circuiting ---
  describe('Short-Circuiting', () => {
    test('&& should short-circuit on false', () => {
      // This should NOT throw a "division by zero" error because the right side is never executed.
      const source = `
        bool a = false && (1 / 0 > 0);
        a;
      `;
      const finalValue = run(source);
      expect(finalValue?.value).toBe(false);
    });

    test('|| should short-circuit on true', () => {
      // This should NOT throw a "division by zero" error.
      const source = `
        bool a = true || (1 / 0 > 0);
        a;
      `;
      const finalValue = run(source);
      expect(finalValue?.value).toBe(true);
    });
  });

  // --- Precedence and Associativity ---
  describe('Precedence and Associativity', () => {
    test('should handle && and || precedence correctly', () => {
      // && has higher precedence than ||
      // (true && false) || true  => false || true => true
      const source = 'bool a = true && false || true; a;';
      const finalValue = run(source);
      expect(finalValue?.value).toBe(true);
    });

    test('should handle complex logical expression', () => {
      // (false || true) && (false || true) => true && true => true
      const source = 'bool a = (false || true) && (false || true); a;';
      const finalValue = run(source);
      expect(finalValue?.value).toBe(true);
    });
  });
});

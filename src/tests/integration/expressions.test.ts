// src/tests/integration/expressions.test.ts
import { describe, test, expect } from 'bun:test';
import { compile } from '../../lang/compiler';
import { VirtualMachine } from '../../core/vm/virtual-machine';
import { VMValue } from '../../core/memory/values';

describe('Expressions', () => {
  function run(source: string): VMValue | null {
    const bytecode = compile(source);
    const vm = new VirtualMachine(bytecode);
    return vm.runToEnd();
  }

  describe('Arithmetic Operators', () => {
    test('should handle addition', () => {
      const finalValue = run('int a = 10 + 5; a;');
      expect(finalValue?.value).toBe(15);
    });

    test('should handle subtraction', () => {
      const finalValue = run('int a = 10 - 5; a;');
      expect(finalValue?.value).toBe(5);
    });

    test('should handle multiplication', () => {
      const finalValue = run('int a = 10 * 5; a;');
      expect(finalValue?.value).toBe(50);
    });

    test('should handle C++ integer division (truncation)', () => {
      const finalValue = run('int a = 10 / 3; a;');
      expect(finalValue?.value).toBe(3);
    });

    test('should handle modulo', () => {
      const finalValue = run('int a = 10 % 3; a;');
      expect(finalValue?.value).toBe(1);
    });

    test('should handle unary minus', () => {
      const finalValue = run('int a = -10; a;');
      expect(finalValue?.value).toBe(-10);
    });

    test('should handle mixed int and double operations', () => {
      const finalValue = run('double a = 10 / 4.0; a;');
      expect(finalValue?.value).toBe(2.5);
    });
  });

  describe('Operator Precedence and Associativity', () => {
    test('should respect precedence of * over +', () => {
      const finalValue = run('int a = 2 + 3 * 4; a;'); // 2 + 12 = 14
      expect(finalValue?.value).toBe(14);
    });

    test('should respect precedence with parentheses', () => {
      const finalValue = run('int a = (2 + 3) * 4; a;'); // 5 * 4 = 20
      expect(finalValue?.value).toBe(20);
    });
  });

  describe('Comparison Operators', () => {
    test('should handle >', () => {
      const finalValue = run('bool a = 10 > 5; a;');
      expect(finalValue?.value).toBe(true);
    });

    test('should handle <', () => {
      const finalValue = run('bool a = 10 < 5; a;');
      expect(finalValue?.value).toBe(false);
    });

    test('should handle >=', () => {
      const finalValue = run('bool a = 10 >= 10; a;');
      expect(finalValue?.value).toBe(true);
    });

    test('should handle <=', () => {
      const finalValue = run('bool a = 10 <= 5; a;');
      expect(finalValue?.value).toBe(false);
    });

    test('should handle ==', () => {
      const finalValue = run('bool a = 5 == 5; a;');
      expect(finalValue?.value).toBe(true);
    });

    test('should handle !=', () => {
      const finalValue = run('bool a = 5 != 10; a;');
      expect(finalValue?.value).toBe(true);
    });
  });

  describe('Logical Operators and Short-Circuiting', () => {
    test('should evaluate true && true correctly', () => {
      const finalValue = run('bool a = true && true; a;');
      expect(finalValue?.value).toBe(true);
    });

    test('should evaluate true || false correctly', () => {
      const finalValue = run('bool a = true || false; a;');
      expect(finalValue?.value).toBe(true);
    });

    test('&& should short-circuit on false', () => {
      const source = `bool a = false && (1 / 0 > 0); a;`;
      const finalValue = run(source);
      expect(finalValue?.value).toBe(false);
    });

    test('|| should short-circuit on true', () => {
      const source = `bool a = true || (1 / 0 > 0); a;`;
      const finalValue = run(source);
      expect(finalValue?.value).toBe(true);
    });
  });

  describe('Compound Assignment', () => {
    test('should handle +=', () => {
      const finalValue = run('int i = 5; i += 10; i;');
      expect(finalValue?.value).toBe(15);
    });

    test('should handle -=', () => {
      const finalValue = run('int i = 15; i -= 10; i;');
      expect(finalValue?.value).toBe(5);
    });

    test('should handle *=', () => {
      const finalValue = run('int i = 5; i *= 10; i;');
      expect(finalValue?.value).toBe(50);
    });
  });

  describe('Update Expressions', () => {
    test('should handle postfix increment (i++)', () => {
      const finalValue = run('int i = 5; int j = i++; j;');
      expect(finalValue?.value).toBe(5);
    });

    test('should handle prefix increment (++i)', () => {
      const finalValue = run('int i = 5; int j = ++i; j;');
      expect(finalValue?.value).toBe(6);
    });

    test('should handle postfix decrement (i--)', () => {
      const finalValue = run('int i = 5; int j = i--; j;');
      expect(finalValue?.value).toBe(5);
    });

    test('should handle prefix decrement (--i)', () => {
      const finalValue = run('int i = 5; int j = --i; j;');
      expect(finalValue?.value).toBe(4);
    });
  });
});

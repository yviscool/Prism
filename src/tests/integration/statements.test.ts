// src/tests/integration/statements.test.ts
import { describe, test, expect } from 'bun:test';
import { compile } from '../../lang/compiler';
import { VirtualMachine } from '../../core/vm/virtual-machine';
import { VMValue } from '../../core/memory/values';

describe('Statements and Control Flow', () => {
  function run(source: string): VMValue | null {
    const bytecode = compile(source);
    const vm = new VirtualMachine(bytecode);
    return vm.runToEnd();
  }

  describe('Declaration Statements', () => {
    test('should handle simple multiple declarations', () => {
      const source = `
        int a, b, c;
        a = 1; b = 2; c = 3;
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
  });

  describe('If-Else Statements', () => {
    test('should execute if block for true condition', () => {
      const finalValue = run('int y; if (true) { y = 1; } else { y = 2; } y;');
      expect(finalValue?.value).toBe(1);
    });

    test('should execute else block for false condition', () => {
      const finalValue = run('int y; if (false) { y = 1; } else { y = 2; } y;');
      expect(finalValue?.value).toBe(2);
    });

    test('should handle if-else if-else chains', () => {
      const source = `
        int x = 10;
        int y;
        if (x < 5) {
          y = 1;
        } else if (x < 15) {
          y = 2;
        } else {
          y = 3;
        }
        y;
      `;
      const finalValue = run(source);
      expect(finalValue?.value).toBe(2);
    });

    test('should handle nested if-else statements', () => {
      const source = `
        int x = 10, y = 5, z;
        if (x > 5) {
          if (y < 10) {
            z = 1;
          } else {
            z = 2;
          }
        } else {
          z = 3;
        }
        z;
      `;
      const finalValue = run(source);
      expect(finalValue?.value).toBe(1);
    });
  });

  describe('Loop Statements', () => {
    test('should execute a standard while loop', () => {
      const finalValue = run('int i = 0, s = 0; while (i < 5) { s=s+i; i=i+1; } s;');
      expect(finalValue?.value).toBe(10); // 0+1+2+3+4
    });

    test('should execute a standard for loop', () => {
      const finalValue = run('int s = 0; for (int i = 0; i < 5; i++) { s=s+i; } s;');
      expect(finalValue?.value).toBe(10);
    });

    test('should handle break in a for loop', () => {
      const finalValue = run('int s = 0; for (int i = 0; i < 10; i++) { if (i==5) break; s=s+i; } s;');
      expect(finalValue?.value).toBe(10); // 0+1+2+3+4
    });

    test('should handle continue in a for loop', () => {
      const finalValue = run('int s = 0; for (int i = 0; i < 5; i++) { if (i==2) continue; s=s+i; } s;');
      expect(finalValue?.value).toBe(8); // 0+1+3+4
    });
  });

  describe('Scope and Comments', () => {
    test('should handle nested scopes and variable shadowing', () => {
      const finalValue = run('int a = 1; { int a = 2; } a;');
      expect(finalValue?.value).toBe(1);
    });

    test('should ignore single-line comments', () => {
      const source = `
        int x = 10; // This is a comment
        x = x + 5;  // Another one
        x;
      `;
      const finalValue = run(source);
      expect(finalValue?.value).toBe(15);
    });

    test('should ignore multi-line comments', () => {
      const source = `
        int x = 10;
        /* This is a
           multi-line comment */
        x = x + 5;
        x;
      `;
      const finalValue = run(source);
      expect(finalValue?.value).toBe(15);
    });
  });
});

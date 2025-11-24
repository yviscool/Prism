import { compile } from './src/lang/compiler';
import { VirtualMachine } from './src/core/vm/virtual-machine';

// 1. 编写你的 C++ 源代码
const source = `
  int a, b;
  a = 10;
  b = 20;
  int i = a + b;
  i;
`;

// 2. 编译源代码为字节码
const bytecode = compile(source);

console.log('编译完成，生成字节码:');
console.log(bytecode);

// 3. 创建虚拟机并执行字节码
const vm = new VirtualMachine(bytecode);
const finalResult = vm.runToEnd();

// 4. 检查结果
console.log('执行完毕!');
if (finalResult) {
  console.log(`最终栈顶类型: ${finalResult.type}`);
  console.log(`最终栈顶结果: ${finalResult.value}`); // 应该输出 45
}
# Eternity Kernel (永恒内核) - C++ 教学执行器

本仓库是一个基于 Web 的、可视化的、原子级的 C++ 简易解释器内核。它的设计目标是为了教学，将 C++ 代码的执行过程以最细粒度的方式分解和呈现。

## 核心目标

*   **极致原子化**: 打破“一行代码一步”的限制，实现“表达式级”的可视化（如 `sum += arr[i]` 拆解为 取址->取值->累加->回写）。
*   **深度内存模型**: 严谨模拟 **栈 (Stack)** 与 **堆 (Heap)** 的分离，真实还原变量生命周期和内存引用关系。
*   **智能守卫 (Guardian)**: 提供带有上下文的中文友好报错（如：越界检查、死循环预警、未初始化变量拦截）。
*   **十年架构**: 采用 **Compiler + VM (虚拟机)** 架构，确保核心指令集 (ISA) 稳定，上层语法可随意扩展。

## 宏观架构

系统采用典型的 **三层架构**：

1.  **编译器层 (Compiler Layer)**: 负责将 C++ 源代码字符串转换为虚拟机可执行的字节码。
    *   `Source` -> `Lexer` -> `Tokens` -> `Parser` -> `AST` -> `CodeGen` -> `Bytecode`
2.  **内核层 (Core Layer / VM)**: 负责执行字节码、管理内存和状态。
    *   执行 `OpCode` 指令流。
    *   维护 `CallStack` (调用栈) 和 `Heap` (堆内存)。
    *   通过 `Guardian` 进行实时安全拦截。
3.  **追踪层 (Trace Layer)**: 负责生成可视化数据 (暂未完全实现)。
    *   VM 每执行一步，生成一个原子 `Event`，供前端消费渲染。

## ✨ 功能特性

当前项目实现了 **Stage 3** 的所有核心功能，一个图灵完备的计算与流程控制引擎。

### 支持的语法

*   **数据类型**: `int`, `double`, `bool`
*   **运算符**:
    *   算术: `+`, `-`, `*`, `/`, `%` (支持 C++ 整数除法)
    *   赋值: `=`
    *   比较: `==`, `!=`, `>`, `<`, `>=`, `<=`
    *   逻辑: `!` (暂不支持 `&&` 和 `||` 的短路求值)
*   **控制结构**:
    *   `if-else` 语句
    *   `while` 循环
    *   块级作用域 `{ ... }` (支持变量遮蔽)
*   **变量**:
    *   支持变量声明和赋值。
    *   未初始化的变量会被赋予默认值 (`0`, `false`)。

### 暂不支持的特性

*   函数调用
*   原生数组
*   `for` 循环
*   `&&` 和 `||` 的短路求值
*   `i++`, `++i` 等复合运算符

## 快速开始

本项目使用 [Bun](https://bun.sh/) 作为运行时和包管理器。

### 1. 安装依赖

```bash
bun install
```

### 2. 运行测试

我们拥有覆盖词法分析、语法分析、虚拟机和端到端编译的全面测试套件。运行所有测试：

```bash
bun test
```

所有测试通过代表当前系统状态稳定。

### 3. 如何使用

你可以通过 `compile` 函数和 `VirtualMachine` 类来执行一个 C++ 代码片段。

下面是一个如何使用的示例:

```typescript
import { compile } from './src/lang/compiler';
import { VirtualMachine } from './src/core/vm/virtual-machine';

// 1. 编写你的 C++ 源代码
const source = `
  int i = 0;
  int sum = 0;
  while (i < 10) {
    sum = sum + i;
    i = i + 1;
  }
  // 将最终结果作为最后一个表达式，它的值会留在栈顶
  sum; 
`;

// 2. 编译源代码为字节码
const bytecode = compile(source);

// 3. 创建虚拟机并执行字节码
const vm = new VirtualMachine(bytecode);
const finalResult = vm.runToEnd();

// 4. 检查结果
console.log('执行完毕!');
if (finalResult) {
  console.log(`最终栈顶类型: ${finalResult.type}`);
  console.log(`最终栈顶结果: ${finalResult.value}`); // 应该输出 45
}
```

## 目录结构

```text
/src
  /core                    <-- [内核层] 虚拟机心脏
    /isa                   // 指令集架构 (OpCodes)
    /memory                // 内存模型 (栈, 堆, 值)
    /vm                    // 虚拟机主循环和算术逻辑单元
    /trace                 // 可视化事件追踪
  /lang                    <-- [编译器层] C++ 解析
    /lexer                 // 词法分析器
    /parser                // 语法分析器 (AST)
    /codegen               // 代码生成器 (AST -> Bytecode)
  /shared                  <-- [公共工具]
    errors.ts              // 结构化错误定义
    utils.ts               // 通用工具函数
  /tests                   <-- [测试]
    /unit                  // 单元测试
    /integration           // 集成测试
```

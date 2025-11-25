# Eternity Kernel (永恒内核) - C++ 教学执行器

本仓库是一个基于 Web 的、可视化的、原子级的 C++ 简易解释器内核。它的设计目标是为了教学，将 C++ 代码的执行过程以最细粒度的方式分解和呈现。

## 核心目标

*   **极致原子化**: 打破“一行代码一步”的限制，实现“表达式级”的可视化（如 `sum += arr[i]` 拆解为 取址->取值->累加->回写）。
*   **深度内存模型**: 严谨模拟 **栈 (Stack)** 与 **堆 (Heap)** 的分离，真实还原变量生命周期和内存引用关系。
*   **智能守卫 (Guardian)**: 提供带有上下文的中文友好报错（如：数组越界检查、**未初始化变量使用拦截**）。
*   **十年架构**: 采用 **Compiler + VM (虚拟机)** 架构，确保核心指令集 (ISA) 稳定，上层语法可随意扩展。

## 宏观架构

系统采用典型的 **三层架构**，各司其职，协同工作，将 C++ 源代码转化为可执行的原子操作并进行可视化追踪：

1.  **编译器层 (Compiler Layer)**: 负责将 C++ 源代码字符串转换为虚拟机可执行的字节码。此层是语言理解的核心，确保源代码的语法和语义正确性，并将其抽象为机器可理解的指令序列。
    *   `Source` -> `Lexer` -> `Tokens` -> `Parser` -> `AST` -> `CodeGen` -> `Bytecode`
2.  **内核层 (Core Layer / VM)**: 负责执行字节码、管理内存和状态。作为系统的执行引擎，它精确模拟了程序在真实硬件上的运行机制，包括内存分配和指令处理。
    *   执行 `OpCode` 指令流。
    *   维护 `CallStack` (调用栈) 和 `Heap` (堆内存)。
    *   通过 `Guardian` 进行实时安全拦截。
3.  **追踪层 (Trace Layer)**: 负责生成可视化数据 (暂未完全实现)。此层旨在捕获虚拟机执行的每一个原子步骤，为前端提供丰富的数据，以便将程序运行过程以图形化方式呈现。
    *   VM 每执行一步，生成一个原子 `Event`，供前端消费渲染。

## ✨ 功能特性

当前项目完成了 `agent.md` 中定义的 **Phase 1** 所有核心功能，一个图灵完备的计算与流程控制引擎，并包含了对原生数组的完整支持。

### 支持的语法

*   **数据类型**: `int`, `double`, `bool`
*   **运算符**:
    *   算术: `+`, `-`, `*`, `/`, `%` (支持 C++ 整数除法)
    *   赋值: `=`, `+=`, `-=`, `*=`, `/=`, `%=`
    *   自增/自减: `i++`, `++i`, `i--`, `--i` (前缀和后缀)
    *   比较: `==`, `!=`, `>`, `<`, `>=`, `<=`
    *   逻辑: `!`, `&&`, `||` (支持短路求值)
*   **控制结构**:
    *   `if-else` 语句
    *   `while` 循环
    *   `for` 循环 (支持标准 C++ 语法)
    *   `break` 和 `continue` 语句
    *   块级作用域 `{ ... }` (支持变量遮蔽)
*   **变量**:
    *   支持多变量声明 (如 `int a = 1, b, c = 2;`)。
    *   **使用未初始化的变量会在运行时被“智能守卫”拦截并报错**。
*   **原生数组 (Native Arrays)**:
    *   **声明**: 支持显式大小 `int arr[5];` 和通过初始化列表推断大小 `int arr[] = {1,2,3};`。
    *   **初始化**: 支持初始化列表 `{...}`，可包含字面量、变量和表达式。
    *   **零填充**: 当初始化项不足时，剩余元素会自动填充为对应类型的零值 (`0`, `0.0`, `false`)。例如 `int arr[5] = {1,2};`。
    *   **访问与赋值**: 支持通过 `[]` 运算符进行读写。
    *   **交叉操作**: 支持对数组成员进行复合赋值 (`arr[i] += 5;`) 和自增/自减 (`arr[i]++; ++arr[i];`)。
*   **注释**:
    *   单行注释: `// ...`
    *   多行注释: `/* ... */`

### 暂不支持的特性

*   函数 (以及 `return` 语句)
*   指针、结构体等复杂类型

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

## 如何使用

### 示例 1: 基础循环

```typescript
import { compile } from './src/lang/compiler';
import { VirtualMachine } from './src/core/vm/virtual-machine';

const source = `
  int i = 0;
  int sum = 0;
  while (i < 10) {
    sum = sum + i;
    i = i + 1;
  }
  sum; // 将最终结果作为最后一个表达式
`;

const bytecode = compile(source);
const vm = new VirtualMachine(bytecode);
const finalResult = vm.runToEnd(); // { type: 'INT', value: 45 }
```

### 示例 2: 数组操作

```typescript
import { compile } from './src/lang/compiler';
import { VirtualMachine } from './src/core/vm/virtual-machine';

const source = `
  int arr[5] = {10, 20}; // arr is {10, 20, 0, 0, 0}
  arr[2] = arr[0] + arr[1]; // arr[2] becomes 30
  arr[2]++; // arr[2] becomes 31
  
  int sum = 0;
  for (int i = 0; i < 5; i++) {
    sum += arr[i];
  }
  sum; // 10 + 20 + 31 + 0 + 0 = 61
`;

const bytecode = compile(source);
const vm = new VirtualMachine(bytecode);
const finalResult = vm.runToEnd(); // { type: 'INT', value: 61 }
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

## ⚙️ 系统执行流程 (Execution Flow)

从宏观的源代码到微观的 CPU 指令执行，系统的全链路调用过程如下：

### 1. 编译阶段 (Compilation Phase)

入口: `src/lang/compiler.ts -> compile(source)`

1.  **词法分析 (Lexical Analysis)**
    *   **模块**: `Lexer` (`src/lang/lexer/lexer.ts`)
    *   **输入**: C++ 源代码字符串 (String)
    *   **输出**: 令牌流 (Token Stream)
    *   **过程**: 扫描字符流，跳过空白和注释 (`//`, `/*...*/`)，识别关键字 (`int`, `while`)、标识符、字面量和运算符，生成 `Token` 对象。

2.  **语法分析 (Parsing)**
    *   **模块**: `Parser` (`src/lang/parser/parser.ts`)
    *   **输入**: 令牌流 (Token[])
    *   **输出**: 抽象语法树 (AST)
    *   **过程**: 使用 **递归下降 (Recursive Descent)** 算法解析语句结构，配合 **Pratt Parser** 处理复杂的表达式优先级（如 `*` 高于 `+`）。最终构建出描述程序逻辑的树形结构 (e.g., `IfStmt`, `BinaryExpr`)。

3.  **代码生成 (Code Generation)**
    *   **模块**: `CodeGenerator` (`src/lang/codegen/codegen.ts`)
    *   **输入**: 抽象语法树 (AST)
    *   **输出**: 字节码指令集 (Instruction[])
    *   **过程**: 遍历 AST (Visitor 模式)，将树形逻辑展平为线性的栈机指令。
        *   管理 **符号表 (SymbolTable)** 以计算变量在栈上的索引偏移。
        *   处理控制流跳转 (`JUMP`, `JUMP_IF_FALSE`) 来实现 `if/while/for`。
        *   针对数组，生成 `ALLOC_ARR` 指令时会附带类型信息，以确保堆内存分配时能正确进行零值填充。对数组元素的访问和赋值则会生成 `LOAD_IDX` 和 `STORE_IDX` 指令。
        *   示例: `int a = 1` -> `PUSH 1` -> `STORE 0`。

### 2. 运行阶段 (Execution Phase)

入口: `src/core/vm/virtual-machine.ts -> VirtualMachine.run()`

1.  **虚拟机初始化 (VM Setup)**
    *   加载编译好的字节码 (`Instruction[]`)。
    *   初始化 **调用栈 (Call Stack)** (`src/core/memory/call-stack.ts`) 和 **堆内存 (Heap)** (`src/core/memory/heap.ts`)。

2.  **指令循环 (Fetch-Decode-Execute Loop)**
    *   虚拟机进入主循环，通过指令指针 (`IP`) 逐条读取指令。
    *   **Fetch**: 获取当前 `IP` 指向的指令 (e.g., `ADD`)。
    *   **Decode & Execute**: 根据 `OpCode` 执行对应逻辑：
        *   **栈操作**: `PUSH`, `POP`, `DUP`, `SWAP` (数据入栈/出栈，交换栈顶元素)。
        *   **算术运算**: `ADD`, `SUB`, `MUL` (弹出两个操作数，计算后压回结果)。
        *   **内存访问**: `LOAD 0` (读取局部变量), `STORE 1` (写入局部变量)。
        *   **流程控制**: `JUMP_IF_FALSE` (如果栈顶为 false 则跳转 IP)。
        *   **堆操作**: `ALLOC_ARR` (在堆上分配数组，根据类型进行默认值填充), `LOAD_IDX` (通过指针读取数组元素), `STORE_IDX` (通过指针写入数组元素)。

3.  **安全守卫 (Guardian Check)**
    *   在执行敏感操作（如数组访问、使用变量）时，`Guardian` (`src/core/vm/guardian.ts`) 会实时介入。
    *   检查数组越界、使用未初始化变量等运行时错误，提供友好的报错信息。

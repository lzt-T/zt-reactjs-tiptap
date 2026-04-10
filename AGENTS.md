# AGENTS.md（zt-reactjs-tiptap）

本文档用于约束 AI Agent 在本仓库中的默认协作方式与工程规范。

## 1. 项目定位

- 本项目是基于 **React + TypeScript + Vite** 的 TipTap 编辑器库。
- 当前代码结构为 **2.0 分层架构**：`core + react/editor + shared`。
- React 对外主组件名称为：`ReactTiptapEditor`。
- 对外发布入口：
  - 主入口：`zt-reactjs-tiptap`
  - 核心子路径：`zt-reactjs-tiptap/core`
  - 样式入口：`zt-reactjs-tiptap/style.css`

## 2. 常用命令

禁止执行以下命令

```bash
# 开发调试
pnpm dev

# 构建
pnpm build
pnpm build:lib

# 代码检查
pnpm lint
pnpm exec tsc --project tsconfig.lib.json --noEmit false

# 预览
pnpm preview
```

## 3. 技术栈与关键依赖

- Framework: React 19 + Vite 7
- Language: TypeScript 5.9（strict mode）
- Editor: TipTap 3.x（基于 ProseMirror）
- Styling: Tailwind CSS v4 + 组件级 CSS
- Package Manager: pnpm
- Module System: ES Modules

## 4. 目录结构（当前真实结构）

```txt
src/
├── core/                    # 编辑器核心能力（与 React 解耦）
│   ├── commands/
│   └── extensions/
├── react/
│   ├── editor/              # React 编辑器主域
│   │   ├── shell/
│   │   ├── menus/
│   │   ├── dialogs/
│   │   ├── table/
│   │   ├── toolbar/
│   │   ├── styles/
│   │   ├── types/
│   │   └── customization/
│   ├── hooks/               # React 层复用 Hook
│   ├── components/ui/       # 通用 UI 组件
│   └── components/Icon/
└── shared/                  # 跨层共享能力
    ├── config/
    ├── locales/
    ├── styles/
    └── utils/

examples/
└── react-demo/              # 示例与调试入口
```

## 5. 代码规范

### 5.1 TypeScript 约束

- 必须保持 strict mode 思维，不绕过类型系统。
- 禁止无必要的 `any`；类型不确定时优先 `unknown` + 类型收窄。
- 保持 `noUnusedLocals`、`noUnusedParameters`、`noFallthroughCasesInSwitch` 通过。

### 5.2 导入与命名

- 使用 ES module 导入导出。
- Hook 命名必须 `useXxx`。
- 组件名使用 PascalCase。
- 类型名使用 PascalCase。
- 优先使用 `@/` 别名，避免深层相对路径可读性下降。

### 5.3 React 约束

- 使用函数组件 + Hook。
- 复杂 props/返回值应有明确类型。
- 以可维护性优先，减少超大组件；按域拆分 UI/逻辑。

### 5.4 CSS 约束

- 保持组件样式就近管理。
- 主题相关变量使用约定作用域，避免污染全局。
- 命名保持语义化、可检索。

## 6. Modal/Portal Theme Isolation（强约束）

- 编辑器主题作用域类仅使用 `.zt-tiptap-theme`。
- 库输出中不要把编辑器主题变量放到全局 `:root`。
- 编辑器根节点必须包含 `.zt-tiptap-theme` 与 `text-foreground`。
- Dialog/Modal 的 Portal 必须挂在编辑器容器内（通过 `portalContainer`），不要挂到 `document.body`。
- 暗色模式需与 `html.dark` 状态保持同步。
- 若改动隔离策略，必须同步更新 README 的“样式系统”说明。

## 7. TipTap 能力说明（维护视角）

- Core（StarterKit）覆盖常用文本结构与历史能力。
- 扩展能力包括：图片、表格、上下标、颜色/高亮、对齐、任务列表、占位符、数学公式等。
- Notion-like 体验包括：Slash Commands、Command Menu、块级编辑交互。

## 8. Agent 工作约定

- 修改前先定位受影响域（`core` / `react/editor` / `shared`）。
- 变更应最小化且与现有分层一致，不引入反向依赖。
- 提交前至少执行：`pnpm lint`；涉及导出/类型时执行 `pnpm exec tsc --project tsconfig.lib.json --noEmit false`。
- 若改动导出接口、目录结构或行为语义，必须同步更新 README 与 CHANGELOG。

### 8.1 注释 Skill 默认使用（强约束）

- 当任务涉及 TS/JS 代码注释补全或注释规范化时，Agent 必须启用 `comment-first-tsjs` skill。
- 触发场景：新增/修改 `.ts`、`.tsx`、`.js`、`.jsx`、`.mjs`、`.cjs` 文件，且需要保障注释完整性。
- 默认执行标准：函数定义使用 `/** ... */`；变量定义与枚举成员使用 `// ...`；新增注释默认使用中文。
- 边界约束：保留已有有效注释；不无故改写现有英文注释；仅补齐缺失注释，保持最小化变更。
- 覆盖率核查（只读）：若仓库提供该脚本，可执行 `node scripts/check_comment_coverage.js . --json` 进行缺失注释检查；若未提供，按现有 lint/tsc 流程与代码审查补充校验。

## 9. 常见任务指引

### 9.1 新增编辑器能力

1. 优先评估是否应放入 `src/core`（可复用、与 React 无关）。
2. React 交互层放在 `src/react/editor` 对应域（dialogs/menus/table/toolbar/shell）。
3. 跨域常量与文案放在 `src/shared/config`、`src/shared/locales`。

### 9.2 新增类型

- React 编辑器相关类型优先放 `src/react/editor/types`。
- 跨层共享类型按需放在 `shared` 邻近域，避免循环依赖。

### 9.3 文案与国际化

- 所有用户可见文案应走 `src/shared/locales`。
- 新增字段需同步 `zh-CN` 与 `en-US`。

## 10. 禁止与注意事项

- 不要再引入旧目录语义（如 `src/components/TiptapEditor`）。
- 不要在未说明影响的情况下变更公共导出名称。
- 不要把 React 视图层逻辑下沉到 `core`。
- 不要忽略类型错误或 ESLint 错误再提交。

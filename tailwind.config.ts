import type { Config } from "tailwindcss";

// 将 Tailwind 生成的工具类限制在编辑器主题根节点内，避免影响宿主项目样式。
const tailwindConfig = {
  important: ".zt-tiptap-theme",
} satisfies Config;

export default tailwindConfig;

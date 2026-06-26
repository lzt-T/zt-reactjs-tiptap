import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import postcss from "postcss";
import postcssCascadeLayers from "@csstools/postcss-cascade-layers";

// 当前脚本所在目录。
const scriptDir = dirname(fileURLToPath(import.meta.url));

// Vite 库构建输出的样式文件路径。
const cssFilePath = resolve(scriptDir, "../dist/style.css");

/**
 * 将发布 CSS 中的 cascade layers 转成 Tailwind 3 可处理的普通 CSS。
 */
async function transformCssForTailwind3() {
  // 构建生成的 CSS 内容。
  const css = await readFile(cssFilePath, "utf8");

  // PostCSS 处理后的兼容 CSS。
  const result = await postcss([postcssCascadeLayers()]).process(css, {
    from: cssFilePath,
    to: cssFilePath,
  });

  await writeFile(cssFilePath, result.css, "utf8");
}

await transformCssForTailwind3();

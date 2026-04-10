import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import type { LanguageFn } from "highlight.js";
import plaintext from "highlight.js/lib/languages/plaintext";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import bash from "highlight.js/lib/languages/bash";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import php from "highlight.js/lib/languages/php";
import swift from "highlight.js/lib/languages/swift";
import { DEFAULT_CODE_BLOCK_LANGUAGE } from "@/shared/config/codeBlockLanguages";

const grammarMap: Record<string, LanguageFn> = {
  plaintext,
  javascript,
  typescript,
  json,
  html: xml,
  xml,
  css,
  bash,
  markdown,
  python,
  java,
  go,
  rust,
  sql,
  yaml,
  c,
  cpp,
  csharp,
  php,
  swift,
};

const aliasToLanguage: Record<string, string> = {
  text: "plaintext",
  txt: "plaintext",
  js: "javascript",
  ts: "typescript",
  yml: "yaml",
  sh: "bash",
  shell: "bash",
  md: "markdown",
  cs: "csharp",
};

export const lowlight = createLowlight();

Object.entries(grammarMap).forEach(([name, grammar]) => {
  lowlight.register(name, grammar);
});

lowlight.registerAlias(aliasToLanguage);

function canonicalizeLanguage(value: string): string {
  const lang = value.trim().toLowerCase();
  return aliasToLanguage[lang] ?? lang;
}

export function isRegisteredCodeBlockLanguage(value: string): boolean {
  return lowlight.registered(canonicalizeLanguage(value));
}

export function resolveCodeBlockLanguage(
  language: string | undefined,
  fallback = DEFAULT_CODE_BLOCK_LANGUAGE
): string {
  if (!language) return fallback;
  const normalized = canonicalizeLanguage(language);
  return lowlight.registered(normalized) ? normalized : fallback;
}

export function createCodeBlockLowlightExtension(
  defaultLanguage: string = DEFAULT_CODE_BLOCK_LANGUAGE
) {
  return CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: resolveCodeBlockLanguage(defaultLanguage),
    languageClassPrefix: "language-",
  });
}

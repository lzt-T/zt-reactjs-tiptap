export interface CodeBlockLanguageOption {
  value: string;
  label: string;
}

export const DEFAULT_CODE_BLOCK_LANGUAGE = "plaintext";

/** 常用代码语言（首版 20 种，含 plaintext 兜底）。 */
export const DEFAULT_CODE_BLOCK_LANGUAGES: CodeBlockLanguageOption[] = [
  { value: "plaintext", label: "Plain text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "json", label: "JSON" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "bash", label: "Bash" },
  { value: "markdown", label: "Markdown" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
  { value: "yaml", label: "YAML" },
  { value: "xml", label: "XML" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
];

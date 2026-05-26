export type SanitizedUrlKind = "link" | "image" | "video" | "attachment";

// 不同 URL 用途对应的允许协议集合。
const URL_PROTOCOL_ALLOWLIST: Record<SanitizedUrlKind, Set<string>> = {
  link: new Set(["http:", "https:", "mailto:", "tel:"]),
  image: new Set(["http:", "https:", "data:", "blob:"]),
  video: new Set(["http:", "https:", "data:", "blob:"]),
  attachment: new Set(["http:", "https:"]),
};

// 用于解析相对地址的基准地址。
const URL_BASE = "https://sanitizer.invalid";
// 统一的基准 URL 实例，避免重复创建对象。
const PARSED_URL_BASE = new URL(URL_BASE);

/** 判断值是否属于相对地址或站内锚点。 */
function isRelativeUrl(value: string): boolean {
  return /^(?:\/|\.\/|\.\.\/|#|\?)/.test(value);
}

/** 判断媒体 data URL 是否匹配当前用途。 */
function isAllowedMediaDataUrl(
  normalizedValue: string,
  kind: SanitizedUrlKind,
): boolean {
  const lowerCasedValue = normalizedValue.toLowerCase();
  if (kind === "image") {
    return lowerCasedValue.startsWith("data:image/");
  }
  if (kind === "video") {
    return lowerCasedValue.startsWith("data:video/");
  }
  return false;
}

/** 按用途校验并返回可安全使用的 URL；不合法时返回 null。 */
export function sanitizeUrlByKind(
  value: string,
  kind: SanitizedUrlKind,
): string | null {
  // 当前待校验的 URL 字符串。
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;
  if (isRelativeUrl(normalizedValue)) return normalizedValue;

  try {
    // 使用固定基准统一解析绝对地址与协议相对地址。
    const resolvedUrl = new URL(normalizedValue, PARSED_URL_BASE);
    if (
      resolvedUrl.origin === PARSED_URL_BASE.origin &&
      !normalizedValue.startsWith("//")
    ) {
      return normalizedValue;
    }

    if (resolvedUrl.protocol === "data:") {
      return isAllowedMediaDataUrl(normalizedValue, kind)
        ? normalizedValue
        : null;
    }

    return URL_PROTOCOL_ALLOWLIST[kind].has(resolvedUrl.protocol)
      ? normalizedValue
      : null;
  } catch {
    return null;
  }
}

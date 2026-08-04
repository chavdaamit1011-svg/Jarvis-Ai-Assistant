const URL_PATTERN = /https?:\/\/[^\s<>()]+/gi;
const EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi;
const PHONE_PATTERN = /\+?\d[\d\s-]{7,}\d/g;

/** Extracts literal values only; it never invents a value. */
export function extractExactValues(content: string) {
  return {
    urls: [...new Set(content.match(URL_PATTERN) ?? [])],
    emails: [...new Set(content.match(EMAIL_PATTERN) ?? [])],
    phones: [...new Set(content.match(PHONE_PATTERN) ?? [])],
    names: [...new Set([...content.matchAll(/^\s*name\s*:\s*(.+)$/gim)].map((match) => match[1].trim()))],
    roles: [...new Set([...content.matchAll(/^\s*role\s*:\s*(.+)$/gim)].map((match) => match[1].trim()))],
  };
}

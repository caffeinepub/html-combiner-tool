export function validateHTML(html: string): string[] {
  const issues: string[] = [];

  if (!/<!DOCTYPE\s+html/i.test(html)) {
    issues.push("Missing <!DOCTYPE html>");
  }
  if (!/<html[\s>]/i.test(html)) {
    issues.push("Missing <html> tag");
  }
  if (!/<head[\s>]/i.test(html)) {
    issues.push("Missing <head> tag");
  }
  if (!/<body[\s>]/i.test(html)) {
    issues.push("Missing <body> tag");
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      const msg =
        parserError.textContent?.trim().slice(0, 120) ?? "Unknown parser error";
      issues.push(`Parser error: ${msg}`);
    }
  } catch (_e) {
    // DOMParser not available
  }

  return issues;
}

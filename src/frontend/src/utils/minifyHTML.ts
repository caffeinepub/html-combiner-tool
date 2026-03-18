export function minifyHTML(html: string): string {
  // Strip HTML comments (preserve IE conditionals)
  let result = html.replace(/<!--(?!\[if)[\s\S]*?-->/g, "");

  // Minify inline <style> blocks
  result = result.replace(
    /<style([^>]*)>([\s\S]*?)<\/style>/gi,
    (_match, attrs: string, css: string) => {
      const minCss = css
        .replace(/\/\*[\s\S]*?\*\//g, "") // remove CSS comments
        .replace(/\s+/g, " ") // collapse whitespace
        .replace(/\s*([{}:;,>+~!])\s*/g, "$1") // remove spaces around punctuation
        .replace(/;}/g, "}") // remove trailing semicolon
        .trim();
      return `<style${attrs}>${minCss}</style>`;
    },
  );

  // Minify inline <script> blocks (not src scripts)
  result = result.replace(
    /<script([^>]*)>([\s\S]*?)<\/script>/gi,
    (_match, attrs: string, js: string) => {
      if (/src=/i.test(attrs)) return _match;
      const minJs = js
        .replace(/\/\/[^\n]*/g, "") // remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, "") // remove multi-line comments
        .replace(/\s+/g, " ") // collapse whitespace
        .trim();
      return `<script${attrs}>${minJs}</script>`;
    },
  );

  // Collapse whitespace between tags
  result = result.replace(/>\s+</g, "><");

  return result.trim();
}

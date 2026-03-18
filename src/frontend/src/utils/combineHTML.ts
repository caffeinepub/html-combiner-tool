export type SourceFile = { name: string; content: string };

function ensureDoctype(html: string): string {
  if (!/^\s*<!DOCTYPE\s+html/i.test(html)) {
    return `<!DOCTYPE html>\n${html}`;
  }
  return html;
}

function extractBodyContent(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body ? doc.body.innerHTML.trim() : html.trim();
}

export function combineHTML(
  htmlFiles: SourceFile[],
  cssFiles: SourceFile[],
  jsFiles: SourceFile[],
): string {
  // Build combined CSS
  const combinedCss = cssFiles
    .map((f) => `/* === source: ${f.name} === */\n${f.content.trim()}`)
    .join("\n\n");

  // Build combined JS
  const combinedJs = jsFiles
    .map((f) => `// === source: ${f.name} ===\n${f.content.trim()}`)
    .join("\n\n");

  // No HTML files — scaffold minimal document
  if (htmlFiles.length === 0) {
    const styleBlock = combinedCss
      ? `\n    <style>\n${combinedCss}\n    </style>`
      : "";
    const scriptBlock = combinedJs
      ? `\n    <script>\n${combinedJs}\n    <\/script>`
      : "";
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>${styleBlock}
  </head>
  <body>${scriptBlock}
  </body>
</html>`;
  }

  // Use first file as parent shell
  let result = htmlFiles[0].content.trim();

  // Append secondary HTML files as sections
  const secondarySections = htmlFiles
    .slice(1)
    .map((f) => {
      const bodyContent = extractBodyContent(f.content);
      return `<section data-source="${f.name}">\n${bodyContent}\n</section>`;
    })
    .join("\n");

  // Inject secondary sections before </body> (we'll do it together with JS injection)
  const sectionsAndScript = [
    secondarySections,
    combinedJs ? `<script>\n${combinedJs}\n<\/script>` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Ensure DOCTYPE
  result = ensureDoctype(result);

  // Inject CSS into <head>
  if (combinedCss) {
    const styleTag = `<style>\n${combinedCss}\n</style>`;
    if (/<\/head>/i.test(result)) {
      result = result.replace(/<\/head>/i, `${styleTag}\n</head>`);
    } else if (/<head[^>]*>/i.test(result)) {
      result = result.replace(/(<head[^>]*>)/i, `$1\n${styleTag}`);
    } else if (/<html[^>]*>/i.test(result)) {
      result = result.replace(
        /(<html[^>]*>)/i,
        `$1\n<head>\n${styleTag}\n</head>`,
      );
    } else {
      result = `<head>\n${styleTag}\n</head>\n${result}`;
    }
  }

  // Inject sections + JS before </body>
  if (sectionsAndScript) {
    if (/<\/body>/i.test(result)) {
      result = result.replace(/<\/body>/i, `${sectionsAndScript}\n</body>`);
    } else {
      result = `${result}\n${sectionsAndScript}`;
    }
  }

  return result;
}

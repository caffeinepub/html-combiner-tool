export type SourceFile = { name: string; content: string };

function ensureDoctype(html: string): string {
  if (!/^\s*<!DOCTYPE\s+html/i.test(html)) {
    return `<!DOCTYPE html>\n${html}`;
  }
  return html;
}

interface ParsedPage {
  name: string;
  title: string;
  headExtra: string; // <meta>, <link>, etc. (no style/script)
  bodyContent: string;
}

// ── Parse cache ────────────────────────────────────────────────────────────
// Keyed by "name\x00content" to skip re-parsing unchanged HTML files.
const parseCache = new Map<string, ParsedPage>();

function parsePage(name: string, html: string): ParsedPage {
  const cacheKey = `${name}\x00${html}`;
  const cached = parseCache.get(cacheKey);
  if (cached) return cached;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const title =
    doc.querySelector("title")?.textContent?.trim() ||
    name.replace(/\.html?$/i, "");

  // Collect head extras (meta, link) but not title/style/script
  const headExtra = Array.from(doc.head.children)
    .filter(
      (el) => !["TITLE", "STYLE", "SCRIPT"].includes(el.tagName.toUpperCase()),
    )
    .map((el) => el.outerHTML)
    .join("\n    ");

  const bodyContent = doc.body ? doc.body.innerHTML.trim() : "";

  const page: ParsedPage = { name, title, headExtra, bodyContent };
  parseCache.set(cacheKey, page);

  // Keep cache bounded to avoid memory bloat on very large sessions
  if (parseCache.size > 200) {
    const firstKey = parseCache.keys().next().value;
    if (firstKey !== undefined) parseCache.delete(firstKey);
  }

  return page;
}

function slugify(name: string): string {
  return name
    .replace(/\.html?$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();
}

export function combineHTML(
  htmlFiles: SourceFile[],
  cssFiles: SourceFile[],
  jsFiles: SourceFile[],
): string {
  // ── CSS ────────────────────────────────────────────────────────────────
  const combinedCss = cssFiles
    .map((f) => `/* === ${f.name} === */\n${f.content.trim()}`)
    .join("\n\n");

  // ── JS ─────────────────────────────────────────────────────────────────
  const combinedJs = jsFiles
    .map((f) => `// === ${f.name} ===\n${f.content.trim()}`)
    .join("\n\n");

  // ── No HTML: minimal scaffold ──────────────────────────────────────────
  if (htmlFiles.length === 0) {
    const styleBlock = combinedCss
      ? `\n    <style>\n${indent(combinedCss, 6)}\n    </style>`
      : "";
    const scriptBlock = combinedJs
      ? `\n    <script>\n${indent(combinedJs, 6)}\n    <\/script>`
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

  // ── Single HTML file: classic inline merge ─────────────────────────────
  if (htmlFiles.length === 1) {
    let result = ensureDoctype(htmlFiles[0].content.trim());

    if (combinedCss) {
      const styleTag = `<style>\n${combinedCss}\n</style>`;
      if (/<\/head>/i.test(result))
        result = result.replace(/<\/head>/i, `${styleTag}\n</head>`);
      else result += `\n${styleTag}`;
    }

    if (combinedJs) {
      const scriptTag = `<script>\n${combinedJs}\n<\/script>`;
      if (/<\/body>/i.test(result))
        result = result.replace(/<\/body>/i, `${scriptTag}\n</body>`);
      else result += `\n${scriptTag}`;
    }

    return result;
  }

  // ── Multiple HTML files: SPA page router ──────────────────────────────
  const pages: ParsedPage[] = htmlFiles.map((f) =>
    parsePage(f.name, f.content),
  );
  const pageIds = pages.map((p) => slugify(p.name));

  // Collect unique head extras across all pages
  const allHeadExtra = [
    ...new Set(
      pages.flatMap((p) => p.headExtra.split("\n").map((l) => l.trim())),
    ),
  ]
    .filter(Boolean)
    .join("\n    ");

  // Build nav links
  const navLinks = pages
    .map(
      (p, i) =>
        `<a href="#" data-page="${pageIds[i]}" class="__nav-link${i === 0 ? " __active" : ""}">` +
        `${p.title}</a>`,
    )
    .join("\n        ");

  // Build page divs
  const pageDivs = pages
    .map(
      (p, i) =>
        `<div id="__page-${pageIds[i]}" class="__page" ${i !== 0 ? 'style="display:none"' : ""} data-title="${p.title}">\n${indent(p.bodyContent, 8)}\n      </div>`,
    )
    .join("\n      ");

  // Built-in router CSS + nav CSS
  const routerCss = `
    /* ── HTML Combiner: SPA Router ── */
    :root { --nav-bg: #1e1e2e; --nav-link: #cdd6f4; --nav-active: #89b4fa; --nav-border: #313244; }
    .__nav {
      display: flex; flex-wrap: wrap; gap: 4px;
      padding: 10px 16px;
      background: var(--nav-bg);
      border-bottom: 1px solid var(--nav-border);
      position: sticky; top: 0; z-index: 9999;
    }
    .__nav-link {
      padding: 5px 14px; border-radius: 6px;
      font: 600 13px/1 system-ui, sans-serif;
      color: var(--nav-link); text-decoration: none;
      background: transparent; border: 1px solid transparent;
      cursor: pointer; transition: background 0.15s, color 0.15s;
    }
    .__nav-link:hover { background: rgba(137,180,250,.12); }
    .__nav-link.__active {
      background: rgba(137,180,250,.18);
      border-color: var(--nav-active);
      color: var(--nav-active);
    }`.trimStart();

  // Built-in router JS
  const routerJs = `
    /* ── HTML Combiner: SPA Router ── */
    (function () {
      var pages = document.querySelectorAll('.__page');
      var links = document.querySelectorAll('.__nav-link');
      function show(id) {
        pages.forEach(function (p) {
          p.style.display = p.id === '__page-' + id ? '' : 'none';
        });
        links.forEach(function (a) {
          a.classList.toggle('__active', a.dataset.page === id);
        });
        document.title = (document.querySelector('#__page-' + id) || {}).dataset.title || document.title;
        history.replaceState(null, '', '#' + id);
      }
      links.forEach(function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          show(a.dataset.page);
        });
      });
      // Deep-link on load
      var hash = location.hash.replace('#', '');
      var ids = Array.from(pages).map(function (p) { return p.id.replace('__page-', ''); });
      if (hash && ids.includes(hash)) show(hash);
    })();`.trimStart();

  const userCssBlock = combinedCss
    ? `\n    /* ── User CSS ── */\n    ${combinedCss.split("\n").join("\n    ")}`
    : "";

  const userJsBlock = combinedJs
    ? `\n    /* ── User JS ── */\n    ${combinedJs.split("\n").join("\n    ")}`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${pages[0].title}</title>
    ${allHeadExtra}
    <style>
    ${routerCss}${userCssBlock}
    </style>
  </head>
  <body>
    <nav class="__nav">
        ${navLinks}
    </nav>
    <div id="__pages">
      ${pageDivs}
    </div>
    <script>
    ${routerJs}${userJsBlock}
    <\/script>
  </body>
</html>`;
}

function indent(str: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return str
    .split("\n")
    .map((l) => (l.trim() ? pad + l : l))
    .join("\n");
}

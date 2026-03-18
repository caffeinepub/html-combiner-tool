(function() {
  "use strict";
  function ensureDoctype(html) {
    if (!/^\s*<!DOCTYPE\s+html/i.test(html)) {
      return `<!DOCTYPE html>
${html}`;
    }
    return html;
  }
  const parseCache = /* @__PURE__ */ new Map();
  function parsePage(name, html) {
    var _a, _b;
    const cacheKey = `${name}\0${html}`;
    const cached = parseCache.get(cacheKey);
    if (cached) return cached;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const title = ((_b = (_a = doc.querySelector("title")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim()) || name.replace(/\.html?$/i, "");
    const headExtra = Array.from(doc.head.children).filter(
      (el) => !["TITLE", "STYLE", "SCRIPT"].includes(el.tagName.toUpperCase())
    ).map((el) => el.outerHTML).join("\n    ");
    const bodyContent = doc.body ? doc.body.innerHTML.trim() : "";
    const page = { name, title, headExtra, bodyContent };
    parseCache.set(cacheKey, page);
    if (parseCache.size > 200) {
      const firstKey = parseCache.keys().next().value;
      if (firstKey !== void 0) parseCache.delete(firstKey);
    }
    return page;
  }
  function slugify(name) {
    return name.replace(/\.html?$/i, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  }
  function combineHTML(htmlFiles, cssFiles, jsFiles) {
    const combinedCss = cssFiles.map((f) => `/* === ${f.name} === */
${f.content.trim()}`).join("\n\n");
    const combinedJs = jsFiles.map((f) => `// === ${f.name} ===
${f.content.trim()}`).join("\n\n");
    if (htmlFiles.length === 0) {
      const styleBlock = combinedCss ? `
    <style>
${indent(combinedCss, 6)}
    </style>` : "";
      const scriptBlock = combinedJs ? `
    <script>
${indent(combinedJs, 6)}
    <\/script>` : "";
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
    if (htmlFiles.length === 1) {
      let result = ensureDoctype(htmlFiles[0].content.trim());
      if (combinedCss) {
        const styleTag = `<style>
${combinedCss}
</style>`;
        if (/<\/head>/i.test(result))
          result = result.replace(/<\/head>/i, `${styleTag}
</head>`);
        else result += `
${styleTag}`;
      }
      if (combinedJs) {
        const scriptTag = `<script>
${combinedJs}
<\/script>`;
        if (/<\/body>/i.test(result))
          result = result.replace(/<\/body>/i, `${scriptTag}
</body>`);
        else result += `
${scriptTag}`;
      }
      return result;
    }
    const pages = htmlFiles.map(
      (f) => parsePage(f.name, f.content)
    );
    const pageIds = pages.map((p) => slugify(p.name));
    const allHeadExtra = [
      ...new Set(
        pages.flatMap((p) => p.headExtra.split("\n").map((l) => l.trim()))
      )
    ].filter(Boolean).join("\n    ");
    const navLinks = pages.map(
      (p, i) => `<a href="#" data-page="${pageIds[i]}" class="__nav-link${i === 0 ? " __active" : ""}">${p.title}</a>`
    ).join("\n        ");
    const pageDivs = pages.map(
      (p, i) => `<div id="__page-${pageIds[i]}" class="__page" ${i !== 0 ? 'style="display:none"' : ""} data-title="${p.title}">
${indent(p.bodyContent, 8)}
      </div>`
    ).join("\n      ");
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
    const userCssBlock = combinedCss ? `
    /* ── User CSS ── */
    ${combinedCss.split("\n").join("\n    ")}` : "";
    const userJsBlock = combinedJs ? `
    /* ── User JS ── */
    ${combinedJs.split("\n").join("\n    ")}` : "";
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
  function indent(str, spaces) {
    const pad = " ".repeat(spaces);
    return str.split("\n").map((l) => l.trim() ? pad + l : l).join("\n");
  }
  self.onmessage = (e) => {
    const { requestId, htmlFiles, cssFiles, jsFiles } = e.data;
    const result = combineHTML(htmlFiles, cssFiles, jsFiles);
    self.postMessage({
      requestId,
      result
    });
  };
})();

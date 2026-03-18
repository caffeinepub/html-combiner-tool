export type FileLanguage = "html" | "css" | "js";

export type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  language?: FileLanguage;
  content?: string;
  parentId: string | null;
  order: number;
};

export function getFileIcon(language?: FileLanguage): string {
  switch (language) {
    case "html":
      return "html";
    case "css":
      return "css";
    case "js":
      return "js";
    default:
      return "file";
  }
}

export function getDefaultContent(
  language: FileLanguage,
  name: string,
): string {
  switch (language) {
    case "html":
      return `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${name.replace(/\.html?$/i, "")}</title>\n  </head>\n  <body>\n    <h1>${name.replace(/\.html?$/i, "")}</h1>\n    <p>Edit this page's content here.</p>\n  </body>\n</html>`;
    case "css":
      return `/* ${name} */\n`;
    case "js":
      return `// ${name}\ndocument.addEventListener('DOMContentLoaded', () => {\n  console.log('${name} loaded!');\n});\n`;
  }
}

export const DEFAULT_FILES: FileNode[] = [
  {
    id: "folder-src",
    name: "src",
    type: "folder",
    parentId: null,
    order: 0,
  },
  // HTML pages
  {
    id: "file-index-html",
    name: "index.html",
    type: "file",
    language: "html",
    content: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Home</title>\n  </head>\n  <body>\n    <h1>Home Page</h1>\n    <p>Welcome! Use the nav above to switch pages.</p>\n    <p>Add more .html files to create more pages.</p>\n  </body>\n</html>`,
    parentId: "folder-src",
    order: 0,
  },
  {
    id: "file-about-html",
    name: "about.html",
    type: "file",
    language: "html",
    content: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title>About</title>\n  </head>\n  <body>\n    <h1>About Page</h1>\n    <p>This page was merged from about.html.</p>\n    <button id="greet-btn">Say Hello</button>\n    <p id="greet-msg"></p>\n  </body>\n</html>`,
    parentId: "folder-src",
    order: 1,
  },
  // CSS files
  {
    id: "file-base-css",
    name: "base.css",
    type: "file",
    language: "css",
    content: `/* base.css — global styles */\nbody {\n  margin: 0;\n  font-family: 'Segoe UI', sans-serif;\n  background: #0f172a;\n  color: #e2e8f0;\n  padding: 24px;\n}\n\nh1 {\n  color: #38bdf8;\n  font-size: 2rem;\n  margin-bottom: 8px;\n}\n\np { color: #94a3b8; }\n`,
    parentId: "folder-src",
    order: 2,
  },
  {
    id: "file-buttons-css",
    name: "buttons.css",
    type: "file",
    language: "css",
    content:
      "/* buttons.css — button component styles */\nbutton {\n  background: #38bdf8;\n  color: #0f172a;\n  border: none;\n  border-radius: 6px;\n  padding: 8px 20px;\n  font-weight: 600;\n  cursor: pointer;\n  font-size: 14px;\n  transition: background 0.2s;\n}\n\nbutton:hover { background: #7dd3fc; }\n",
    parentId: "folder-src",
    order: 3,
  },
  // JS files
  {
    id: "file-app-js",
    name: "app.js",
    type: "file",
    language: "js",
    content: `// app.js — main logic\ndocument.addEventListener('DOMContentLoaded', () => {\n  console.log('app.js loaded');\n});\n`,
    parentId: "folder-src",
    order: 4,
  },
  {
    id: "file-utils-js",
    name: "utils.js",
    type: "file",
    language: "js",
    content: `// utils.js — shared utilities\ndocument.addEventListener('DOMContentLoaded', () => {\n  const btn = document.getElementById('greet-btn');\n  const msg = document.getElementById('greet-msg');\n  if (btn && msg) {\n    btn.addEventListener('click', () => {\n      msg.textContent = 'Hello from utils.js!';\n      msg.style.color = '#f472b6';\n    });\n  }\n});\n`,
    parentId: "folder-src",
    order: 5,
  },
];

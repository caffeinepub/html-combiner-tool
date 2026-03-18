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
      return `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${name.replace(".html", "")}</title>\n  </head>\n  <body>\n    <h1>Hello, World!</h1>\n  </body>\n</html>`;
    case "css":
      return `/* ${name} */\nbody {\n  margin: 0;\n  font-family: sans-serif;\n  background: #1a1a2e;\n  color: #eee;\n}\n`;
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
  {
    id: "file-index-html",
    name: "index.html",
    type: "file",
    language: "html",
    content: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>My Project</title>\n  </head>\n  <body>\n    <h1>Hello, World!</h1>\n    <p>Edit me in the explorer!</p>\n  </body>\n</html>`,
    parentId: "folder-src",
    order: 0,
  },
  {
    id: "file-styles-css",
    name: "styles.css",
    type: "file",
    language: "css",
    content: `/* styles.css */\nbody {\n  margin: 0;\n  font-family: 'Segoe UI', sans-serif;\n  background: #0f172a;\n  color: #e2e8f0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n}\n\nh1 {\n  color: #38bdf8;\n  font-size: 2.5rem;\n}\n\np {\n  color: #94a3b8;\n}\n`,
    parentId: "folder-src",
    order: 1,
  },
  {
    id: "file-app-js",
    name: "app.js",
    type: "file",
    language: "js",
    content: `// app.js\ndocument.addEventListener('DOMContentLoaded', () => {\n  console.log('App loaded!');\n  const h1 = document.querySelector('h1');\n  if (h1) {\n    h1.addEventListener('click', () => {\n      h1.style.color = '#f472b6';\n    });\n  }\n});\n`,
    parentId: "folder-src",
    order: 2,
  },
];

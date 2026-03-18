import type { FileLanguage, FileNode } from "@/types/fileTree";
import JSZip from "jszip";

function generateId(prefix = "node"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Build full path for a node by traversing parentId chain */
function buildPath(nodeId: string, allFiles: FileNode[]): string {
  const parts: string[] = [];
  let current: FileNode | undefined = allFiles.find((f) => f.id === nodeId);
  while (current) {
    parts.unshift(current.name);
    if (!current.parentId) break;
    current = allFiles.find((f) => f.id === current!.parentId);
  }
  return parts.join("/");
}

export async function exportProjectZip(
  files: FileNode[],
  projectName: string,
): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder(projectName.replace(/\s+/g, "-").toLowerCase())!;

  for (const node of files) {
    if (node.type !== "file") continue;
    const path = buildPath(node.id, files);
    root.file(path, node.content ?? "");
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName.replace(/\s+/g, "-").toLowerCase()}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProjectZip(
  file: File,
): Promise<{ nodes: FileNode[]; openIds: string[]; activeId: string | null }> {
  const zip = await JSZip.loadAsync(file);
  const nodes: FileNode[] = [];
  const openIds: string[] = [];
  let activeId: string | null = null;

  // Map from directory path -> folderId
  const folderMap = new Map<string, string>();

  const getOrCreateFolder = (dirPath: string): string => {
    if (folderMap.has(dirPath)) return folderMap.get(dirPath)!;
    const parts = dirPath.split("/");
    let currentPath = "";
    let parentId: string | null = null;
    for (let i = 0; i < parts.length; i++) {
      currentPath = parts.slice(0, i + 1).join("/");
      if (folderMap.has(currentPath)) {
        parentId = folderMap.get(currentPath)!;
      } else {
        const id = generateId("folder");
        folderMap.set(currentPath, id);
        const siblings = nodes.filter(
          (n) => n.parentId === parentId && n.type === "folder",
        );
        nodes.push({
          id,
          name: parts[i],
          type: "folder",
          parentId,
          order: siblings.length,
        });
        parentId = id;
      }
    }
    return parentId!;
  };

  // Collect and sort entries for deterministic order
  const entries: [string, JSZip.JSZipObject][] = [];
  zip.forEach((relativePath, zipEntry) => {
    entries.push([relativePath, zipEntry]);
  });
  entries.sort(([a], [b]) => a.localeCompare(b));

  const filePromises: Promise<void>[] = [];
  for (const [relativePath, zipEntry] of entries) {
    if (zipEntry.dir) continue;
    const ext = relativePath.split(".").pop()?.toLowerCase();
    if (!ext || !["html", "css", "js"].includes(ext)) continue;

    const language: FileLanguage =
      ext === "css" ? "css" : ext === "js" ? "js" : "html";

    const parts = relativePath.split("/");
    const fileName = parts[parts.length - 1];
    const dirParts = parts.slice(0, -1);

    const p = zipEntry.async("text").then((content) => {
      let parentId: string | null = null;
      if (dirParts.length > 0) {
        parentId = getOrCreateFolder(dirParts.join("/"));
      }
      const siblings = nodes.filter(
        (n) => n.parentId === parentId && n.type === "file",
      );
      const id = generateId("file");
      nodes.push({
        id,
        name: fileName,
        type: "file",
        language,
        content,
        parentId,
        order: siblings.length,
      });
      openIds.push(id);
      if (!activeId) activeId = id;
    });
    filePromises.push(p);
  }

  await Promise.all(filePromises);
  return { nodes, openIds, activeId };
}

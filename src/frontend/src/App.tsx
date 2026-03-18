import { EditorArea } from "@/components/EditorArea";
import { FileExplorer } from "@/components/FileExplorer";
import { OutputPanel } from "@/components/OutputPanel";
import { Toaster } from "@/components/ui/sonner";
import {
  DEFAULT_FILES,
  type FileLanguage,
  type FileNode,
  getDefaultContent,
} from "@/types/fileTree";
import { type SourceFile, combineHTML } from "@/utils/combineHTML";
import { Combine, Download, Play } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

function generateId(prefix = "node"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function App() {
  const [files, setFiles] = useState<FileNode[]>(DEFAULT_FILES);
  const [openTabs, setOpenTabs] = useState<string[]>(["file-index-html"]);
  const [activeTabId, setActiveTabId] = useState<string | null>(
    "file-index-html",
  );
  const [output, setOutput] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [projectName, setProjectName] = useState("My Project");
  const [isEditingName, setIsEditingName] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Ready");
  const projectNameRef = useRef<HTMLInputElement>(null);

  const handleFileClick = useCallback((id: string) => {
    setOpenTabs((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveTabId(id);
  }, []);

  const handleTabClick = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const handleTabClose = useCallback(
    (id: string) => {
      setOpenTabs((prev) => prev.filter((t) => t !== id));
      setActiveTabId((prev) => {
        if (prev !== id) return prev;
        const remaining = openTabs.filter((t) => t !== id);
        return remaining.length > 0 ? remaining[remaining.length - 1] : null;
      });
    },
    [openTabs],
  );

  const handleContentChange = useCallback((id: string, content: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, content } : f)));
  }, []);

  const handleDeleteNode = useCallback(
    (id: string) => {
      const toDelete = new Set<string>();
      const queue = [id];
      const allFiles = files;
      while (queue.length) {
        const cur = queue.shift()!;
        toDelete.add(cur);
        for (const f of allFiles.filter((f) => f.parentId === cur)) {
          queue.push(f.id);
        }
      }
      setFiles((prev) => prev.filter((f) => !toDelete.has(f.id)));
      setOpenTabs((prev) => prev.filter((t) => !toDelete.has(t)));
      setActiveTabId((prev) => (prev && toDelete.has(prev) ? null : prev));
      setStatusMsg("Deleted");
    },
    [files],
  );

  const handleRenameNode = useCallback((id: string, newName: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName } : f)),
    );
    setStatusMsg(`Renamed to ${newName}`);
  }, []);

  const handleAddFile = useCallback(
    (parentId: string, language: FileLanguage) => {
      const ext =
        language === "js" ? ".js" : language === "css" ? ".css" : ".html";
      const siblings = files.filter((f) => f.parentId === parentId);
      const name = `new-file-${siblings.length + 1}${ext}`;
      const id = generateId("file");
      const newFile: FileNode = {
        id,
        name,
        type: "file",
        language,
        content: getDefaultContent(language, name),
        parentId,
        order: siblings.length,
      };
      setFiles((prev) => [...prev, newFile]);
      setOpenTabs((prev) => [...prev, id]);
      setActiveTabId(id);
      setStatusMsg(`Created ${name}`);
    },
    [files],
  );

  const handleAddFolder = useCallback(
    (parentId: string | null) => {
      const siblings = files.filter(
        (f) => f.parentId === parentId && f.type === "folder",
      );
      const name = `folder-${siblings.length + 1}`;
      const id = generateId("folder");
      const newFolder: FileNode = {
        id,
        name,
        type: "folder",
        parentId,
        order: files.filter((f) => f.parentId === parentId).length,
      };
      setFiles((prev) => [...prev, newFolder]);
      setStatusMsg(`Created folder: ${name}`);
    },
    [files],
  );

  const handleCombine = useCallback(() => {
    const allFileNodes = files.filter((f) => f.type === "file");
    const htmlFiles: SourceFile[] = allFileNodes
      .filter((f) => f.language === "html")
      .map((f) => ({ name: f.name, content: f.content ?? "" }));
    const cssFiles: SourceFile[] = allFileNodes
      .filter((f) => f.language === "css")
      .map((f) => ({ name: f.name, content: f.content ?? "" }));
    const jsFiles: SourceFile[] = allFileNodes
      .filter((f) => f.language === "js")
      .map((f) => ({ name: f.name, content: f.content ?? "" }));
    const result = combineHTML(htmlFiles, cssFiles, jsFiles);
    setOutput(result);
    setHasGenerated(true);
    const lineCount = result.split("\n").length;
    setStatusMsg(`Combined \u2014 ${lineCount} lines`);
    toast.success("Combined successfully!", {
      description: `${lineCount} lines from ${allFileNodes.length} files`,
    });
  }, [files]);

  const handleDownload = useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("File downloaded!");
  }, [output, projectName]);

  const fileCount = files.filter((f) => f.type === "file").length;
  const activeFile = files.find((f) => f.id === activeTabId);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <Toaster theme="dark" position="bottom-right" />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      {/* Uses ide-header (0.115) — sits between sidebar (0.145) and tabbar (0.10) */}
      {/* Top accent stripe marks the app boundary cleanly */}
      <header
        className="ide-header border-b border-border flex items-center h-12 px-4 shrink-0 gap-3 z-20"
        style={{ borderTop: "2px solid oklch(0.76 0.14 190 / 0.45)" }}
      >
        {/* Logo mark + wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Gradient logo mark — distinctive, not a generic icon-in-a-box */}
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.76 0.14 190), oklch(0.60 0.18 230))",
              boxShadow: "0 0 10px oklch(0.76 0.14 190 / 0.30)",
            }}
          >
            <Combine className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-[14px] font-bold leading-none text-foreground tracking-tight">
              HTML Combiner
            </p>
            <p className="text-[9px] text-muted-foreground/50 leading-none mt-0.5 code-font uppercase tracking-widest">
              IDE
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border/70 shrink-0" />

        {/* Editable project name */}
        {isEditingName ? (
          <input
            ref={projectNameRef}
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape")
                setIsEditingName(false);
            }}
            className="bg-input border border-ring/50 rounded px-2 py-0.5 text-sm code-font text-foreground outline-none w-44 ring-1 ring-ring/30"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingName(true)}
            className="text-sm code-font text-muted-foreground/80 hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-accent/80 group flex items-center gap-1.5"
            title="Click to rename project"
          >
            {projectName}
            <span className="text-[9px] text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors">
              ✎
            </span>
          </button>
        )}

        <div className="flex-1" />

        {/* Download — ghost style, only when output exists */}
        {hasGenerated && (
          <button
            type="button"
            data-ocid="download.primary_button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 h-8 rounded text-xs font-medium border border-border/80 text-muted-foreground hover:text-foreground hover:border-border transition-all duration-150 code-font"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        )}

        {/* Primary CTA — full glow treatment */}
        <button
          type="button"
          data-ocid="combine.primary_button"
          onClick={handleCombine}
          className="btn-glow flex items-center gap-2 px-4 h-8 rounded text-xs font-semibold bg-primary text-primary-foreground transition-all duration-150 code-font"
        >
          <Play className="w-3.5 h-3.5" />
          Combine &amp; Preview
        </button>
      </header>

      {/* ── Main panels ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — lightest panel (0.145) */}
        <div className="w-[220px] shrink-0 overflow-hidden">
          <FileExplorer
            files={files}
            activeFileId={activeTabId}
            openTabIds={openTabs}
            onFileClick={handleFileClick}
            onDeleteNode={handleDeleteNode}
            onRenameNode={handleRenameNode}
            onAddFile={handleAddFile}
            onAddFolder={handleAddFolder}
          />
        </div>

        {/* Editor — darkest panel (0.07), slight inset shadow on left edge */}
        <div className="flex-1 overflow-hidden ide-panel panel-inset">
          <EditorArea
            files={files}
            openTabs={openTabs}
            activeTabId={activeTabId}
            onTabClick={handleTabClick}
            onTabClose={handleTabClose}
            onContentChange={handleContentChange}
          />
        </div>

        {/* Output — same depth as sidebar (0.145) */}
        <div className="w-[380px] shrink-0 overflow-hidden">
          <OutputPanel output={output} hasGenerated={hasGenerated} />
        </div>
      </div>

      {/* ── Status Bar ────────────────────────────────────────────────────── */}
      <footer className="ide-statusbar border-t border-border/80 h-[22px] flex items-center px-3 gap-3 shrink-0">
        {/* Language pill — colored, anchored left */}
        {activeFile?.language && (
          <span
            className={`text-[9px] font-bold uppercase px-1.5 py-px rounded code-font ${
              activeFile.language === "html"
                ? "bg-html/10 text-html"
                : activeFile.language === "css"
                  ? "bg-css/10 text-css"
                  : "bg-js/10 text-js"
            }`}
          >
            {activeFile.language.toUpperCase()}
          </span>
        )}
        {activeFile && (
          <span className="text-[10px] text-muted-foreground/60 code-font truncate max-w-[160px]">
            {activeFile.name}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground/35 code-font">
          {fileCount} file{fileCount !== 1 ? "s" : ""}
        </span>

        <div className="flex-1" />

        <span className="text-[10px] text-muted-foreground/45 code-font">
          {statusMsg}
        </span>

        <div className="w-px h-3 bg-border/50" />

        <span className="text-[10px] text-muted-foreground/30 code-font">
          © {new Date().getFullYear()}{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary/60 transition-colors"
          >
            caffeine.ai
          </a>
        </span>
      </footer>
    </div>
  );
}

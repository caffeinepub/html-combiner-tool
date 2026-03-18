import { EditorArea } from "@/components/EditorArea";
import { FileExplorer } from "@/components/FileExplorer";
import type { ConsoleLog } from "@/components/OutputPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { Toaster } from "@/components/ui/sonner";
import {
  DEFAULT_FILES,
  type FileLanguage,
  type FileNode,
  getDefaultContent,
} from "@/types/fileTree";
import type { SourceFile } from "@/utils/combineHTML";
import { detectConflicts } from "@/utils/detectConflicts";
import { validateHTML } from "@/utils/validateHTML";
import { exportProjectZip, importProjectZip } from "@/utils/zipUtils";
import { Combine, Download, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ── Web Worker ────────────────────────────────────────────────────────────
// Import Vite-bundled worker
import CombineWorker from "@/workers/combineWorker?worker";

function generateId(prefix = "node"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowTimeString(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

/** Adaptive debounce: scale delay by total content size */
function adaptiveDelay(files: FileNode[]): number {
  const totalBytes = files
    .filter((f) => f.type === "file")
    .reduce((sum, f) => sum + (f.content?.length ?? 0), 0);
  if (totalBytes < 50_000) return 300;
  if (totalBytes < 200_000) return 600;
  return 1200;
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
  const [isEditorDragging, setIsEditorDragging] = useState(false);
  const projectNameRef = useRef<HTMLInputElement>(null);

  // ── Feature state ──────────────────────────────────────────────────────────
  const [conflictDetectorEnabled, setConflictDetectorEnabled] = useState(true);
  const [conflictsDismissed, setConflictsDismissed] = useState(false);
  const [conflicts, setConflicts] = useState<{
    cssConflicts: string[];
    jsConflicts: string[];
  } | null>(null);
  const [isLivePreview, setIsLivePreview] = useState(false);
  const [isLiveBuilding, setIsLiveBuilding] = useState(false);
  const [isMinified, setIsMinified] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [activeOutputTab, setActiveOutputTab] = useState("code");

  const livePreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // ── Web Worker setup ──────────────────────────────────────────────────────
  const workerRef = useRef<Worker | null>(null);
  const pendingRequestIdRef = useRef(0);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const worker = new CombineWorker();
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  // ── Core: build combined HTML via worker ─────────────────────────────
  const buildCombined = useCallback(
    (silent = false) => {
      const worker = workerRef.current;
      if (!worker) return;

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

      const requestId = ++pendingRequestIdRef.current;
      latestRequestIdRef.current = requestId;

      setIsLiveBuilding(true);

      // Handle response
      const handleResult = (e: MessageEvent) => {
        // Ignore stale responses (user triggered a newer combine)
        if (e.data?.requestId !== latestRequestIdRef.current) return;

        worker.removeEventListener("message", handleResult);
        const result: string = e.data.result;

        // Validation (fast, stays on main thread)
        const issues = validateHTML(result);
        setValidationIssues(issues);

        // Conflict detection
        if (conflictDetectorEnabled) {
          const detected = detectConflicts(
            cssFiles.map((f) => f.content),
            jsFiles.map((f) => f.content),
          );
          setConflicts(detected);
          setConflictsDismissed(false);
        }

        setOutput(result);
        setHasGenerated(true);
        setIsLiveBuilding(false);

        const lineCount = result.split("\n").length;
        setStatusMsg(`Combined — ${lineCount} lines`);

        if (!silent) setActiveOutputTab("preview");
      };

      worker.addEventListener("message", handleResult);
      worker.postMessage({ requestId, htmlFiles, cssFiles, jsFiles });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, conflictDetectorEnabled],
  );

  const handleCombine = useCallback(() => {
    buildCombined(false);
  }, [buildCombined]);

  // ── Live preview debounce (adaptive delay) ───────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: livePreviewTimerRef is a stable ref
  useEffect(() => {
    if (!isLivePreview) return;
    if (livePreviewTimerRef.current) clearTimeout(livePreviewTimerRef.current);
    const delay = adaptiveDelay(files);
    livePreviewTimerRef.current = setTimeout(() => {
      buildCombined(true);
      setActiveOutputTab("preview");
    }, delay);
    return () => {
      if (livePreviewTimerRef.current)
        clearTimeout(livePreviewTimerRef.current);
    };
  }, [files, isLivePreview, buildCombined]);

  // ── Console log listener ──────────────────────────────────────────────
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (
        e.data?.type === "console" &&
        ["log", "warn", "error"].includes(e.data.level)
      ) {
        setConsoleLogs((prev) => [
          ...prev,
          {
            id: `log-${Date.now()}-${Math.random()}`,
            level: e.data.level as ConsoleLog["level"],
            args: e.data.args as string[],
            time: nowTimeString(),
          },
        ]);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ── File management ────────────────────────────────────────────────────────
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

  const handleUploadFiles = useCallback((fileList: FileList) => {
    const items = Array.from(fileList);
    const newNodes: FileNode[] = [];
    let pending = items.length;
    for (const file of items) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const language: FileLanguage =
        ext === "css" ? "css" : ext === "js" ? "js" : "html";
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = (e.target?.result as string) ?? "";
        const id = generateId("file");
        newNodes.push({
          id,
          name: file.name,
          type: "file",
          language,
          content,
          parentId: null,
          order: Date.now(),
        });
        pending--;
        if (pending === 0) {
          setFiles((prev) => [...prev, ...newNodes]);
          setOpenTabs((prev) => [...prev, ...newNodes.map((n) => n.id)]);
          setActiveTabId(newNodes[newNodes.length - 1].id);
          setStatusMsg(`Uploaded ${newNodes.length} file(s)`);
          toast.success(`Uploaded ${newNodes.length} file(s)`);
        }
      };
      reader.readAsText(file);
    }
  }, []);

  const handleReorderNodes = useCallback(
    (draggedId: string, targetId: string) => {
      setFiles((prev) => {
        const dragged = prev.find((f) => f.id === draggedId);
        const target = prev.find((f) => f.id === targetId);
        if (!dragged || !target || dragged.parentId !== target.parentId)
          return prev;

        const siblings = prev
          .filter((f) => f.parentId === dragged.parentId)
          .sort((a, b) => a.order - b.order);

        const fromIdx = siblings.findIndex((f) => f.id === draggedId);
        const toIdx = siblings.findIndex((f) => f.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return prev;

        const reordered = [...siblings];
        const [removed] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, removed);

        const orderMap = new Map(reordered.map((f, i) => [f.id, i]));
        return prev.map((f) =>
          orderMap.has(f.id) ? { ...f, order: orderMap.get(f.id)! } : f,
        );
      });
      setStatusMsg("Reordered");
    },
    [],
  );

  const handleExportZip = useCallback(async () => {
    try {
      await exportProjectZip(files, projectName);
      toast.success("Project exported as ZIP!");
    } catch (e) {
      toast.error(`Export failed: ${String(e)}`);
    }
  }, [files, projectName]);

  const handleImportZip = useCallback(async (file: File) => {
    try {
      const { nodes, openIds, activeId } = await importProjectZip(file);
      if (nodes.length === 0) {
        toast.error("No .html/.css/.js files found in ZIP.");
        return;
      }
      setFiles((prev) => [...prev, ...nodes]);
      setOpenTabs((prev) => [...prev, ...openIds]);
      if (activeId) setActiveTabId(activeId);
      setStatusMsg(
        `Imported ${nodes.filter((n) => n.type === "file").length} file(s) from ZIP`,
      );
      toast.success(
        `Imported ${nodes.filter((n) => n.type === "file").length} file(s) from ZIP!`,
      );
    } catch (e) {
      toast.error(`Import failed: ${String(e)}`);
    }
  }, []);

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

  const handleEditorDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsEditorDragging(true);
  };

  const handleEditorDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsEditorDragging(false);
    }
  };

  const handleEditorDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsEditorDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <Toaster theme="dark" position="bottom-right" />

      {/* ── Header ────────────────────────────────────────────────────────────────── */}
      <header
        className="ide-header border-b border-border flex items-center h-12 px-4 shrink-0 gap-3 z-20"
        style={{ borderTop: "2px solid oklch(0.76 0.14 190 / 0.45)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
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

        {/* Download */}
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

        {/* Primary CTA */}
        <button
          type="button"
          data-ocid="combine.primary_button"
          onClick={handleCombine}
          disabled={isLiveBuilding}
          className="btn-glow flex items-center gap-2 px-4 h-8 rounded text-xs font-semibold bg-primary text-primary-foreground transition-all duration-150 code-font disabled:opacity-60"
        >
          <Play className="w-3.5 h-3.5" />
          {isLiveBuilding ? "Combining…" : "Combine & Preview"}
        </button>
      </header>

      {/* ── Main panels ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[220px] shrink-0 overflow-hidden relative">
          <FileExplorer
            files={files}
            activeFileId={activeTabId}
            openTabIds={openTabs}
            onFileClick={handleFileClick}
            onDeleteNode={handleDeleteNode}
            onRenameNode={handleRenameNode}
            onAddFile={handleAddFile}
            onAddFolder={handleAddFolder}
            onUploadFiles={handleUploadFiles}
            onReorderNodes={handleReorderNodes}
            onExportZip={handleExportZip}
            onImportZip={handleImportZip}
          />
        </div>

        {/* Editor */}
        <div
          className={`flex-1 overflow-hidden ide-panel panel-inset relative transition-all duration-150 ${
            isEditorDragging ? "ring-1 ring-inset ring-primary/30" : ""
          }`}
          onDragOver={handleEditorDragOver}
          onDragLeave={handleEditorDragLeave}
          onDrop={handleEditorDrop}
        >
          {isEditorDragging && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-primary/5 border-2 border-dashed border-primary/40 pointer-events-none">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.76 0.14 190 / 0.2), oklch(0.60 0.18 230 / 0.2))",
                }}
              >
                <Combine className="w-5 h-5 text-primary/60" />
              </div>
              <p className="text-sm text-primary/70 code-font font-medium">
                Drop .html / .css / .js files
              </p>
              <p className="text-xs text-muted-foreground/50 code-font mt-1">
                Files will be added to the explorer
              </p>
            </div>
          )}
          <EditorArea
            files={files}
            openTabs={openTabs}
            activeTabId={activeTabId}
            onTabClick={handleTabClick}
            onTabClose={handleTabClose}
            onContentChange={handleContentChange}
          />
        </div>

        {/* Output */}
        <div className="w-[380px] shrink-0 overflow-hidden">
          <OutputPanel
            output={output}
            hasGenerated={hasGenerated}
            isMinified={isMinified}
            onToggleMinify={() => setIsMinified((p) => !p)}
            conflicts={conflicts}
            conflictsDismissed={conflictsDismissed}
            onDismissConflicts={() => setConflictsDismissed(true)}
            conflictDetectorEnabled={conflictDetectorEnabled}
            onToggleConflictDetector={() =>
              setConflictDetectorEnabled((p) => !p)
            }
            isLivePreview={isLivePreview}
            onToggleLivePreview={() => setIsLivePreview((p) => !p)}
            isLiveBuilding={isLiveBuilding}
            consoleLogs={consoleLogs}
            onClearConsoleLogs={() => setConsoleLogs([])}
            validationIssues={validationIssues}
            activeOutputTab={activeOutputTab}
            onActiveOutputTabChange={setActiveOutputTab}
            onOutputChange={setOutput}
          />
        </div>
      </div>

      {/* ── Status Bar ────────────────────────────────────────────────────────────────── */}
      <footer className="ide-statusbar border-t border-border/80 h-[22px] flex items-center px-3 gap-3 shrink-0">
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

        {isLivePreview && (
          <span className="text-[9px] px-1.5 py-px rounded code-font font-bold bg-primary/15 text-primary/70">
            LIVE
          </span>
        )}

        {isLiveBuilding && (
          <span className="text-[9px] px-1.5 py-px rounded code-font font-bold bg-amber-500/15 text-amber-400/80 animate-pulse">
            COMBINING…
          </span>
        )}

        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground/30 code-font">
          {statusMsg}
        </span>
        <span className="text-[10px] text-muted-foreground/20 code-font">
          •
        </span>
        <a
          href="https://caffeine.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary/60 transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}

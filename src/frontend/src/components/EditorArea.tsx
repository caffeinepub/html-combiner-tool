import type { FileLanguage, FileNode } from "@/types/fileTree";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { search } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap } from "@codemirror/view";
import { FileCode, FileCog, FileText, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

interface EditorAreaProps {
  files: FileNode[];
  openTabs: string[];
  activeTabId: string | null;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onContentChange: (id: string, content: string) => void;
}

function TabFileIcon({ language }: { language?: FileLanguage }) {
  if (language === "html")
    return <FileCode className="w-3 h-3 text-html shrink-0" />;
  if (language === "css")
    return <FileCog className="w-3 h-3 text-css shrink-0" />;
  if (language === "js")
    return <FileText className="w-3 h-3 text-js shrink-0" />;
  return <FileText className="w-3 h-3 text-muted-foreground shrink-0" />;
}

const baseTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', 'Geist Mono', monospace",
    background: "transparent",
  },
  ".cm-scroller": { overflow: "auto" },
  ".cm-content": { padding: "8px 0", minHeight: "100%" },
  "&.cm-focused": { outline: "none" },
  ".cm-gutters": {
    background: "oklch(0.11 0.01 240)",
    border: "none",
    borderRight: "1px solid oklch(0.20 0.01 240)",
    color: "oklch(0.40 0.01 240)",
  },
  ".cm-activeLineGutter": { background: "oklch(0.14 0.01 240)" },
  ".cm-activeLine": { background: "oklch(0.12 0.01 240 / 0.5)" },
  ".cm-selectionBackground": {
    background: "oklch(0.76 0.14 190 / 0.20) !important",
  },
  ".cm-cursor": { borderLeftColor: "oklch(0.76 0.14 190)" },
  ".cm-search": {
    background: "oklch(0.15 0.01 240)",
    borderTop: "1px solid oklch(0.22 0.01 240)",
  },
});

function getLanguageExtension(language?: FileLanguage) {
  if (language === "html") return html();
  if (language === "css") return css();
  if (language === "js") return javascript({ jsx: false, typescript: false });
  return [];
}

export function EditorArea({
  files,
  openTabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onContentChange,
}: EditorAreaProps) {
  const activeFile = files.find((f) => f.id === activeTabId);
  const getFile = (id: string) => files.find((f) => f.id === id);

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const onContentChangeRef = useRef(onContentChange);
  const isExternalUpdateRef = useRef(false);
  onContentChangeRef.current = onContentChange;

  const langLabel: Record<FileLanguage, string> = {
    html: "HTML",
    css: "CSS",
    js: "JavaScript",
  };

  // Create/destroy EditorView when active tab changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only recreate on tab change
  useEffect(() => {
    if (!containerRef.current) return;
    if (!activeFile) {
      editorRef.current?.destroy();
      editorRef.current = null;
      return;
    }

    const fileId = activeFile.id;
    const langExt = getLanguageExtension(activeFile.language);

    const state = EditorState.create({
      doc: activeFile.content ?? "",
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        search({ top: false }),
        oneDark,
        baseTheme,
        langExt,
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isExternalUpdateRef.current) {
            onContentChangeRef.current(fileId, update.state.doc.toString());
          }
        }),
      ],
    });

    // Destroy old view
    editorRef.current?.destroy();

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });
    editorRef.current = view;

    return () => {
      view.destroy();
      editorRef.current = null;
    };
  }, [activeTabId]);

  // Sync external content changes (e.g., after file import)
  const syncContent = useCallback(() => {
    if (!editorRef.current || !activeFile) return;
    const currentDoc = editorRef.current.state.doc.toString();
    const targetContent = activeFile.content ?? "";
    if (currentDoc === targetContent) return;
    isExternalUpdateRef.current = true;
    editorRef.current.dispatch({
      changes: {
        from: 0,
        to: editorRef.current.state.doc.length,
        insert: targetContent,
      },
    });
    isExternalUpdateRef.current = false;
  }, [activeFile]);

  // Sync when content changes from outside (not from editor)
  useEffect(() => {
    syncContent();
  }, [syncContent]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab Bar */}
      <div
        className="ide-tabbar flex items-end border-b border-border overflow-x-auto shrink-0"
        style={{ minHeight: "40px" }}
      >
        {openTabs.length === 0 ? (
          <div className="px-4 flex items-center h-full">
            <span className="text-[10px] text-muted-foreground/25 code-font italic">
              No files open
            </span>
          </div>
        ) : (
          openTabs.map((tabId, idx) => {
            const file = getFile(tabId);
            if (!file) return null;
            const isActive = tabId === activeTabId;
            return (
              <button
                type="button"
                key={tabId}
                data-ocid={`editor.tab.${idx + 1}`}
                onClick={() => onTabClick(tabId)}
                className={`group flex items-center gap-1.5 px-3 h-[40px] text-xs code-font border-r border-border shrink-0 transition-colors relative ${
                  isActive
                    ? "tab-active text-foreground"
                    : "ide-tabbar text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/40"
                }`}
              >
                <span
                  className="absolute top-0 left-0 right-0 h-[3px] rounded-b-none transition-colors"
                  style={{
                    background: isActive
                      ? "oklch(0.76 0.14 190)"
                      : "transparent",
                  }}
                />
                <TabFileIcon language={file.language} />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tabId);
                  }}
                  className={`w-4 h-4 flex items-center justify-center rounded transition-all duration-100 ml-0.5 hover:bg-accent ${
                    isActive
                      ? "text-muted-foreground/50 hover:text-foreground"
                      : "text-transparent group-hover:text-muted-foreground/40 hover:!text-foreground"
                  }`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </button>
            );
          })
        )}
      </div>

      {/* CodeMirror Editor */}
      <div className="flex-1 overflow-hidden relative">
        {!activeFile ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded border border-border/40 flex items-center justify-center bg-muted/10">
              <FileCode className="w-5 h-5 text-muted-foreground/20" />
            </div>
            <p className="text-sm text-muted-foreground/30 code-font">
              Open a file from the explorer
            </p>
          </div>
        ) : (
          <div
            ref={containerRef}
            data-ocid="editor.editor"
            className="h-full overflow-hidden ide-panel"
            style={{ background: "oklch(0.085 0.01 240)" }}
          />
        )}
      </div>

      {/* Language breadcrumb */}
      {activeFile && (
        <div className="ide-statusbar border-t border-border/80 px-3 py-0.5 flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground/40 code-font">
            Ctrl+F find &nbsp;·&nbsp; Ctrl+H replace &nbsp;·&nbsp; Ctrl+Z undo
          </span>
          <span
            className={`text-[10px] code-font ${
              activeFile.language === "html"
                ? "text-html"
                : activeFile.language === "css"
                  ? "text-css"
                  : activeFile.language === "js"
                    ? "text-js"
                    : "text-muted-foreground/40"
            }`}
          >
            {activeFile.language
              ? langLabel[activeFile.language]
              : "Plain Text"}
          </span>
        </div>
      )}
    </div>
  );
}

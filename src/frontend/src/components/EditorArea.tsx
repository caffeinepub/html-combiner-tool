import type { FileLanguage, FileNode } from "@/types/fileTree";
import { FileCode, FileCog, FileText, X } from "lucide-react";

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

  const langLabel: Record<FileLanguage, string> = {
    html: "HTML",
    css: "CSS",
    js: "JavaScript",
  };

  const lineCount = (activeFile?.content ?? "").split("\n").length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/*
        Tab Bar — ide-tabbar (0.10) background.
        Active tabs use tab-active (0.115) = explicitly lighter, clearly distinct.
        Taller height (40px) gives tabs visual breathing room.
      */}
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
                {/*
                  Top indicator: 3px for active, invisible for inactive.
                  Positioned at absolute top so it spans the full tab width precisely.
                */}
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
                {/*
                  Close button: always visible on active tab (opacity-60);
                  fades in on hover for inactive tabs.
                */}
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

      {/* Editor canvas */}
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
          <div className="flex h-full">
            {/* Line numbers — sidebar bg so they sit on a lighter surface */}
            <div
              className="ide-sidebar border-r border-border/60 py-2 px-2 text-right overflow-hidden select-none shrink-0"
              style={{ minWidth: "44px" }}
            >
              {lineNumbers.map((n) => (
                <div
                  key={`ln-${n}`}
                  className="text-[11px] leading-5 text-muted-foreground/25 code-font"
                >
                  {n}
                </div>
              ))}
            </div>

            {/* Code textarea — darkest surface */}
            <textarea
              data-ocid="editor.textarea"
              value={activeFile.content ?? ""}
              onChange={(e) => onContentChange(activeFile.id, e.target.value)}
              spellCheck={false}
              className="flex-1 h-full ide-panel text-foreground/90 code-font text-[13px] leading-5 p-2 pl-3 outline-none resize-none overflow-auto"
              placeholder={`// ${activeFile.name}`}
              style={{ tabSize: 2 }}
            />
          </div>
        )}
      </div>

      {/* Language breadcrumb — anchored to editor bottom */}
      {activeFile && (
        <div className="ide-statusbar border-t border-border/80 px-3 py-0.5 flex items-center justify-end gap-2">
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

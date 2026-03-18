import { ScrollArea } from "@/components/ui/scroll-area";
import type { FileLanguage, FileNode } from "@/types/fileTree";
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileCog,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface FileExplorerProps {
  files: FileNode[];
  activeFileId: string | null;
  openTabIds: string[];
  onFileClick: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onRenameNode: (id: string, newName: string) => void;
  onAddFile: (parentId: string, language: FileLanguage) => void;
  onAddFolder: (parentId: string | null) => void;
}

function FileIcon({ language }: { language?: FileLanguage }) {
  if (language === "html")
    return <FileCode className="w-3.5 h-3.5 text-html shrink-0" />;
  if (language === "css")
    return <FileCog className="w-3.5 h-3.5 text-css shrink-0" />;
  if (language === "js")
    return <FileText className="w-3.5 h-3.5 text-js shrink-0" />;
  return <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
}

interface TreeNodeProps {
  node: FileNode;
  allFiles: FileNode[];
  depth: number;
  activeFileId: string | null;
  openTabIds: string[];
  expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void;
  onFileClick: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onRenameNode: (id: string, newName: string) => void;
  onAddFile: (parentId: string, language: FileLanguage) => void;
  nodeIndex: number;
}

function TreeNode({
  node,
  allFiles,
  depth,
  activeFileId,
  openTabIds,
  expandedFolders,
  onToggleFolder,
  onFileClick,
  onDeleteNode,
  onRenameNode,
  onAddFile,
  nodeIndex,
}: TreeNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(e.target as Node)
      ) {
        setShowAddMenu(false);
      }
    }
    if (showAddMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddMenu]);

  const children = allFiles
    .filter((f) => f.parentId === node.id)
    .sort((a, b) => a.order - b.order);

  const isExpanded = expandedFolders.has(node.id);
  const isActive = node.id === activeFileId;
  const isOpen = openTabIds.includes(node.id);

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== node.name) {
      onRenameNode(node.id, renameValue.trim());
    } else {
      setRenameValue(node.name);
    }
    setIsRenaming(false);
  };

  const handleNodeActivate = () => {
    if (node.type === "folder") onToggleFolder(node.id);
    else onFileClick(node.id);
  };

  const ocidType = node.type === "folder" ? "folder" : "file";
  const ocid = `${ocidType}.item.${nodeIndex}`;

  return (
    <div>
      <div
        data-ocid={ocid}
        className={`group flex items-center gap-1 px-2 py-[3px] cursor-pointer rounded-sm mx-1 transition-colors relative ${
          isActive
            ? "bg-accent text-foreground"
            : isOpen
              ? "text-foreground/80"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={handleNodeActivate}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleNodeActivate();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsRenaming(true);
          setRenameValue(node.name);
        }}
      >
        {node.type === "folder" ? (
          <span className="w-3 h-3 flex items-center justify-center text-muted-foreground/60">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        ) : (
          <span className="w-3" />
        )}

        {node.type === "folder" ? (
          isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-primary/80 shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-primary/60 shrink-0" />
          )
        ) : (
          <FileIcon language={node.language} />
        )}

        {isRenaming ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") {
                setRenameValue(node.name);
                setIsRenaming(false);
              }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-input border border-ring/50 rounded px-1 text-xs text-foreground outline-none code-font"
          />
        ) : (
          <span className="flex-1 min-w-0 truncate text-xs code-font">
            {node.name}
          </span>
        )}

        {isHovered && !isRenaming && (
          <div
            className="flex items-center gap-0.5 ml-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {node.type === "folder" && (
              <div className="relative" ref={addMenuRef}>
                <button
                  type="button"
                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-primary/20 text-primary/60 hover:text-primary transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddMenu((p) => !p);
                  }}
                  title="Add file"
                >
                  <Plus className="w-3 h-3" />
                </button>
                {showAddMenu && (
                  <div className="absolute right-0 top-5 z-50 bg-popover border border-border rounded shadow-lg py-1 min-w-[80px]">
                    {(["html", "css", "js"] as FileLanguage[]).map((lang) => (
                      <button
                        type="button"
                        key={lang}
                        className={`w-full text-left px-3 py-1 text-[11px] font-mono font-bold uppercase hover:bg-accent transition-colors ${
                          lang === "html"
                            ? "text-html"
                            : lang === "css"
                              ? "text-css"
                              : "text-js"
                        }`}
                        onClick={() => {
                          onAddFile(node.id, lang);
                          setShowAddMenu(false);
                        }}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground/40 hover:text-destructive transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteNode(node.id);
              }}
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {node.type === "folder" && isExpanded && (
        <div>
          {children.map((child, idx) => (
            <TreeNode
              key={child.id}
              node={child}
              allFiles={allFiles}
              depth={depth + 1}
              activeFileId={activeFileId}
              openTabIds={openTabIds}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onFileClick={onFileClick}
              onDeleteNode={onDeleteNode}
              onRenameNode={onRenameNode}
              onAddFile={onAddFile}
              nodeIndex={idx + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({
  files,
  activeFileId,
  openTabIds,
  onFileClick,
  onDeleteNode,
  onRenameNode,
  onAddFile,
  onAddFolder,
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(files.filter((f) => f.type === "folder").map((f) => f.id)),
  );

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const folderIds = files.filter((f) => f.type === "folder").map((f) => f.id);
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      for (const id of folderIds) next.add(id);
      return next;
    });
  }, [files]);

  const rootNodes = files
    .filter((f) => f.parentId === null)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="ide-sidebar h-full flex flex-col border-r border-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Explorer
        </span>
        <button
          type="button"
          data-ocid="sidebar.button"
          onClick={() => onAddFolder(null)}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground/50 hover:text-primary transition-colors"
          title="New folder"
        >
          <FolderPlus className="w-3.5 h-3.5" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {rootNodes.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground/40 code-font">
                No files yet.
              </p>
              <button
                type="button"
                onClick={() => onAddFolder(null)}
                className="mt-2 text-xs text-primary/60 hover:text-primary transition-colors"
              >
                Create a folder
              </button>
            </div>
          ) : (
            rootNodes.map((node, idx) => (
              <TreeNode
                key={node.id}
                node={node}
                allFiles={files}
                depth={0}
                activeFileId={activeFileId}
                openTabIds={openTabIds}
                expandedFolders={expandedFolders}
                onToggleFolder={toggleFolder}
                onFileClick={onFileClick}
                onDeleteNode={onDeleteNode}
                onRenameNode={onRenameNode}
                onAddFile={onAddFile}
                nodeIndex={idx + 1}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="px-3 py-2 border-t border-border">
        <p className="text-[9px] text-muted-foreground/30 code-font text-center">
          Double-click to rename
        </p>
      </div>
    </div>
  );
}

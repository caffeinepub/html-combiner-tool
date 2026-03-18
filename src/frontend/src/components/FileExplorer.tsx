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
  PackageOpen,
  Plus,
  Trash2,
  UploadCloud,
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
  onUploadFiles: (files: FileList) => void;
  onReorderNodes: (draggedId: string, targetId: string) => void;
  onExportZip: () => void;
  onImportZip: (file: File) => void;
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

interface DropIndicatorProps {
  visible: boolean;
  depth: number;
}
function DropIndicator({ visible, depth }: DropIndicatorProps) {
  if (!visible) return null;
  return (
    <div
      className="h-[2px] mx-1 rounded-full pointer-events-none"
      style={{
        marginLeft: `${8 + depth * 12}px`,
        background: "oklch(0.76 0.14 190)",
        boxShadow: "0 0 6px oklch(0.76 0.14 190 / 0.5)",
      }}
    />
  );
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
  draggedId: string | null;
  dropTargetId: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
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
  draggedId,
  dropTargetId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
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
  const isDragging = draggedId === node.id;
  const isDropTarget = dropTargetId === node.id;

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
      {/* Drop indicator ABOVE this node */}
      <DropIndicator visible={isDropTarget} depth={depth} />

      <div
        data-ocid={ocid}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-file-node-id", node.id);
          e.dataTransfer.effectAllowed = "move";
          onDragStart(node.id);
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-file-node-id")) {
            e.preventDefault();
            onDragOver(e, node.id);
          }
        }}
        onDrop={(e) => {
          if (e.dataTransfer.types.includes("application/x-file-node-id")) {
            e.preventDefault();
            onDrop(e, node.id);
          }
        }}
        onDragEnd={onDragEnd}
        className={`group flex items-center gap-1 px-2 py-[3px] cursor-pointer rounded-sm mx-1 transition-all relative ${
          isDragging ? "opacity-40" : ""
        } ${
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
              draggedId={draggedId}
              dropTargetId={dropTargetId}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
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
  onUploadFiles,
  onReorderNodes,
  onExportZip,
  onImportZip,
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(files.filter((f) => f.type === "folder").map((f) => f.id)),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const zipImportRef = useRef<HTMLInputElement>(null);

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

  const handleOsFileDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setIsDragging(true);
    }
  };

  const handleOsFileDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleOsFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files);
    }
  };

  const handleInternalDragStart = (id: string) => {
    setDraggedId(id);
    setDropTargetId(null);
  };

  const handleInternalDragOver = (_e: React.DragEvent, id: string) => {
    if (draggedId && id !== draggedId) {
      // Only allow reorder within same parent
      const dragged = files.find((f) => f.id === draggedId);
      const target = files.find((f) => f.id === id);
      if (dragged && target && dragged.parentId === target.parentId) {
        setDropTargetId(id);
      }
    }
  };

  const handleInternalDrop = (e: React.DragEvent, targetId: string) => {
    const sourceId = e.dataTransfer.getData("application/x-file-node-id");
    if (sourceId && sourceId !== targetId) {
      onReorderNodes(sourceId, targetId);
    }
    setDraggedId(null);
    setDropTargetId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTargetId(null);
  };

  return (
    <div
      className={`ide-sidebar h-full flex flex-col border-r transition-all duration-150 ${
        isDragging
          ? "border-primary/60 ring-1 ring-inset ring-primary/40"
          : "border-border"
      }`}
      onDragOver={handleOsFileDragOver}
      onDragLeave={handleOsFileDragLeave}
      onDrop={handleOsFileDrop}
    >
      {/* Hidden file inputs */}
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        accept=".html,.css,.js"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadFiles(e.target.files);
          }
          e.target.value = "";
        }}
      />
      <input
        ref={zipImportRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportZip(file);
          e.target.value = "";
        }}
      />

      {/* OS file drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-primary/5 border-2 border-dashed border-primary/50 rounded-sm pointer-events-none">
          <UploadCloud className="w-8 h-8 text-primary/60 mb-1" />
          <p className="text-xs text-primary/70 code-font">Drop files here</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-ocid="sidebar.upload_button"
            onClick={() => uploadInputRef.current?.click()}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground/50 hover:text-primary transition-colors"
            title="Upload files (.html/.css/.js)"
          >
            <UploadCloud className="w-3.5 h-3.5" />
          </button>
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
      </div>

      {/* ZIP Import / Export row */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/60">
        <button
          type="button"
          data-ocid="sidebar.export_button"
          onClick={onExportZip}
          className="flex items-center gap-1 flex-1 justify-center h-[22px] rounded text-[10px] code-font font-medium border border-border/60 text-muted-foreground/50 hover:text-foreground hover:border-border transition-colors"
          title="Export project as ZIP"
        >
          <PackageOpen className="w-3 h-3" />
          Export ZIP
        </button>
        <button
          type="button"
          data-ocid="sidebar.import_button"
          onClick={() => zipImportRef.current?.click()}
          className="flex items-center gap-1 flex-1 justify-center h-[22px] rounded text-[10px] code-font font-medium border border-border/60 text-muted-foreground/50 hover:text-foreground hover:border-border transition-colors"
          title="Import project from ZIP"
        >
          <UploadCloud className="w-3 h-3" />
          Import ZIP
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
                draggedId={draggedId}
                dropTargetId={dropTargetId}
                onDragStart={handleInternalDragStart}
                onDragOver={handleInternalDragOver}
                onDrop={handleInternalDrop}
                onDragEnd={handleDragEnd}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="px-3 py-2 border-t border-border">
        <p className="text-[9px] text-muted-foreground/30 code-font text-center">
          Double-click to rename · Drag to reorder
        </p>
      </div>
    </div>
  );
}

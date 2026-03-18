import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SourceFile } from "@/utils/combineHTML";
import { GripVertical, Trash2, Upload, X } from "lucide-react";
import { useRef } from "react";

interface CodePanelProps {
  label: string;
  language: string;
  files: SourceFile[];
  onFilesChange: (files: SourceFile[]) => void;
  scratch: string;
  onScratchChange: (v: string) => void;
  accentColor: string;
  ocidPrefix: string;
  placeholder?: string;
}

export function CodePanel({
  label,
  language,
  files,
  onFilesChange,
  scratch,
  onScratchChange,
  accentColor,
  ocidPrefix,
  placeholder,
}: CodePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = Array.from(e.target.files ?? []);
    if (!uploaded.length) return;
    const readers = uploaded.map(
      (file) =>
        new Promise<SourceFile>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) =>
            resolve({ name: file.name, content: ev.target?.result as string });
          reader.readAsText(file);
        }),
    );
    Promise.all(readers).then((newFiles) => {
      onFilesChange([...files, ...newFiles]);
    });
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span className="text-xs font-mono font-semibold tracking-widest uppercase text-muted-foreground">
            {label}
          </span>
          <span className="text-xs font-mono text-muted-foreground/40">
            .{language}
          </span>
          {files.length > 0 && (
            <span className="text-xs font-mono text-muted-foreground/50">
              ({files.length})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={() => fileInputRef.current?.click()}
            data-ocid={`${ocidPrefix}.upload_button`}
          >
            <Upload className="w-3 h-3" />
            Upload
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
            onClick={() => {
              onFilesChange([]);
              onScratchChange("");
            }}
            data-ocid={`${ocidPrefix}.secondary_button`}
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </Button>
        </div>
      </div>

      {/* File List */}
      <div
        className="rounded-md border border-border/60 overflow-hidden"
        data-ocid={`${ocidPrefix}.list`}
      >
        {files.length === 0 ? (
          <div
            className="px-3 py-2.5 text-xs font-mono text-muted-foreground/30 italic"
            data-ocid={`${ocidPrefix}.empty_state`}
          >
            No files uploaded
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-card/60 hover:bg-accent/20 transition-colors group"
              >
                <GripVertical className="w-3 h-3 text-muted-foreground/20 flex-shrink-0" />
                <span className="text-xs font-mono text-muted-foreground/50 w-4 text-right flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-xs font-mono text-foreground/80 flex-1 truncate">
                  {file.name}
                </span>
                {ocidPrefix === "html" && i === 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 font-mono border-primary/30 text-primary/70 flex-shrink-0"
                  >
                    Parent Shell
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => removeFile(i)}
                  data-ocid={`${ocidPrefix}.delete_button.${i + 1}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Scratch Pad */}
      <div className="relative rounded-md overflow-hidden border border-border">
        <div className="px-2.5 py-1 bg-muted/20 border-b border-border/50 flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest">
            Scratch pad
          </span>
          {scratch.trim() && (
            <span className="text-[10px] font-mono text-primary/50">
              → appended as manual-input
            </span>
          )}
        </div>
        <textarea
          value={scratch}
          onChange={(e) => onScratchChange(e.target.value)}
          placeholder={placeholder}
          rows={8}
          spellCheck={false}
          className="code-area w-full bg-[oklch(0.1_0_0)] text-foreground font-mono text-sm p-3 resize-y outline-none focus:ring-1 focus:ring-ring/50 placeholder:text-muted-foreground/30 transition-all"
          data-ocid={`${ocidPrefix}.textarea`}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,.css,.js,.ts,.txt"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}

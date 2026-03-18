import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, Copy, Download, Eye, FileCode2 } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

interface OutputPanelProps {
  output: string;
  hasGenerated: boolean;
}

export function OutputPanel({ output, hasGenerated }: OutputPanelProps) {
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    toast.success("Copied to clipboard!");
  }, [output]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([output], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "combined.html";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded combined.html");
  }, [output]);

  return (
    /*
      Output panel uses ide-sidebar bg (0.145) — same depth as file explorer,
      so it frames the dark editor canvas on both sides with a lighter surface.
    */
    <div className="ide-sidebar border-l border-border h-full flex flex-col">
      <Tabs defaultValue="code" className="flex flex-col h-full">
        {/*
          Panel header — matches editor tab bar height (40px) for rhythm.
          A subtle top label + tab switcher rather than just tabs.
        */}
        <div
          className="ide-tabbar flex items-center justify-between px-3 border-b border-border shrink-0"
          style={{ height: "40px" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40 code-font">
              Output
            </span>
            <div className="w-px h-3 bg-border/60" />
            <TabsList className="bg-transparent gap-0 h-6 p-0">
              <TabsTrigger
                data-ocid="output.tab.1"
                value="code"
                className="text-[10px] code-font h-6 px-2.5 rounded-sm data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground/60 gap-1 transition-colors"
              >
                <Code2 className="w-3 h-3" />
                Code
              </TabsTrigger>
              <TabsTrigger
                data-ocid="output.tab.2"
                value="preview"
                className="text-[10px] code-font h-6 px-2.5 rounded-sm data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground/60 gap-1 transition-colors"
              >
                <Eye className="w-3 h-3" />
                Preview
              </TabsTrigger>
            </TabsList>
          </div>

          {hasGenerated && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleCopy}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground/40 hover:text-foreground transition-colors"
                title="Copy output"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                type="button"
                data-ocid="download.primary_button"
                onClick={handleDownload}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-primary/15 text-primary/50 hover:text-primary transition-colors"
                title="Download .html"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Code tab */}
        <TabsContent value="code" className="flex-1 mt-0 overflow-hidden">
          {!hasGenerated ? (
            <div
              data-ocid="output.empty_state"
              className="h-full flex flex-col items-center justify-center gap-3 p-6"
            >
              <div
                className="w-10 h-10 rounded border border-border/40 flex items-center justify-center"
                style={{ background: "oklch(0.10 0 0)" }}
              >
                <FileCode2 className="w-4 h-4 text-muted-foreground/20" />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground/40 code-font">
                  No output yet
                </p>
                <p className="text-[10px] text-muted-foreground/25 mt-1">
                  Click{" "}
                  <span className="text-primary/60">Combine &amp; Preview</span>
                </p>
              </div>
            </div>
          ) : (
            <textarea
              data-ocid="output.editor"
              readOnly
              value={output}
              className="w-full h-full ide-panel text-foreground/75 code-font text-[11px] leading-5 p-3 outline-none resize-none"
            />
          )}
        </TabsContent>

        {/* Preview tab */}
        <TabsContent value="preview" className="flex-1 mt-0 overflow-hidden">
          {!hasGenerated ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6">
              <div
                className="w-10 h-10 rounded border border-border/40 flex items-center justify-center"
                style={{ background: "oklch(0.10 0 0)" }}
              >
                <Eye className="w-4 h-4 text-muted-foreground/20" />
              </div>
              <p className="text-xs text-muted-foreground/40 code-font">
                No preview yet
              </p>
            </div>
          ) : (
            <iframe
              data-ocid="output.canvas_target"
              srcDoc={output}
              sandbox="allow-scripts"
              title="HTML Preview"
              className="w-full h-full bg-white"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

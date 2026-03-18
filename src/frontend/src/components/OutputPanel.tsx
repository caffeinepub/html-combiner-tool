import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { minifyHTML } from "@/utils/minifyHTML";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  Eye,
  FileCode2,
  Link2Off,
  Loader2,
  Minimize2,
  Terminal,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

export interface ConsoleLog {
  id: string;
  level: "log" | "warn" | "error";
  args: string[];
  time: string;
}

interface OutputPanelProps {
  output: string;
  hasGenerated: boolean;
  isMinified: boolean;
  onToggleMinify: () => void;
  conflicts: { cssConflicts: string[]; jsConflicts: string[] } | null;
  conflictsDismissed: boolean;
  onDismissConflicts: () => void;
  conflictDetectorEnabled: boolean;
  onToggleConflictDetector: () => void;
  isLivePreview: boolean;
  onToggleLivePreview: () => void;
  isLiveBuilding: boolean;
  consoleLogs: ConsoleLog[];
  onClearConsoleLogs: () => void;
  validationIssues: string[];
  activeOutputTab: string;
  onActiveOutputTabChange: (tab: string) => void;
  onOutputChange: (output: string) => void;
}

const CONSOLE_PROXY_SCRIPT = `
<script>(function(){
  ['log','warn','error'].forEach(function(level){
    var orig=console[level];
    console[level]=function(){
      var args=Array.prototype.slice.call(arguments).map(function(a){
        try{return typeof a==='object'?JSON.stringify(a):String(a);}catch(e){return String(a);}
      });
      window.parent.postMessage({type:'console',level:level,args:args},'*');
      orig.apply(console,arguments);
    };
  });
  window.onerror=function(msg,src,line,col){
    window.parent.postMessage({type:'console',level:'error',args:[msg+' ('+src+':'+line+':'+col+')']},'*');
  };
})();<\/script>`;

export function OutputPanel({
  output,
  hasGenerated,
  isMinified,
  onToggleMinify,
  conflicts,
  conflictsDismissed,
  onDismissConflicts,
  conflictDetectorEnabled,
  onToggleConflictDetector,
  isLivePreview,
  onToggleLivePreview,
  isLiveBuilding,
  consoleLogs,
  onClearConsoleLogs,
  validationIssues,
  activeOutputTab,
  onActiveOutputTabChange,
  onOutputChange: _onOutputChange,
}: OutputPanelProps) {
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console to bottom on new entries
  // biome-ignore lint/correctness/useExhaustiveDependencies: consoleEndRef is a stable ref
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLogs]);

  const displayOutput = useMemo(() => {
    if (!output) return "";
    return isMinified ? minifyHTML(output) : output;
  }, [output, isMinified]);

  // Inject console proxy into iframe src
  const iframeContent = useMemo(() => {
    if (!output) return "";
    const injected = output.replace(
      /<\/head>/i,
      `${CONSOLE_PROXY_SCRIPT}</head>`,
    );
    return injected !== output
      ? injected
      : `${CONSOLE_PROXY_SCRIPT}\n${output}`;
  }, [output]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(displayOutput);
    toast.success("Copied to clipboard!");
  }, [displayOutput]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([displayOutput], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "combined.html";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded combined.html");
  }, [displayOutput]);

  const handleInlineCDN = useCallback(async () => {
    if (!output) return;
    const toastId = toast.loading("Fetching CDN resources…");

    const scriptMatches = [
      ...output.matchAll(
        /<script[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*><\/script>/gi,
      ),
    ];
    const linkMatches = [
      ...output.matchAll(
        /<link[^>]+rel=["']stylesheet["'][^>]+href=["'](https?:\/\/[^"']+)["'][^>]*\/?>/gi,
      ),
    ];
    const allMatches = [
      ...scriptMatches.map((m) => ({
        tag: m[0],
        url: m[1],
        type: "script" as const,
      })),
      ...linkMatches.map((m) => ({
        tag: m[0],
        url: m[1],
        type: "link" as const,
      })),
    ];

    if (allMatches.length === 0) {
      toast.dismiss(toastId);
      toast.info("No external CDN links found.");
      return;
    }

    let inlined = output;
    let successCount = 0;
    const failedUrls: string[] = [];

    await Promise.all(
      allMatches.map(async ({ tag, url, type }) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          const replacement =
            type === "script"
              ? `<script>\n${text}\n<\/script>`
              : `<style>\n${text}\n</style>`;
          inlined = inlined.replace(tag, replacement);
          successCount++;
        } catch (_e) {
          failedUrls.push(url);
        }
      }),
    );

    toast.dismiss(toastId);
    if (successCount > 0) {
      _onOutputChange(inlined);
      toast.success(`Inlined ${successCount} CDN resource(s).`, {
        description:
          failedUrls.length > 0
            ? `Failed: ${failedUrls.length} URL(s)`
            : undefined,
      });
    } else {
      toast.error("Failed to inline all CDN resources.");
    }
  }, [output, _onOutputChange]);

  const hasConflicts =
    conflicts &&
    (conflicts.cssConflicts.length > 0 || conflicts.jsConflicts.length > 0);
  const showConflictBanner =
    conflictDetectorEnabled && hasConflicts && !conflictsDismissed;
  const totalConflicts =
    (conflicts?.cssConflicts.length ?? 0) +
    (conflicts?.jsConflicts.length ?? 0);

  return (
    <div className="ide-sidebar border-l border-border h-full flex flex-col">
      {/* Loading overlay wrapper */}
      <div className="relative flex-1 flex flex-col overflow-hidden">
        {isLiveBuilding && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/70 backdrop-blur-[2px] pointer-events-none">
            <Loader2 className="w-6 h-6 animate-spin text-primary/60 mb-2" />
            <p className="text-[10px] text-muted-foreground/50 code-font">
              Combining…
            </p>
          </div>
        )}

        <Tabs
          value={activeOutputTab}
          onValueChange={onActiveOutputTabChange}
          className="flex flex-col h-full"
        >
          {/* Panel header */}
          <div
            className="ide-tabbar flex items-center justify-between px-2 border-b border-border shrink-0 gap-1"
            style={{ height: "40px" }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40 code-font shrink-0">
                Output
              </span>
              <div className="w-px h-3 bg-border/60 shrink-0" />
              <TabsList className="bg-transparent gap-0 h-6 p-0">
                <TabsTrigger
                  data-ocid="output.tab.1"
                  value="code"
                  className="text-[10px] code-font h-6 px-2 rounded-sm data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground/60 gap-1 transition-colors"
                >
                  <Code2 className="w-3 h-3" />
                  Code
                </TabsTrigger>
                <TabsTrigger
                  data-ocid="output.tab.2"
                  value="preview"
                  className="text-[10px] code-font h-6 px-2 rounded-sm data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground/60 gap-1 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </TabsTrigger>
                <TabsTrigger
                  data-ocid="output.tab.3"
                  value="console"
                  className="text-[10px] code-font h-6 px-2 rounded-sm data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground/60 gap-1 transition-colors relative"
                >
                  <Terminal className="w-3 h-3" />
                  Console
                  {consoleLogs.length > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center"
                      style={{
                        background: consoleLogs.some((l) => l.level === "error")
                          ? "oklch(0.55 0.22 25)"
                          : consoleLogs.some((l) => l.level === "warn")
                            ? "oklch(0.75 0.17 70)"
                            : "oklch(0.60 0.18 230)",
                        color: "white",
                      }}
                    >
                      {consoleLogs.length > 9 ? "9+" : consoleLogs.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Right-side controls */}
            <div className="flex items-center gap-0.5 shrink-0">
              {/* Validation badge */}
              {hasGenerated && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      data-ocid="output.button"
                      className={`flex items-center gap-1 px-1.5 h-5 rounded text-[9px] font-bold code-font transition-colors ${
                        validationIssues.length === 0
                          ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                          : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      }`}
                      title="Validation result"
                    >
                      {validationIssues.length === 0 ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Valid
                        </>
                      ) : (
                        <>
                          <XCircle className="w-2.5 h-2.5" />
                          {validationIssues.length} issue
                          {validationIssues.length !== 1 ? "s" : ""}
                        </>
                      )}
                    </button>
                  </PopoverTrigger>
                  {validationIssues.length > 0 && (
                    <PopoverContent
                      side="bottom"
                      align="end"
                      className="w-72 p-3 bg-popover border border-border"
                    >
                      <p className="text-[10px] font-semibold text-muted-foreground/70 code-font uppercase tracking-wider mb-2">
                        Validation Issues
                      </p>
                      <ul className="space-y-1">
                        {validationIssues.map((issue) => (
                          <li
                            key={issue}
                            className="text-xs code-font text-red-400 flex items-start gap-1.5"
                          >
                            <XCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </PopoverContent>
                  )}
                </Popover>
              )}

              {/* Conflict detector off indicator */}
              {!conflictDetectorEnabled && (
                <button
                  type="button"
                  data-ocid="output.toggle"
                  onClick={onToggleConflictDetector}
                  className="flex items-center gap-1 px-1.5 h-5 rounded text-[9px] font-bold code-font bg-yellow-500/10 text-yellow-500/60 hover:text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                  title="Conflict detector disabled — click to re-enable"
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Conflicts: OFF
                </button>
              )}

              {/* Live preview toggle */}
              <button
                type="button"
                data-ocid="output.secondary_button"
                onClick={onToggleLivePreview}
                className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                  isLivePreview
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-accent text-muted-foreground/40 hover:text-foreground"
                }`}
                title={`Live preview: ${isLivePreview ? "ON" : "OFF"}`}
              >
                {isLiveBuilding ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3" />
                )}
              </button>

              {/* Minify toggle */}
              <button
                type="button"
                data-ocid="output.toggle"
                onClick={onToggleMinify}
                className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                  isMinified
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-accent text-muted-foreground/40 hover:text-foreground"
                }`}
                title={`Minify output: ${isMinified ? "ON" : "OFF"}`}
              >
                <Minimize2 className="w-3 h-3" />
              </button>

              {/* Inline CDN */}
              {hasGenerated && (
                <button
                  type="button"
                  data-ocid="output.button"
                  onClick={handleInlineCDN}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground/40 hover:text-foreground transition-colors"
                  title="Inline external CDN links"
                >
                  <Link2Off className="w-3 h-3" />
                </button>
              )}

              {hasGenerated && (
                <>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground/40 hover:text-foreground transition-colors"
                    title="Copy output"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    data-ocid="download.primary_button"
                    onClick={handleDownload}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-primary/15 text-primary/50 hover:text-primary transition-colors"
                    title="Download .html"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Conflict banner */}
          {showConflictBanner && (
            <div
              data-ocid="output.panel"
              className="shrink-0 px-3 py-2 border-b border-yellow-500/20 flex items-start gap-2"
              style={{ background: "oklch(0.15 0.03 70)" }}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-yellow-400 code-font">
                  {totalConflicts} conflict{totalConflicts !== 1 ? "s" : ""}{" "}
                  detected
                </p>
                <p className="text-[9px] text-yellow-400/60 code-font mt-0.5 truncate">
                  {[
                    ...(conflicts?.cssConflicts ?? []),
                    ...(conflicts?.jsConflicts ?? []),
                  ]
                    .slice(0, 2)
                    .join(" · ")}
                  {totalConflicts > 2 ? ` +${totalConflicts - 2} more` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  data-ocid="output.secondary_button"
                  onClick={onToggleConflictDetector}
                  className="text-[9px] text-yellow-400/50 hover:text-yellow-400 code-font underline transition-colors"
                  title="Permanently disable conflict detection for this session"
                >
                  Disable
                </button>
                <button
                  type="button"
                  data-ocid="output.close_button"
                  onClick={onDismissConflicts}
                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-yellow-400/10 text-yellow-400/50 hover:text-yellow-400 transition-colors"
                  title="Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

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
                    <span className="text-primary/60">
                      Combine &amp; Preview
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <textarea
                data-ocid="output.editor"
                readOnly
                value={displayOutput}
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
                srcDoc={iframeContent}
                sandbox="allow-scripts"
                title="HTML Preview"
                className="w-full h-full bg-white"
              />
            )}
          </TabsContent>

          {/* Console tab */}
          <TabsContent
            value="console"
            className="flex-1 mt-0 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 shrink-0">
              <span className="text-[10px] code-font text-muted-foreground/50 font-semibold uppercase tracking-wider">
                Console
              </span>
              <button
                type="button"
                data-ocid="output.delete_button"
                onClick={onClearConsoleLogs}
                className="text-[9px] code-font text-muted-foreground/40 hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-0.5 font-mono text-[11px]">
              {consoleLogs.length === 0 ? (
                <div
                  data-ocid="output.empty_state"
                  className="h-full flex items-center justify-center text-muted-foreground/25 code-font text-xs"
                >
                  No console output
                </div>
              ) : (
                consoleLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 px-2 py-1 rounded ${
                      log.level === "error"
                        ? "bg-red-500/5 text-red-400"
                        : log.level === "warn"
                          ? "bg-yellow-500/5 text-yellow-400"
                          : "text-green-400/80"
                    }`}
                  >
                    <span className="text-muted-foreground/30 shrink-0 mt-px">
                      {log.time}
                    </span>
                    <span className="break-all">{log.args.join(" ")}</span>
                  </div>
                ))
              )}
              <div ref={consoleEndRef} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

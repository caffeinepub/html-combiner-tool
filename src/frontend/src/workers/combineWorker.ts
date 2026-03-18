import { type SourceFile, combineHTML } from "@/utils/combineHTML";

export interface WorkerRequest {
  requestId: number;
  htmlFiles: SourceFile[];
  cssFiles: SourceFile[];
  jsFiles: SourceFile[];
}

export interface WorkerResponse {
  requestId: number;
  result: string;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { requestId, htmlFiles, cssFiles, jsFiles } = e.data;
  const result = combineHTML(htmlFiles, cssFiles, jsFiles);
  (self as unknown as Worker).postMessage({
    requestId,
    result,
  } satisfies WorkerResponse);
};

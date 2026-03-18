# HTML Combiner Tool

## Current State
The app combines HTML/CSS/JS files using a synchronous `combineHTML()` function called directly on the main thread. Live preview uses a fixed 600ms debounce. Every combine re-parses all HTML files via `DOMParser` regardless of changes. No loading indicator is shown during combine.

## Requested Changes (Diff)

### Add
- Web Worker (`combineWorker.ts`) that runs `combineHTML` off the main thread
- Parse cache (Map keyed by file content hash) to skip re-parsing unchanged HTML files
- Adaptive debounce: delay scales with total content size (300ms <50KB, 600ms 50-200KB, 1200ms >200KB)
- Loading spinner/indicator in the output area while a worker combine is in-flight

### Modify
- `App.tsx`: replace synchronous `combineHTML()` call with async Web Worker message; update live-preview debounce to use adaptive delay
- `combineHTML.ts`: expose cached `parsePage` using a module-level Map; accept optional cache from worker context
- `OutputPanel.tsx`: show a loading overlay/spinner when `isCombining` prop is true

### Remove
- Direct main-thread call to `combineHTML` in `buildCombined`

## Implementation Plan
1. Create `src/frontend/src/workers/combineWorker.ts` -- imports combineHTML, listens for messages, posts result back
2. Modify `combineHTML.ts` to use a module-level parse cache keyed by `name+content` hash
3. Update `App.tsx` -- instantiate worker once via `useRef`, send files via `postMessage`, receive result in `onmessage`, compute adaptive debounce delay from total byte size
4. Update `OutputPanel.tsx` -- add `isCombining?: boolean` prop, show spinner overlay on the code/preview panels

# HTML Combiner Tool

## Current State
Simple two-column layout: left side has three stacked CodePanels (HTML, CSS, JS) each with file upload and scratch pad textarea. Right side shows combined output with Code/Preview tabs. No folder support, no file tree, no IDE-style UI.

## Requested Changes (Diff)

### Add
- Left sidebar file explorer (like Tynker/VSCode): collapsible folder tree
- Ability to create folders and nest files inside them
- Add new file buttons for HTML, CSS, and JS from the sidebar
- Rename and delete files/folders via context menu or inline controls
- Active file tab system: clicking a file in the sidebar opens it in a code editor tab in the main panel
- Multiple open file tabs at top of editor area (closable)
- Syntax-highlighted editor area (use a textarea with monospace styling — no external editor lib needed)
- Status bar at bottom showing file count, active file type, line count
- Professional dark IDE theme throughout

### Modify
- Replace split-panel layout with IDE layout: narrow sidebar + wide editor area + output panel
- Output panel becomes a right-side split or bottom panel (resizable hint via layout)
- Header redesigned to look like a professional IDE toolbar with project name, combine/run button, download
- Remove the "scratch pad" concept — all editing happens in files
- File type is inferred from extension, not from separate panels

### Remove
- Three stacked CodePanels (HTML/CSS/JS)
- Scratch pad textareas
- Old two-column layout

## Implementation Plan
1. Define data types: FileNode (id, name, type: 'file'|'folder', language, content, parentId)
2. Build FileTree sidebar component with folder expand/collapse, file selection, add file/folder buttons, rename, delete
3. Build EditorArea component: open tabs bar + active file textarea editor
4. Build OutputPanel component with Code/Preview tabs, copy/download actions
5. Wire combine logic: collect all files by type, run existing combineHTML utility
6. Build StatusBar at bottom
7. Compose IDE layout: sidebar | editor | output in App.tsx
8. Apply professional dark IDE theme

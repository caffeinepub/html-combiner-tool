export interface ConflictResult {
  cssConflicts: string[];
  jsConflicts: string[];
}

export function detectConflicts(
  cssContents: string[],
  jsContents: string[],
): ConflictResult {
  // ── CSS: duplicate selectors ──────────────────────────────────────────
  const selectorSources = new Map<string, Set<number>>();

  cssContents.forEach((content, fileIdx) => {
    // Strip CSS comments first
    const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "");
    // Match selector blocks: text before { that isn't an @-rule
    const matches = stripped.matchAll(/(?:^|\}|;)\s*([^@{}][^{}]*)\s*\{/g);
    for (const m of matches) {
      const raw = m[1].trim();
      if (!raw) continue;
      // Split comma-separated selectors
      for (const sel of raw.split(",")) {
        const selector = sel.trim().replace(/\s+/g, " ");
        if (!selector || selector.length > 200) continue;
        const sources = selectorSources.get(selector) ?? new Set<number>();
        sources.add(fileIdx);
        selectorSources.set(selector, sources);
      }
    }
  });

  const cssConflicts: string[] = [];
  selectorSources.forEach((sources, selector) => {
    if (sources.size > 1) {
      cssConflicts.push(`Duplicate CSS selector: "${selector}"`);
    }
  });

  // ── JS: duplicate top-level declarations ─────────────────────────────
  const jsDeclSources = new Map<string, Set<number>>();

  jsContents.forEach((content, fileIdx) => {
    // Strip single-line and multi-line comments
    const stripped = content
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    const matches = stripped.matchAll(
      /^\s*(?:var|let|const|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gm,
    );
    for (const m of matches) {
      const name = m[1];
      const sources = jsDeclSources.get(name) ?? new Set<number>();
      sources.add(fileIdx);
      jsDeclSources.set(name, sources);
    }
  });

  const jsConflicts: string[] = [];
  jsDeclSources.forEach((sources, name) => {
    if (sources.size > 1) {
      jsConflicts.push(`Duplicate JS declaration: "${name}"`);
    }
  });

  return { cssConflicts, jsConflicts };
}

export function parseImportSpecifiers(source: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /(?:import|export)\s+(?:type\s+)?(?:[^'"\n]+from\s+)?['"]([^'"]+)['"]/g,
    /require(?:_relative)?\s*\(?\s*['"]([^'"]+)['"]/g,
    /from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /#include\s*[<"]([^>"]+)[>"]/g,
    /^\s*use\s+([a-zA-Z0-9_:]+)(?:\s*;)?/gm,
    /^\s*mod\s+([a-zA-Z0-9_]+)\s*;/gm,
    /^\s*using\s+([A-Za-z0-9_.]+)\s*;/gm,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const spec = match[1]?.trim();
      if (spec) found.add(spec);
    }
  }
  return [...found];
}

export type DiffHunk = {
  header: string;
  lines: string[];
};

export function parseDiff(patch: string): {
  header: string[];
  hunks: DiffHunk[];
} | null {
  const lines = patch.split(/\r?\n/);
  const first = lines.findIndex((line) => line.startsWith("@@"));
  if (first < 0) {
    return null;
  }
  const header = lines.slice(0, first);
  const hunks: DiffHunk[] = [];
  let current: DiffHunk | null = null;
  for (let index = first; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("@@")) {
      if (current) {
        hunks.push(current);
      }
      current = { header: line, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) {
    hunks.push(current);
  }
  return { header, hunks };
}

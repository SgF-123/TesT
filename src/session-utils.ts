export function projectBasename(project: string) {
  const clean = project.replace(/[\\/]+$/, "");
  return clean.split(/[\\/]/).pop() || clean;
}

export function workspaceLabel(value: string) {
  const clean = String(value || "").replace(/[\\/]+$/, "");
  return clean.split(/[\\/]/).pop() || clean || "工作区";
}

export function sameWorkspacePath(a?: string, b?: string) {
  if (!a || !b) {
    return false;
  }
  const left = a.replace(/[\\/]+$/, "").toLowerCase();
  const right = b.replace(/[\\/]+$/, "").toLowerCase();
  return left === right;
}

export function pathWithinProject(cwd?: string, project?: string) {
  if (!cwd || !project) {
    return false;
  }
  const left = cwd.replace(/[\\/]+$/, "").toLowerCase();
  const right = project.replace(/[\\/]+$/, "").toLowerCase();
  return (
    left === right ||
    left.startsWith(`${right}\\`) ||
    left.startsWith(`${right}/`)
  );
}

import { readFile } from "fs/promises";
import path from "path";

export type PlaygroundSourceFile = {
  path: string;
  content: string;
};

const CODE_FILE = /\.(tsx?|jsx?|css)$/;

/**
 * Read related source files from disk for playground handoff.
 * Skips assets (images) and directory stubs.
 */
export async function loadPlaygroundSources(
  files: readonly string[] | undefined,
): Promise<PlaygroundSourceFile[]> {
  if (!files?.length) return [];

  const root = process.cwd();
  const out: PlaygroundSourceFile[] = [];

  for (const rel of files) {
    if (!rel || rel.endsWith("/") || !CODE_FILE.test(rel)) continue;
    // Only allow paths under src/ (no escaping the repo via ..)
    if (rel.includes("..") || !rel.startsWith("src/")) continue;

    try {
      const content = await readFile(path.join(root, rel), "utf8");
      out.push({ path: rel, content });
    } catch {
      // Missing / unreadable — omit from panel
    }
  }

  return out;
}

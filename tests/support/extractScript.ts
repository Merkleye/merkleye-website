import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

/**
 * Pulls a <script> block's raw text out of an .astro source file by tag
 * attributes (e.g. `is:inline` vs none), so tests exercise the actual
 * shipped script instead of a hand-copied duplicate that can drift from it.
 */
export function extractScript(astroFilePath: string, tagAttrs: string): string {
  const source = readFileSync(astroFilePath, "utf8");
  const openTag = tagAttrs ? `<script ${tagAttrs}>` : "<script>";
  const start = source.indexOf(openTag);
  if (start === -1) {
    throw new Error(`No "${openTag}" block found in ${astroFilePath}`);
  }
  const bodyStart = start + openTag.length;
  const end = source.indexOf("</script>", bodyStart);
  if (end === -1) {
    throw new Error(`Unterminated <script> block in ${astroFilePath}`);
  }
  return source.slice(bodyStart, end);
}

/** Strips TypeScript syntax so the script can run as plain JS via `new Function`. */
export function stripTypes(code: string): string {
  return transformSync(code, { loader: "ts" }).code;
}

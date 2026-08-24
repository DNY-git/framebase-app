/**
 * Resolves a stable root directory for file storage.
 *
 * Storage paths must not depend on `process.cwd()`, otherwise files written
 * while the API is launched from one directory become unreachable after a
 * restart from another directory — uploaded images then "disappear" on
 * refresh. Instead, walk up from this source file to the nearest package
 * root (`apps/api/package.json`), which is the same regardless of how or
 * where the API is started (dev watch, built dist, tsx scripts).
 *
 * An explicit STORAGE_ROOT env var always wins.
 */
import * as fs from 'fs';
import * as path from 'path';

const MAX_WALK_DEPTH = 6;

export function resolveStorageRoot(): string {
  const override = process.env.STORAGE_ROOT;
  if (override) {
    return path.resolve(override);
  }
  let dir = __dirname;
  for (let i = 0; i < MAX_WALK_DEPTH; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

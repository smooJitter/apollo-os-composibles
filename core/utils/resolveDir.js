// core/utils/resolveDir.js
import path from 'path';
import { fileURLToPath } from 'url';

export function resolveDir(metaUrl, subPath = '') {
  const __filename = fileURLToPath(metaUrl);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, subPath);
}

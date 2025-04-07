// fileUtils.js placeholderimport fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Synchronously walk through a directory and return .js file paths.
 */
export function walkDir(dirPath) {
  const files = [];

  for (const entry of fs.readdirSync(dirPath)) {
    const entryPath = path.join(dirPath, entry);
    const stat = fs.statSync(entryPath);

    if (stat.isDirectory()) {
      files.push(...walkDir(entryPath));
    } else if (entry.endsWith('.js')) {
      files.push(entryPath);
    }
  }

  return files;
}

/**
 * Asynchronously walks a directory and returns paths to all files matching a specific extension (e.g., '.js').
 * @param {string} dirPath - The starting directory path.
 * @param {string} extension - The file extension to look for (e.g., '.js').
 * @returns {Promise<string[]>} A promise that resolves to an array of matching file paths.
 */
export async function findFilesByExtension(dirPath, extension = '.js') {
  const files = [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await findFilesByExtension(fullPath, extension)));
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    // Ignore errors like permission denied for specific subdirs, log others
    if (err.code !== 'EACCES' && err.code !== 'ENOENT') {
      console.error(`[fileUtils] Error walking directory ${dirPath}:`, err);
    }
  }
  return files;
}

/**
 * Dynamically imports a module given its file path.
 * Ensures compatibility with ES Modules by converting path to file URL.
 * @param {string} filePath - The absolute path to the module file.
 * @returns {Promise<any>} A promise resolving to the module's exports.
 */
export async function dynamicImportModule(filePath) {
  try {
    const fileUrl = pathToFileURL(filePath).href;
    const module = await import(fileUrl);
    return module.default || module; // Prefer default export, fallback to named
  } catch (err) {
    console.error(`[fileUtils] Error dynamically importing module ${filePath}:`, err);
    throw err; // Re-throw to indicate loading failure
  }
}

/**
 * Reads the content of a file asynchronously.
 * @param {string} filePath - The path to the file.
 * @returns {Promise<string>} File content as a string.
 */
export async function readFileContent(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    console.error(`[fileUtils] Error reading file ${filePath}:`, err);
    throw err;
  }
}

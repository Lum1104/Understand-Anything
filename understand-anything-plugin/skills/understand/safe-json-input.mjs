#!/usr/bin/env node
/**
 * Safe JSON input writer for Understand-Anything bundled scripts.
 *
 * Agents should import writeJsonInputFile() from this helper instead of using
 * shell heredocs for JSON. The helper rejects control characters/newlines in
 * graph IDs and file paths before writing the JSON file.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PATH_ARRAY_KEYS = new Set(['files', 'batchfiles', 'sourcefilepaths', 'filestoreanalyze']);
const PATH_MAP_KEYS = new Set(['batchimportdata', 'neighbormap', 'importmap']);
const PATH_KEYS = new Set(['path', 'filepath', 'resolvedpath']);
const ABSOLUTE_PATH_KEYS = new Set(['projectroot']);
const ID_KEYS = new Set(['id', 'source', 'target']);

export function hasControlCharacters(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

export function isSafeRelativePath(value) {
  if (typeof value !== 'string' || value.length === 0 || hasControlCharacters(value)) return false;
  const normalized = toPosix(value);
  if (normalized.startsWith('/') || /^[a-zA-Z]:\//.test(normalized)) return false;
  return normalized.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..');
}

export function isSafeGraphId(value) {
  return typeof value === 'string' && value.length > 0 && !hasControlCharacters(value);
}

function keyKind(key, parentKey) {
  const lower = String(key ?? '').toLowerCase();
  const parent = String(parentKey ?? '').toLowerCase();
  if (ABSOLUTE_PATH_KEYS.has(lower)) return 'absolute-path';
  if (PATH_KEYS.has(lower) || (PATH_ARRAY_KEYS.has(parent) && typeof key === 'number')) return 'path';
  if (ID_KEYS.has(lower) || lower.endsWith('id') || lower.endsWith('ids') || (parent.endsWith('ids') && typeof key === 'number')) return 'id';
  return 'string';
}

function validateString(value, path, kind) {
  if (hasControlCharacters(value)) {
    throw new Error(`${path} contains a control character/newline`);
  }
  if (kind === 'path' && !isSafeRelativePath(value)) {
    throw new Error(`${path} must be a safe project-relative path`);
  }
  if (kind === 'id' && !isSafeGraphId(value)) {
    throw new Error(`${path} must be a safe graph identifier`);
  }
}

export function validateJsonInputData(value, path = '$', key = '', parentKey = '') {
  if (typeof value === 'string') {
    validateString(value, path, keyKind(key, parentKey));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateJsonInputData(item, `${path}[${index}]`, index, key));
    return;
  }
  if (value && typeof value === 'object') {
    const isPathMap = PATH_MAP_KEYS.has(String(key ?? '').toLowerCase());
    for (const [childKey, childValue] of Object.entries(value)) {
      if (isPathMap) {
        validateString(childKey, `${path}.${childKey}`, 'path');
        if (typeof childValue === 'string') {
          validateString(childValue, `${path}.${childKey}`, 'path');
          continue;
        }
        if (Array.isArray(childValue)) {
          childValue.forEach((item, index) => {
            if (typeof item === 'string') {
              validateString(item, `${path}.${childKey}[${index}]`, 'path');
            } else {
              validateJsonInputData(item, `${path}.${childKey}[${index}]`, index, childKey);
            }
          });
          continue;
        }
      }
      validateJsonInputData(childValue, `${path}.${childKey}`, childKey, key);
    }
  }
}

function validateOutputPath(outputPath) {
  if (typeof outputPath !== 'string' || outputPath.length === 0) {
    throw new Error('outputPath is required');
  }
  if (hasControlCharacters(outputPath)) {
    throw new Error('outputPath contains a control character/newline');
  }
  if (!outputPath.endsWith('.json')) {
    throw new Error('outputPath must end with .json');
  }
  const normalized = normalize(outputPath);
  if (!isAbsolute(normalized) && (normalized === '..' || normalized.startsWith(`..${sep}`))) {
    throw new Error('outputPath must not traverse outside the working directory');
  }
}

export function writeJsonInputFile(outputPath, data) {
  validateOutputPath(outputPath);
  validateJsonInputData(data);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

async function main() {
  const [, , outputPath, payloadPath] = process.argv;
  if (!outputPath || !payloadPath) {
    process.stderr.write('Usage: node safe-json-input.mjs <output.json> <payload.json>\n');
    process.exit(1);
  }
  const payload = JSON.parse(readFileSync(payloadPath, 'utf-8'));
  writeJsonInputFile(outputPath, payload);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}

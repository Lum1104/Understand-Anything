import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  validateJsonInputData,
  writeJsonInputFile,
} from '../../../understand-anything-plugin/skills/understand/safe-json-input.mjs';

describe('safe-json-input.mjs', () => {
  it('writes valid JSON input files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ua-safe-json-'));
    try {
      const out = join(dir, 'input.json');
      writeJsonInputFile(out, {
        projectRoot: dir,
        batchFiles: [{ path: 'src/app.ts', language: 'typescript', sizeLines: 1, fileCategory: 'code' }],
        id: 'file:src/app.ts',
      });
      const parsed = JSON.parse(readFileSync(out, 'utf-8'));
      expect(parsed.batchFiles[0].path).toBe('src/app.ts');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects control characters and newlines in paths and IDs', () => {
    expect(() => validateJsonInputData({ batchFiles: [{ path: 'src/evil\nname.ts' }] })).toThrow(/control character|safe project-relative/);
    expect(() => validateJsonInputData({ id: 'file:src/app.ts\rmalicious' })).toThrow(/control character/);
    expect(() => validateJsonInputData({ sourceFilePaths: ['../secrets.env'] })).toThrow(/safe project-relative/);
  });

  it('rejects traversal in path map keys and values', () => {
    expect(() => validateJsonInputData({ batchImportData: { 'src/app.ts': ['../../secret.txt'] } })).toThrow(/safe project-relative/);
    expect(() => validateJsonInputData({ neighborMap: { '../outside.ts': ['src/app.ts'] } })).toThrow(/safe project-relative/);
    expect(() => validateJsonInputData({ importMap: { 'src/app.ts': '../secret.txt' } })).toThrow(/safe project-relative/);
    expect(() => validateJsonInputData({ importMap: { 'src/app.ts': ['src/util.ts'] } })).not.toThrow();
  });

  it('rejects output paths with control characters and non-json extensions', () => {
    expect(() => writeJsonInputFile('tmp/bad\ninput.json', {})).toThrow(/control character/);
    expect(() => writeJsonInputFile('tmp/input.txt', {})).toThrow(/\.json/);
  });
});

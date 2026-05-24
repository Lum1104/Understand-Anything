import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, 'extract-import-map.mjs');

/**
 * Helper: write a source tree from a `files` object: { 'a/b.ts': '...', ... }.
 * Creates parent dirs as needed. Returns the temp project root.
 */
function setupTree(files) {
  const root = mkdtempSync(join(tmpdir(), 'ua-eim-test-'));
  for (const [relPath, contents] of Object.entries(files)) {
    const abs = join(root, relPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, contents, 'utf-8');
  }
  return root;
}

/**
 * Run the extract-import-map.mjs script. Returns
 * { status, stdout, stderr, output } where `output` is the parsed JSON
 * written by the script (or null on failure to read).
 */
function runScript(projectRoot, input) {
  const inputPath = join(projectRoot, 'ua-eim-input.json');
  const outputPath = join(projectRoot, 'ua-eim-output.json');
  writeFileSync(inputPath, JSON.stringify(input), 'utf-8');
  const result = spawnSync('node', [SCRIPT, inputPath, outputPath], {
    encoding: 'utf-8',
  });
  let output = null;
  try {
    output = JSON.parse(readFileSync(outputPath, 'utf-8'));
  } catch {
    /* output missing on hard failure */
  }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, output };
}

describe('extract-import-map.mjs — TypeScript / JavaScript resolver', () => {
  let projectRoot;

  afterEach(() => {
    if (projectRoot) {
      rmSync(projectRoot, { recursive: true, force: true });
      projectRoot = null;
    }
  });

  it('resolves typescript relative imports with extension probes', () => {
    projectRoot = setupTree({
      'src/index.ts': `import { foo } from './utils';\nimport cfg from './config';\nfoo(cfg);\n`,
      'src/utils.ts': `export function foo(x: unknown) { return x; }\n`,
      'src/config.ts': `export default { debug: true };\n`,
      'README.md': '# project\n',
    });

    const result = runScript(projectRoot, {
      projectRoot,
      files: [
        { path: 'src/index.ts', language: 'typescript', fileCategory: 'code' },
        { path: 'src/utils.ts', language: 'typescript', fileCategory: 'code' },
        { path: 'src/config.ts', language: 'typescript', fileCategory: 'code' },
        { path: 'README.md', language: 'markdown', fileCategory: 'docs' },
      ],
    });

    expect(result.status).toBe(0);
    expect(result.output.scriptCompleted).toBe(true);
    expect(result.output.importMap['src/index.ts']).toEqual([
      'src/config.ts',
      'src/utils.ts',
    ]);
    expect(result.output.importMap['src/utils.ts']).toEqual([]);
    // Non-code file gets empty array
    expect(result.output.importMap['README.md']).toEqual([]);

    expect(result.output.stats.filesScanned).toBe(4);
    expect(result.output.stats.filesWithImports).toBe(1);
    expect(result.output.stats.totalEdges).toBe(2);
  });

  it('resolves tsconfig paths aliases', () => {
    projectRoot = setupTree({
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@/*': ['src/*'],
            '~lib/*': ['src/lib/*'],
          },
        },
      }),
      'src/index.ts': `import { greet } from '@/utils/greet';\nimport { add } from '~lib/math';\n`,
      'src/utils/greet.ts': `export function greet(name: string) { return 'hi ' + name; }\n`,
      'src/lib/math.ts': `export const add = (a: number, b: number) => a + b;\n`,
    });

    const result = runScript(projectRoot, {
      projectRoot,
      files: [
        { path: 'tsconfig.json', language: 'json', fileCategory: 'config' },
        { path: 'src/index.ts', language: 'typescript', fileCategory: 'code' },
        { path: 'src/utils/greet.ts', language: 'typescript', fileCategory: 'code' },
        { path: 'src/lib/math.ts', language: 'typescript', fileCategory: 'code' },
      ],
    });

    expect(result.status).toBe(0);
    expect(result.output.importMap['src/index.ts']).toEqual([
      'src/lib/math.ts',
      'src/utils/greet.ts',
    ]);
  });

  it('resolves /index.ts barrel imports', () => {
    projectRoot = setupTree({
      'src/index.ts': `import { thing } from './stuff';\n`,
      'src/stuff/index.ts': `export const thing = 1;\n`,
    });

    const result = runScript(projectRoot, {
      projectRoot,
      files: [
        { path: 'src/index.ts', language: 'typescript', fileCategory: 'code' },
        { path: 'src/stuff/index.ts', language: 'typescript', fileCategory: 'code' },
      ],
    });

    expect(result.status).toBe(0);
    expect(result.output.importMap['src/index.ts']).toEqual(['src/stuff/index.ts']);
  });

  it('drops external package imports', () => {
    projectRoot = setupTree({
      'src/index.ts': `import express from 'express';\nimport { z } from 'zod';\nimport { foo } from './local';\n`,
      'src/local.ts': `export const foo = 1;\n`,
    });

    const result = runScript(projectRoot, {
      projectRoot,
      files: [
        { path: 'src/index.ts', language: 'typescript', fileCategory: 'code' },
        { path: 'src/local.ts', language: 'typescript', fileCategory: 'code' },
      ],
    });

    expect(result.status).toBe(0);
    // Only the local import survives; express/zod are external.
    expect(result.output.importMap['src/index.ts']).toEqual(['src/local.ts']);
  });

  it('resolves javascript require() calls', () => {
    projectRoot = setupTree({
      'src/index.js': `const cfg = require('./config');\nconst utils = require('../shared/utils');\n`,
      'src/config.js': `module.exports = { x: 1 };\n`,
      'shared/utils.js': `module.exports = { y: 2 };\n`,
    });

    const result = runScript(projectRoot, {
      projectRoot,
      files: [
        { path: 'src/index.js', language: 'javascript', fileCategory: 'code' },
        { path: 'src/config.js', language: 'javascript', fileCategory: 'code' },
        { path: 'shared/utils.js', language: 'javascript', fileCategory: 'code' },
      ],
    });

    expect(result.status).toBe(0);
    expect(result.output.importMap['src/index.js']).toEqual([
      'shared/utils.js',
      'src/config.js',
    ]);
  });
});

describe('extract-import-map.mjs — output schema invariants', () => {
  let projectRoot;

  afterEach(() => {
    if (projectRoot) {
      rmSync(projectRoot, { recursive: true, force: true });
      projectRoot = null;
    }
  });

  it('every input file appears in importMap (even with zero imports)', () => {
    projectRoot = setupTree({
      'a.ts': `// no imports\nexport const a = 1;\n`,
      'README.md': '# x\n',
      'Dockerfile': 'FROM node:22\n',
      'package.json': '{}\n',
    });

    const result = runScript(projectRoot, {
      projectRoot,
      files: [
        { path: 'a.ts', language: 'typescript', fileCategory: 'code' },
        { path: 'README.md', language: 'markdown', fileCategory: 'docs' },
        { path: 'Dockerfile', language: 'dockerfile', fileCategory: 'infra' },
        { path: 'package.json', language: 'json', fileCategory: 'config' },
      ],
    });

    expect(result.status).toBe(0);
    expect(Object.keys(result.output.importMap).sort()).toEqual([
      'Dockerfile', 'README.md', 'a.ts', 'package.json',
    ]);
    for (const arr of Object.values(result.output.importMap)) {
      expect(Array.isArray(arr)).toBe(true);
    }
  });

  it('produces deterministic output across runs', () => {
    projectRoot = setupTree({
      'src/a.ts': `import { b } from './b';\nimport { c } from './c';\n`,
      'src/b.ts': `export const b = 1;\n`,
      'src/c.ts': `export const c = 2;\n`,
    });

    const input = {
      projectRoot,
      files: [
        { path: 'src/a.ts', language: 'typescript', fileCategory: 'code' },
        { path: 'src/b.ts', language: 'typescript', fileCategory: 'code' },
        { path: 'src/c.ts', language: 'typescript', fileCategory: 'code' },
      ],
    };

    const r1 = runScript(projectRoot, input);
    const r2 = runScript(projectRoot, input);
    expect(r1.status).toBe(0);
    expect(r2.status).toBe(0);
    expect(JSON.stringify(r1.output)).toBe(JSON.stringify(r2.output));
  });
});

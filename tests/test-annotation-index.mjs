/**
 * test-annotation-index.mjs — unit tests for extract-annotation-index.mjs
 *
 * Run: node tests/test-annotation-index.mjs
 * Exit 0 = all pass, Exit 1 = failure
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

const SCRIPT = path.resolve('understand-anything-plugin/skills/understand/extract-annotation-index.mjs');
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function makeTempProject() {
  const dir = fs.mkdtempSync(path.join(tmpdir(), 'ua-annot-test-'));
  const understandDir = path.join(dir, '.understand-anything', 'intermediate');
  fs.mkdirSync(understandDir, { recursive: true });
  return dir;
}

function writePatterns(projectDir, patterns) {
  const configDir = path.join(projectDir, '.understand-anything');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'annotation-patterns.json'),
    JSON.stringify({ patterns })
  );
}

function readIndex(projectDir) {
  const indexPath = path.join(projectDir, '.understand-anything', 'intermediate', 'annotation-index.json');
  return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
}

function run(projectDir, extraArgs = '') {
  execSync(`node ${SCRIPT} --project-dir ${projectDir} ${extraArgs}`, { stdio: 'pipe' });
}

// --- Test 1: Basic extraction ---
console.log('\nTest 1: Basic extraction of RULE/BCP/PRD IDs');
{
  const dir = makeTempProject();
  fs.writeFileSync(path.join(dir, 'agent.py'), `
# enforces RULE-023
# implements BCP-REL-307
class Agent:
    """Born from PRD-2990."""
    pass
`);
  fs.writeFileSync(path.join(dir, 'util.py'), `
# No annotations here
def helper(): pass
`);
  writePatterns(dir, [
    { name: 'rule-ref', regex: 'RULE-\\d+', edge_type: 'enforces-rule' },
    { name: 'bcp-ref', regex: 'BCP-[A-Z]+-\\d+', edge_type: 'implements-bcp' },
    { name: 'prd-ref', regex: 'PRD-\\d+', edge_type: 'born-from-prd' },
  ]);
  run(dir);
  const index = readIndex(dir);
  assert('agent.py' in index, 'agent.py appears in index');
  assert(!('util.py' in index), 'util.py (no annotations) absent from index');
  assert(index['agent.py'].includes('RULE-023'), 'RULE-023 extracted');
  assert(index['agent.py'].includes('BCP-REL-307'), 'BCP-REL-307 extracted');
  assert(index['agent.py'].includes('PRD-2990'), 'PRD-2990 extracted');
  assert(index['agent.py'].length === 3, 'exactly 3 annotations in agent.py');
}

// --- Test 2: No pattern file → empty index ---
console.log('\nTest 2: No pattern file produces empty index');
{
  const dir = makeTempProject();
  fs.writeFileSync(path.join(dir, 'foo.py'), '# RULE-001 referenced here');
  // No annotation-patterns.json written
  run(dir);
  const index = readIndex(dir);
  assert(Object.keys(index).length === 0, 'index is empty when no pattern file');
}

// --- Test 3: Deduplication ---
console.log('\nTest 3: Duplicate annotation IDs are deduplicated');
{
  const dir = makeTempProject();
  fs.writeFileSync(path.join(dir, 'dup.py'), `
# RULE-023 is mentioned here
# RULE-023 is mentioned again
# RULE-023 appears a third time
`);
  writePatterns(dir, [
    { name: 'rule-ref', regex: 'RULE-\\d+', edge_type: 'enforces-rule' },
  ]);
  run(dir);
  const index = readIndex(dir);
  assert(index['dup.py'].length === 1, 'RULE-023 appears exactly once (deduplicated)');
}

// --- Test 4: Multiple files ---
console.log('\nTest 4: Multiple files each get their own annotations');
{
  const dir = makeTempProject();
  fs.writeFileSync(path.join(dir, 'a.py'), '# RULE-001');
  fs.writeFileSync(path.join(dir, 'b.py'), '# RULE-002');
  fs.writeFileSync(path.join(dir, 'c.py'), '# no match');
  writePatterns(dir, [
    { name: 'rule-ref', regex: 'RULE-\\d+', edge_type: 'enforces-rule' },
  ]);
  run(dir);
  const index = readIndex(dir);
  assert(index['a.py']?.includes('RULE-001'), 'a.py has RULE-001');
  assert(index['b.py']?.includes('RULE-002'), 'b.py has RULE-002');
  assert(!('c.py' in index), 'c.py absent (no match)');
}

// --- Test 5: --help exits 0 ---
console.log('\nTest 5: --help exits cleanly');
{
  try {
    execSync(`node ${SCRIPT} --help`, { stdio: 'pipe' });
    assert(true, '--help exits 0');
  } catch {
    assert(false, '--help exits 0');
  }
}

// --- Summary ---
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

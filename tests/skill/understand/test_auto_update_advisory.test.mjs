import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../../understand-anything-plugin');

describe('auto-update hook advisory mode', () => {
  it('does not force agents to execute hook instructions without confirmation', () => {
    const hooks = readFileSync(join(ROOT, 'hooks/hooks.json'), 'utf-8');
    expect(hooks).not.toMatch(/MUST read|execute its instructions|Do not ask/i);
    expect(hooks).toContain('advisory');
    expect(hooks).toContain('dry-run');
    expect(hooks).toContain('approval');
  });

  it('documents dry-run only behavior before writes', () => {
    const prompt = readFileSync(join(ROOT, 'hooks/auto-update-prompt.md'), 'utf-8');
    expect(prompt).toContain('Dry-Run Only');
    expect(prompt).toContain('explicit user approval');
    expect(prompt).toContain('## Approval Gate');
    expect(prompt).not.toMatch(/ALWAYS save partial results|Do not ask the user/i);

    const beforeGate = prompt.split('## Approval Gate')[0];
    expect(beforeGate).not.toMatch(/^\s*\d+\.\s*(Write|Create|Dispatch|Update|Remove|Delete)\b/mi);
    expect(beforeGate).toMatch(/do \*\*not\*\* modify files/i);
  });
});

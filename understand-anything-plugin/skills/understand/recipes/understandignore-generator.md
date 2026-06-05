# Recipe: Generate `.understandignore` Starter File

> One-shot Node.js script that synthesizes a starter `.understandignore` from `.gitignore` and detected directories. Referenced from `SKILL.md` Phase 0.5 step 2 (If `.understandignore` does not exist, generate a starter file).

Run the following Node.js one-liner in `$PROJECT_ROOT` (reads `.gitignore` and deduplicates against built-in defaults):

```bash
node -e "
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const defaults = ['node_modules/','node_modules','.git/','vendor/','venv/','.venv/','__pycache__/','dist/','dist','build/','build','out/','coverage/','coverage','.next/','.cache/','.turbo/','target/','obj/','*.lock','package-lock.json','yarn.lock','pnpm-lock.yaml','*.png','*.jpg','*.jpeg','*.gif','*.svg','*.ico','*.woff','*.woff2','*.ttf','*.eot','*.mp3','*.mp4','*.pdf','*.zip','*.tar','*.gz','*.min.js','*.min.css','*.map','*.generated.*','.idea/','.vscode/','LICENSE','.gitignore','.editorconfig','.prettierrc','.eslintrc*','*.log'];
const norm = p => p.replace(/\/+$/, '');
const defaultSet = new Set(defaults.map(norm));
const header = '# .understandignore — patterns for files/dirs to exclude from analysis\n# Syntax: same as .gitignore (globs, # comments, ! negation, trailing / for dirs)\n# Lines below are suggestions — uncomment to activate.\n# Use ! prefix to force-include something excluded by defaults.\n#\n# Built-in defaults (always excluded unless negated):\n#   node_modules/, .git/, dist/, build/, obj/, *.lock, *.min.js, etc.\n#\n';
let body = '';
const gitignorePath = path.join(root, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gi = fs.readFileSync(gitignorePath, 'utf-8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).filter(p => !defaultSet.has(norm(p)));
  if (gi.length) { body += '# --- From .gitignore (uncomment to exclude) ---\n\n' + gi.map(p => '# ' + p).join('\n') + '\n\n'; }
}
const dirs = ['__tests__','test','tests','fixtures','testdata','docs','examples','scripts','migrations','.storybook'];
const found = dirs.filter(d => fs.existsSync(path.join(root, d)));
if (found.length) { body += '# --- Detected directories (uncomment to exclude) ---\n\n' + found.map(d => '# ' + d + '/').join('\n') + '\n\n'; }
body += '# --- Test file patterns (uncomment to exclude) ---\n\n# *.test.*\n# *.spec.*\n# *.snap\n';
const outDir = path.join(root, '.understand-anything');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, '.understandignore'), header + body);
"
```

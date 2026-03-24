# Installing Understand-Anything for Gemini CLI

## Prerequisites

- Git
- [Gemini CLI](https://geminicli.com/)

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Lum1104/Understand-Anything.git ~/.gemini-cli-plugins/understand-anything
   ```

2. **Create the skills symlinks:**
   ```bash
   mkdir -p ~/.agents/skills
   for skill in understand understand-chat understand-dashboard understand-diff understand-explain understand-onboard; do
     ln -sf ~/.gemini-cli-plugins/understand-anything/understand-anything-plugin/skills/$skill ~/.agents/skills/$skill
   done
   # Universal plugin root symlink — lets the dashboard skill find packages/dashboard/
   [ -e ~/.understand-anything-plugin ] || [ -L ~/.understand-anything-plugin ] || ln -s ~/.gemini-cli-plugins/understand-anything/understand-anything-plugin ~/.understand-anything-plugin
   ```

   **Windows (PowerShell):**
   ```powershell
   New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills"
   $skills = @("understand","understand-chat","understand-dashboard","understand-diff","understand-explain","understand-onboard")
   foreach ($skill in $skills) {
     cmd /c mklink /J "$env:USERPROFILE\.agents\skills\$skill" "$env:USERPROFILE\.gemini-cli-plugins\understand-anything\understand-anything-plugin\skills\$skill"
   }
   # Universal plugin root symlink
   cmd /c mklink /J "$env:USERPROFILE\.understand-anything-plugin" "$env:USERPROFILE\.gemini-cli-plugins\understand-anything\understand-anything-plugin"
   ```

3. **Restart Gemini CLI** to discover the skills.

## Verify

```bash
ls -la ~/.agents/skills/ | grep understand
```

You should see symlinks for each skill pointing into the cloned repository. Run `/skills list` in Gemini CLI to see available skills.

## Usage

Skills activate automatically when relevant. You can also invoke directly:
- "Analyze this codebase and build a knowledge graph"
- "Help me understand this project's architecture"

## Updating

```bash
cd ~/.gemini-cli-plugins/understand-anything && git pull
```

Skills update instantly.

## Uninstalling

```bash
for skill in understand understand-chat understand-dashboard understand-diff understand-explain understand-onboard; do
  rm -f ~/.agents/skills/$skill
done
rm ~/.understand-anything-plugin
rm -rf ~/.gemini-cli-plugins/understand-anything
```

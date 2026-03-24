# Installing Understand-Anything for Gemini CLI

## Prerequisites

- Git
- [Gemini CLI](https://geminicli.com/)

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Lum1104/Understand-Anything.git ~/.gemini-cli-plugins/understand-anything
   ```

2. **Link the extension:**
   ```bash
   cd ~/.gemini-cli-plugins/understand-anything/understand-anything-plugin
   gemini extensions link .
   ```

3. **Restart Gemini CLI** to discover the extension and skills.

## Verify

You can verify the installation by checking your linked extensions in the Gemini CLI or simply running a skill command.

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
cd ~/.gemini-cli-plugins/understand-anything/understand-anything-plugin
gemini extensions unlink .
rm -rf ~/.gemini-cli-plugins/understand-anything
```

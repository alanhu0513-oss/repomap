# repomap

A CLI tool to generate compact codebase maps optimized for LLMs. Get a bird's-eye view of your repository structure, key files, and stats in a format perfect for pasting into Claude, ChatGPT, Cursor, or other AI assistants.

## Features

- **Compact file tree** - Respects `.gitignore` and skips common build artifacts
- **Key files preview** - Automatically highlights and previews important files (package.json, README, entry points)
- **LLM-friendly format** - Clean markdown output optimized for context windows
- **Fast & simple** - Built with Node.js and TypeScript
- **Customizable** - Control depth, include/exclude patterns

## Installation

```bash
npm install -g repomap
```

Or run directly with npx:

```bash
npx repomap
```

## Usage

```bash
# Generate repomap for current directory
repomap

# Generate for a specific path
repomap --path ./my-project

# Save to file
repomap --output repomap.md

# Limit tree depth
repomap --max-depth 3

# Include only specific patterns
repomap --include "src/**/*.ts,*.json"

# Exclude patterns
repomap --exclude "tests/**,*.test.ts"
```

## Why repomap?

When working with LLMs on large codebases, you need to provide enough context without blowing the token limit. repomap gives AI assistants the perfect overview - structure, key files, and enough detail to understand the project without dumping everything.

## Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/repomap.git
cd repomap

# Install dependencies
npm install

# Run in development
npm run dev

# Build
npm run build

# Run built version
npm start
```

## License

MIT

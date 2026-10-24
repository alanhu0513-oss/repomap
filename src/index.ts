#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { globby } from 'globby';
import ignore from 'ignore';
import { extractSymbols } from './parser.js';

const program = new Command();

program
  .name('repomap')
  .description('Generate compact codebase maps optimized for LLMs')
  .version('0.1.0')
  .option('-p, --path <path>', 'Path to repository', process.cwd())
  .option('-o, --output <file>', 'Output file (defaults to stdout)')
  .option('--max-depth <n>', 'Max depth for tree view', '4')
  .option('--include <patterns>', 'Comma-separated patterns to include')
  .option('--exclude <patterns>', 'Comma-separated patterns to exclude')
  .option('--symbols', 'Extract and show symbols (functions, classes, exports)')
  .option('--model <model>', 'Optimize for specific model (gpt-4, claude, gemini)', 'claude')
  .action(async (options) => {
    try {
      const repoPath = path.resolve(options.path);
      await generateRepomap(repoPath, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

async function generateRepomap(repoPath: string, options: any) {
  const ig = ignore();
  
  ig.add([
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    '*.lock',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '*.min.js',
    '*.map'
  ]);
  
  const gitignorePath = path.join(repoPath, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    ig.add(gitignoreContent);
  }
  
  const patterns = options.include 
    ? options.include.split(',').map((p: string) => p.trim())
    : ['**/*'];
  
  const excludePatterns = options.exclude
    ? options.exclude.split(',').map((p: string) => p.trim())
    : [];
  
  const files = await globby(patterns, {
    cwd: repoPath,
    dot: false,
    onlyFiles: true,
    ignore: excludePatterns
  });
  
  const filteredFiles = files.filter(f => !ig.ignores(f));
  
  let output = `# Repomap: ${path.basename(repoPath)}\n\n`;
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `Optimized for: ${options.model}\n\n`;
  
  output += `## File Tree\n\n\`\`\`\n`;
  output += generateTree(filteredFiles, parseInt(options.maxDepth));
  output += `\`\`\`\n\n`;
  
  if (options.symbols) {
    output += `## Symbols\n\n`;
    const jsFiles = filteredFiles.filter(f => 
      /\.(js|jsx|ts|tsx)$/.test(f) && 
      !f.includes('node_modules') && 
      !f.includes('dist/')
    ).slice(0, 30);
    
    for (const file of jsFiles) {
      try {
        const symbols = extractSymbols(path.join(repoPath, file));
        if (symbols.length > 0) {
          output += `### ${file}\n`;
          symbols.forEach(s => {
            output += `- \`${s.type}\` **${s.name}** (line ${s.line})\n`;
          });
          output += '\n';
        }
      } catch (e) {
        // skip
      }
    }
  }
  
  output += `## Key Files\n\n`;
  const keyFiles = filteredFiles.filter(f => 
    f.match(/^(package\.json|README\.md|tsconfig\.json|pyproject\.toml|Cargo\.toml|go\.mod|src\/index\.(ts|js|tsx|jsx)|src\/main\.(ts|js|tsx|jsx))$/i)
  ).slice(0, 15);
  
  for (const file of keyFiles) {
    try {
      const content = fs.readFileSync(path.join(repoPath, file), 'utf-8');
      const maxLines = options.model === 'gpt-4' ? 40 : 30;
      const preview = content.split('\n').slice(0, maxLines).join('\n');
      output += `### ${file}\n\n\`\`\`\n${preview}\n${content.split('\n').length > maxLines ? '\n... (truncated)\n' : ''}\`\`\`\n\n`;
    } catch (e) {
      output += `### ${file}\n\n*(unable to read)*\n\n`;
    }
  }
  
  output += `## Stats\n\n`;
  output += `- Total files: ${filteredFiles.length}\n`;
  output += `- Extensions: ${getExtensionStats(filteredFiles)}\n`;
  
  const totalSize = estimateTokens(filteredFiles, repoPath);
  output += `- Estimated tokens: ~${totalSize}\n\n`;
  
  if (options.output) {
    fs.writeFileSync(options.output, output);
    console.log(chalk.green(`Repomap written to ${options.output}`));
  } else {
    console.log(output);
  }
}

function generateTree(files: string[], maxDepth: number): string {
  const tree: any = {};
  for (const file of files) {
    const parts = file.split('/');
    if (parts.length > maxDepth) continue;
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = i === parts.length - 1 ? null : {};
      }
      current = current[part];
    }
  }
  return renderTree(tree, '');
}

function renderTree(obj: any, prefix: string): string {
  let result = '';
  const entries = Object.keys(obj).sort();
  entries.forEach((key, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    result += prefix + connector + key + '\n';
    if (obj[key] !== null) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      result += renderTree(obj[key], newPrefix);
    }
  });
  return result;
}

function getExtensionStats(files: string[]): string {
  const extCount: Record<string, number> = {};
  for (const file of files) {
    const ext = path.extname(file).toLowerCase() || '(no ext)';
    extCount[ext] = (extCount[ext] || 0) + 1;
  }
  const sorted = Object.entries(extCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return sorted.map(([ext, count]) => `${ext}(${count})`).join(', ');
}

function estimateTokens(files: string[], repoPath: string): number {
  let totalChars = 0;
  for (const file of files.slice(0, 50)) {
    try {
      const content = fs.readFileSync(path.join(repoPath, file), 'utf-8');
      totalChars += content.length;
    } catch (e) {}
  }
  return Math.round((totalChars / 4) * 1.3); // rough estimate
}

program.parse();

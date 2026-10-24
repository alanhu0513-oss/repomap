import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export interface Symbol {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'export' | 'variable';
  line: number;
}

export function extractSymbols(filePath: string): Symbol[] {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf-8');
  const symbols: Symbol[] = [];
  
  if (ext === '.js' || ext === '.jsx' || ext === '.ts' || ext === '.tsx') {
    try {
      const ast = parse(content, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy'
        ] as any
      });
      
      traverse(ast as any, {
        FunctionDeclaration(path: any) {
          if (path.node.id?.name) {
            symbols.push({
              name: path.node.id.name,
              type: 'function',
              line: path.node.loc?.start.line || 0
            });
          }
        },
        ArrowFunctionExpression(path: any) {
          const parent = path.parent;
          if (parent.type === 'VariableDeclarator' && parent.id?.name) {
            symbols.push({
              name: parent.id.name,
              type: 'function',
              line: path.node.loc?.start.line || 0
            });
          }
        },
        FunctionExpression(path: any) {
          const parent = path.parent;
          if (parent.type === 'VariableDeclarator' && parent.id?.name) {
            symbols.push({
              name: parent.id.name,
              type: 'function',
              line: path.node.loc?.start.line || 0
            });
          } else if (path.node.id?.name) {
            symbols.push({
              name: path.node.id.name,
              type: 'function',
              line: path.node.loc?.start.line || 0
            });
          }
        },
        ClassDeclaration(path: any) {
          if (path.node.id?.name) {
            symbols.push({
              name: path.node.id.name,
              type: 'class',
              line: path.node.loc?.start.line || 0
            });
          }
        },
        TSInterfaceDeclaration(path: any) {
          if (path.node.id?.name) {
            symbols.push({
              name: path.node.id.name,
              type: 'interface',
              line: path.node.loc?.start.line || 0
            });
          }
        },
        TSTypeAliasDeclaration(path: any) {
          if (path.node.id?.name) {
            symbols.push({
              name: path.node.id.name,
              type: 'type',
              line: path.node.loc?.start.line || 0
            });
          }
        },
        ExportNamedDeclaration(path: any) {
          if (path.node.declaration) {
            const decl = path.node.declaration;
            if (decl.id?.name) {
              symbols.push({
                name: decl.id.name,
                type: 'export',
                line: path.node.loc?.start.line || 0
              });
            } else if (decl.declarations) {
              decl.declarations.forEach((d: any) => {
                if (d.id?.name) {
                  symbols.push({
                    name: d.id.name,
                    type: 'export',
                    line: path.node.loc?.start.line || 0
                  });
                }
              });
            }
          }
        },
        ExportDefaultDeclaration(path: any) {
          symbols.push({
            name: 'default',
            type: 'export',
            line: path.node.loc?.start.line || 0
          });
        }
      });
    } catch (e) {
      // Skip files that can't be parsed
    }
  }
  
  return symbols;
}

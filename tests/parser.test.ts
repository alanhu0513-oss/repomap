import { describe, it, expect } from 'vitest';
import { extractSymbols } from '../src/parser';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('extractSymbols', () => {
  it('extracts function declarations', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repomap-test-'));
    const testFile = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(testFile, `
      export function hello() {
        return 'world';
      }
      
      function privateFunc() {
        return 42;
      }
    `);
    
    const symbols = extractSymbols(testFile);
    expect(symbols.some(s => s.name === 'hello' && s.type === 'function')).toBe(true);
    expect(symbols.some(s => s.name === 'privateFunc' && s.type === 'function')).toBe(true);
    
    fs.unlinkSync(testFile);
    fs.rmdirSync(tmpDir);
  });
  
  it('extracts class declarations', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repomap-test-'));
    const testFile = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(testFile, `
      export class MyClass {
        method() {}
      }
    `);
    
    const symbols = extractSymbols(testFile);
    expect(symbols.some(s => s.name === 'MyClass' && s.type === 'class')).toBe(true);
    
    fs.unlinkSync(testFile);
    fs.rmdirSync(tmpDir);
  });
  
  it('extracts interfaces', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repomap-test-'));
    const testFile = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(testFile, `
      export interface User {
        name: string;
        age: number;
      }
    `);
    
    const symbols = extractSymbols(testFile);
    expect(symbols.some(s => s.name === 'User' && s.type === 'interface')).toBe(true);
    
    fs.unlinkSync(testFile);
    fs.rmdirSync(tmpDir);
  });
});

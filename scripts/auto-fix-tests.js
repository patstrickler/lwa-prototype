#!/usr/bin/env node
/**
 * Auto-fix script for common test issues
 * Attempts to automatically fix common problems that cause test failures
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Fixes missing .js extensions in ES module imports
 */
function fixImportExtensions(filePath) {
    try {
        let content = readFileSync(filePath, 'utf8');
        let modified = false;
        
        // Fix import statements missing .js extension
        const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        content = content.replace(importRegex, (match, importPath) => {
            // Skip if already has extension or is a package import
            if (importPath.includes('.js') || importPath.startsWith('http') || !importPath.startsWith('.')) {
                return match;
            }
            
            // Add .js extension if missing
            const newPath = importPath + '.js';
            modified = true;
            return match.replace(importPath, newPath);
        });
        
        // Fix require statements in test files
        const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
        content = content.replace(requireRegex, (match, requirePath) => {
            if (requirePath.includes('.js') || requirePath.startsWith('http') || !requirePath.startsWith('.')) {
                return match;
            }
            const newPath = requirePath + '.js';
            modified = true;
            return match.replace(requirePath, newPath);
        });
        
        if (modified) {
            writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Fixed import extensions in ${filePath}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`❌ Error fixing ${filePath}:`, error.message);
        return false;
    }
}

/**
 * Fixes common syntax errors
 */
function fixSyntaxErrors(filePath) {
    try {
        let content = readFileSync(filePath, 'utf8');
        let modified = false;
        
        // Fix missing semicolons in certain contexts
        const lines = content.split('\n');
        const fixedLines = lines.map((line, index) => {
            const trimmed = line.trim();
            // Add semicolon to lines that look like statements but are missing them
            if (trimmed && 
                !trimmed.endsWith(';') && 
                !trimmed.endsWith('{') && 
                !trimmed.endsWith('}') &&
                !trimmed.startsWith('//') &&
                !trimmed.startsWith('/*') &&
                !trimmed.startsWith('*') &&
                !trimmed.startsWith('import') &&
                !trimmed.startsWith('export') &&
                !trimmed.includes('function') &&
                !trimmed.includes('if') &&
                !trimmed.includes('for') &&
                !trimmed.includes('while') &&
                !trimmed.includes('switch') &&
                !trimmed.includes('try') &&
                !trimmed.includes('catch') &&
                trimmed.length > 0 &&
                !trimmed.match(/^[})];?\s*$/)) {
                // This is too aggressive, let's skip it
                return line;
            }
            return line;
        });
        
        const newContent = fixedLines.join('\n');
        if (newContent !== content) {
            modified = true;
            content = newContent;
        }
        
        if (modified) {
            writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Fixed syntax issues in ${filePath}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`❌ Error fixing syntax in ${filePath}:`, error.message);
        return false;
    }
}

/**
 * Recursively processes all JavaScript files in a directory
 */
function processDirectory(dirPath, extensions = ['.js']) {
    let filesFixed = 0;
    
    try {
        const entries = readdirSync(dirPath);
        
        for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            const stat = statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Skip node_modules and other common directories
                if (['node_modules', '.git', 'coverage', 'dist', 'build'].includes(entry)) {
                    continue;
                }
                filesFixed += processDirectory(fullPath, extensions);
            } else if (stat.isFile()) {
                const ext = entry.substring(entry.lastIndexOf('.'));
                if (extensions.includes(ext)) {
                    if (fixImportExtensions(fullPath)) {
                        filesFixed++;
                    }
                    // Only fix syntax in test files to be safe
                    if (fullPath.includes('__tests__') || fullPath.includes('.test.')) {
                        if (fixSyntaxErrors(fullPath)) {
                            filesFixed++;
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error(`❌ Error processing directory ${dirPath}:`, error.message);
    }
    
    return filesFixed;
}

/**
 * Main function
 */
function main() {
    console.log('🔧 Auto-fixing common test issues...\n');
    
    const testDir = join(projectRoot, '__tests__');
    const componentsDir = join(projectRoot, 'components');
    const utilsDir = join(projectRoot, 'utils');
    const dataDir = join(projectRoot, 'data');
    
    let totalFixed = 0;
    
    if (statSync(testDir).isDirectory()) {
        totalFixed += processDirectory(testDir);
    }
    
    // Also check source files for import issues
    [componentsDir, utilsDir, dataDir].forEach(dir => {
        if (statSync(dir).isDirectory()) {
            totalFixed += processDirectory(dir);
        }
    });
    
    console.log(`\n✅ Auto-fix complete. Fixed ${totalFixed} file(s).`);
    return totalFixed > 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { fixImportExtensions, fixSyntaxErrors, processDirectory };








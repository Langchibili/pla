// const fs = require('fs');
// const path = require('path');
// const { promisify } = require('util');

// // Promisify fs functions for async/await usage
// const readdir = promisify(fs.readdir);
// const stat = promisify(fs.stat);
// const readFile = promisify(fs.readFile);
// const writeFile = promisify(fs.writeFile);

// // ============================================
// // CONFIGURATION - Customize these as needed
// // ============================================

// // Directories to ignore (by name - anywhere in the tree)
// const IGNORED_DIRECTORIES = [
//     'node_modules',
//     '.git',
//     '.vscode',
//     '.idea',
//     'dist',
//     'build',
//     'public',
//     'coverage',
//     '.next',
//     '.strapi',
//     '.nuxt',
//     '.cache',
//     '.DS_Store'
// ];

// // Specific directory paths to ignore (relative to root)
// const IGNORED_DIRECTORY_PATHS = [
//     'app/(auth)',
//     'components/Map',
//     'components/Rider',
//     'lib/api',
//     'app/(main)',
//     'app/finding-driver',
//     'app/trip-summary'
// ];

// // Files to ignore (by filename - anywhere in the tree)
// const IGNORED_FILES = [
//     'package-lock.json',
//     'yarn.lock',
//     'pnpm-lock.yaml',
//     '.gitignore',
//     '.env',
//     '.env.local',
//     '.env.development',
//     '.env.production',
//     'code.txt',
//     'code.min.txt',
//     'Thumbs.db',
//     'desktop.ini',
//     'collect-code.js'  // This script itself
// ];

// // Specific file paths to ignore (relative to root)
// const IGNORED_FILE_PATHS = [
//     'lib/hooks/useAuth.js',
//     'lib/hooks/useRide.js',
//     'app/page.js'
// ];

// // File extensions to ignore
// const IGNORED_FILE_EXTENSIONS = [
//     '.log', '.tmp', '.temp', '.bak', '.swp', '.swo',
//     '.pid', '.seed', '.pem', '.cert', '.key',
//     '.zip', '.rar', '.7z', '.gz', '.tar',
//     '.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg',
//     '.mp3', '.mp4', '.avi', '.mov', '.wmv',
//     '.exe', '.dll', '.so', '.dylib',
//     '.pdf', '.doc', '.docx', '.xls', '.xlsx'
// ];

// // Custom ignored items - Add your own here
// const CUSTOM_IGNORED_FILES = [
//     // 'secrets.json',
//     // 'private.key'
// ];

// const CUSTOM_IGNORED_PATHS = [
//     // 'app/specific-folder/specific-file.js'
// ];

// // Combine all ignored files
// const ALL_IGNORED_FILES = [...IGNORED_FILES, ...CUSTOM_IGNORED_FILES];
// const ALL_IGNORED_FILE_PATHS = [...IGNORED_FILE_PATHS, ...CUSTOM_IGNORED_PATHS];

// // Output file configuration
// const OUTPUT_FILE = path.join(process.cwd(), 'code.txt');
// const OUTPUT_MIN_FILE = path.join(process.cwd(), 'code.min.txt');

// // Statistics tracking
// let stats = {
//     processed: 0,
//     skipped: 0,
//     errors: 0
// };

// // ============================================
// // HELPER FUNCTIONS
// // ============================================

// /**
//  * Get normalized relative path from root directory
//  */
// function getRelativePath(filePath) {
//     const relative = path.relative(process.cwd(), filePath);
//     return relative ? relative.replace(/\\/g, '/') : '.';
// }

// /**
//  * Check if a directory should be ignored
//  */
// function shouldIgnoreDirectory(dirPath) {
//     const relativePath = getRelativePath(dirPath);
//     const dirName = path.basename(dirPath);

//     // Check by directory name (global)
//     if (IGNORED_DIRECTORIES.includes(dirName)) {
//         return true;
//     }

//     // Check exact directory path
//     if (IGNORED_DIRECTORY_PATHS.includes(relativePath)) {
//         return true;
//     }

//     return false;
// }

// /**
//  * Check if a file should be ignored
//  */
// function shouldIgnoreFile(fileName, filePath) {
//     const relativePath = getRelativePath(filePath);
//     const ext = path.extname(fileName).toLowerCase();

//     // Check by filename
//     if (ALL_IGNORED_FILES.includes(fileName)) {
//         return true;
//     }

//     // Check by extension
//     if (IGNORED_FILE_EXTENSIONS.includes(ext)) {
//         return true;
//     }

//     // Check exact file path
//     if (ALL_IGNORED_FILE_PATHS.includes(relativePath)) {
//         return true;
//     }

//     // Check if file is in an ignored directory
//     const fileDir = path.dirname(relativePath);
//     if (IGNORED_DIRECTORY_PATHS.includes(fileDir)) {
//         return true;
//     }

//     // Check hidden files (except allowed ones)
//     if (fileName.startsWith('.') && !fileName.startsWith('.env')) {
//         const allowedHidden = ['.eslintrc', '.prettierrc', '.babelrc', '.npmrc'];
//         if (!allowedHidden.some(allowed => fileName.startsWith(allowed))) {
//             return true;
//         }
//     }

//     return false;
// }

// /**
//  * Recursively traverse directory and collect all non-ignored files
//  */
// async function traverseDirectory(dirPath) {
//     const files = [];

//     // Skip if this directory should be ignored
//     if (shouldIgnoreDirectory(dirPath)) {
//         console.log(`  ⏭️  Skipping directory: ${getRelativePath(dirPath)}`);
//         stats.skipped++;
//         return files;
//     }

//     try {
//         const items = await readdir(dirPath);

//         for (const item of items) {
//             const fullPath = path.join(dirPath, item);

//             try {
//                 const fileStat = await stat(fullPath);

//                 if (fileStat.isDirectory()) {
//                     const subFiles = await traverseDirectory(fullPath);
//                     files.push(...subFiles);
//                 } else if (fileStat.isFile()) {
//                     if (!shouldIgnoreFile(item, fullPath)) {
//                         files.push(fullPath);
//                     } else {
//                         console.log(`  ⏭️  Skipping file: ${getRelativePath(fullPath)}`);
//                         stats.skipped++;
//                     }
//                 }
//             } catch (err) {
//                 console.error(`  ❌ Error accessing ${fullPath}: ${err.message}`);
//                 stats.errors++;
//             }
//         }
//     } catch (err) {
//         console.error(`  ❌ Error reading directory ${dirPath}: ${err.message}`);
//         stats.errors++;
//     }

//     return files;
// }

// /**
//  * Read file content with encoding detection
//  */
// async function readFileContent(filePath) {
//     try {
//         const buffer = await readFile(filePath);

//         // Try UTF-8 first
//         try {
//             return buffer.toString('utf8');
//         } catch (err) {
//             // Fallback to latin1 for binary files
//             return `[BINARY FILE]\n${buffer.toString('base64')}\n[/BINARY FILE]`;
//         }
//     } catch (err) {
//         console.error(`  ❌ Error reading file: ${err.message}`);
//         stats.errors++;
//         return `[ERROR: ${err.message}]`;
//     }
// }

// /**
//  * Format file size for display
//  */
// function formatFileSize(bytes) {
//     if (bytes < 1024) return `${bytes} bytes`;
//     if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
//     return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
// }

// /**
//  * Display configuration summary
//  */
// function displayConfig() {
//     console.log('\n⚙️  Configuration:');
//     console.log(`  • Ignored directories (by name): ${IGNORED_DIRECTORIES.length}`);
//     console.log(`  • Ignored directory paths: ${IGNORED_DIRECTORY_PATHS.length}`);
//     console.log(`  • Ignored files (by name): ${ALL_IGNORED_FILES.length}`);
//     console.log(`  • Ignored file paths: ${ALL_IGNORED_FILE_PATHS.length}`);
//     console.log(`  • Ignored extensions: ${IGNORED_FILE_EXTENSIONS.length}`);

//     if (IGNORED_DIRECTORY_PATHS.length > 0) {
//         console.log('\n  📁 Ignored directories:');
//         IGNORED_DIRECTORY_PATHS.forEach(dir => console.log(`    - ${dir}`));
//     }

//     if (ALL_IGNORED_FILE_PATHS.length > 0) {
//         console.log('\n  📄 Ignored files:');
//         ALL_IGNORED_FILE_PATHS.forEach(file => console.log(`    - ${file}`));
//     }
// }

// // ============================================
// // MAIN FUNCTIONS
// // ============================================

// /**
//  * Create the complete source code document
//  */
// async function createCodeDocument() {
//     console.log('\n📂 Scanning directory:', process.cwd());
//     console.log('🔍 Gathering files...\n');

//     const allFiles = await traverseDirectory(process.cwd());

//     if (allFiles.length === 0) {
//         console.log('❌ No files found to process!');
//         return null;
//     }

//     console.log(`\n📊 Found ${allFiles.length} files to process\n`);

//     let outputContent = '';

//     // Process each file
//     for (let i = 0; i < allFiles.length; i++) {
//         const filePath = allFiles[i];
//         const relativePath = getRelativePath(filePath);

//         console.log(`📝 Processing (${i + 1}/${allFiles.length}): ${relativePath}`);

//         // Add file header with path
//         outputContent += `\n${'='.repeat(80)}\n`;
//         outputContent += `FILE: ${relativePath}\n`;
//         outputContent += `${'='.repeat(80)}\n\n`;

//         // Add file content
//         const content = await readFileContent(filePath);
//         outputContent += content;

//         // Ensure trailing newline
//         if (content && !content.endsWith('\n')) {
//             outputContent += '\n';
//         }

//         stats.processed++;
//     }

//     // Write to file
//     try {
//         await writeFile(OUTPUT_FILE, outputContent, 'utf8');
//         console.log(`\n✅ Created: ${OUTPUT_FILE}`);
//         console.log(`📏 Size: ${formatFileSize(outputContent.length)}`);
//         return outputContent;
//     } catch (err) {
//         console.error(`❌ Error writing file: ${err.message}`);
//         return null;
//     }
// }

// /**
//  * Create minified version (remove all whitespace)
//  */
// async function createMinifiedVersion(sourceContent) {
//     if (!sourceContent) {
//         console.log('❌ No source content to minify');
//         return false;
//     }

//     console.log('\n⚡ Creating minified version...');

//     try {
//         // Remove all whitespace
//         const minified = sourceContent.replace(/\s/g, '');

//         await writeFile(OUTPUT_MIN_FILE, minified, 'utf8');
//         console.log(`✅ Created: ${OUTPUT_MIN_FILE}`);
//         console.log(`📏 Size: ${formatFileSize(minified.length)}`);

//         const reduction = ((1 - minified.length / sourceContent.length) * 100).toFixed(2);
//         console.log(`📉 Reduction: ${reduction}%`);

//         return true;
//     } catch (err) {
//         console.error(`❌ Error creating minified file: ${err.message}`);
//         return false;
//     }
// }

// /**
//  * Display final summary
//  */
// function displaySummary() {
//     console.log('\n' + '='.repeat(50));
//     console.log('📊 SUMMARY');
//     console.log('='.repeat(50));
//     console.log(`✅ Files processed: ${stats.processed}`);
//     console.log(`⏭️  Files/directories skipped: ${stats.skipped}`);
//     console.log(`❌ Errors encountered: ${stats.errors}`);
//     console.log(`📁 Output files:`);
//     console.log(`   - ${path.basename(OUTPUT_FILE)}`);
//     console.log(`   - ${path.basename(OUTPUT_MIN_FILE)}`);
//     console.log('\n🎉 Done!');
// }

// // ============================================
// // SCRIPT ENTRY POINT
// // ============================================

// async function main() {
//     console.log('🔍 Source Code Collector');
//     console.log('='.repeat(50));

//     displayConfig();

//     try {
//         const sourceContent = await createCodeDocument();

//         if (!sourceContent) {
//             console.log('❌ Failed to create code document');
//             return;
//         }

//         await createMinifiedVersion(sourceContent);
//         displaySummary();

//     } catch (error) {
//         console.error('💥 Unexpected error:', error.message);
//         if (error.stack) console.error(error.stack);
//     }
// }

// // Run the script
// main();
'use strict';

/**
 * Source Code Collector
 *
 * Walks a project folder and writes every source file into one text file
 * (code.txt) so it can be pasted or uploaded in one go.
 *
 * Usage (run from the project root):
 *   node code_collection.js
 *   node code_collection.js --only games,jobs.py,tests/test_football_completion.py
 *   node code_collection.js --root ../score-service --out score-service-code.txt
 *   node code_collection.js --min          also write code.min.txt (whitespace stripped)
 *   node code_collection.js --max-kb 800   raise the per-file size limit (default 400)
 *   node code_collection.js --verbose      print every skipped file
 *
 * What it does NOT collect: caches, virtualenvs, hidden folders, lock files,
 * secrets (.env files other than .env.example), images, binaries, model files,
 * files that are not source/text types, and files over the size limit.
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

// ============================================
// COMMAND LINE
// ============================================

function printHelp() {
    console.log(`
Source Code Collector

  node code_collection.js [options]

Options:
  --only a,b,c    only collect these files or folders (relative to the root)
  --root <dir>    folder to scan (default: current folder)
  --out <file>    output file name (default: code.txt)
  --min           also write a whitespace-stripped copy (code.min.txt)
  --max-kb <n>    skip files larger than n KB (default: 400)
  --verbose       print every skipped file
  -h, --help      show this help
`);
}

function normalizePathArg(p) {
    return p.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function parseArgs(argv) {
    const args = { only: [], min: false, root: process.cwd(), out: 'code.txt', maxKb: 400, verbose: false };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--only') {
            args.only = (argv[++i] || '').split(',').map(normalizePathArg).filter(Boolean);
        } else if (a === '--min') {
            args.min = true;
        } else if (a === '--root') {
            args.root = path.resolve(argv[++i] || '.');
        } else if (a === '--out') {
            args.out = argv[++i] || args.out;
        } else if (a === '--max-kb') {
            args.maxKb = Number(argv[++i]) || args.maxKb;
        } else if (a === '--verbose') {
            args.verbose = true;
        } else if (a === '--help' || a === '-h') {
            printHelp();
            process.exit(0);
        } else {
            console.error(`Unknown option: ${a}`);
            printHelp();
            process.exit(1);
        }
    }
    return args;
}

const args = parseArgs(process.argv);
const ROOT = args.root;

// ============================================
// CONFIGURATION - Customize these as needed
// ============================================

// Directories to ignore (by name - anywhere in the tree).
// Any folder whose name starts with "." is also ignored (.git, .venv, .pytest_cache, ...).
const IGNORED_DIRECTORIES = [
    'node_modules',
    'dist',
    'build',
    'public',
    'coverage',
    'htmlcov',
    'site-packages',
    // Python
    '__pycache__',
    'venv',
    'env',
    '.venv',
    '.eggs',
    // Test screenshots and other sample media
    'TestScreenShots',
    'screenshots'
];

// Hidden folders that SHOULD be collected (everything else starting with "." is skipped)
const ALLOWED_HIDDEN_DIRECTORIES = [
    // '.github'
];

// Specific directory paths to ignore (relative to root, forward slashes)
const IGNORED_DIRECTORY_PATHS = [
    // 'app/(auth)',
    // 'components/Map'
];

// Files to ignore (by filename - anywhere in the tree)
const IGNORED_FILES = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'poetry.lock',
    'Pipfile.lock',
    'code.txt',
    'code.min.txt',
    'Thumbs.db',
    'desktop.ini',
    '.DS_Store',
    '.gitignore',
    '.coverage',
    'collect-code.js',
    'code_collection.js',
    path.basename(__filename), // this script, whatever it is called
    path.basename(args.out)    // the output file
];

// Specific file paths to ignore (relative to root, forward slashes)
const IGNORED_FILE_PATHS = [
    // 'lib/hooks/useAuth.js'
];

// File extensions to ignore
const IGNORED_FILE_EXTENSIONS = [
    '.log', '.tmp', '.temp', '.bak', '.swp', '.swo',
    '.pid', '.seed', '.pem', '.cert', '.key', '.crt', '.p12',
    '.zip', '.rar', '.7z', '.gz', '.tar', '.tgz',
    '.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg', '.webp', '.bmp', '.tif', '.tiff', '.heic',
    '.mp3', '.wav', '.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm',
    '.exe', '.dll', '.so', '.dylib',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.pyc', '.pyo', '.pyd',
    '.onnx', '.pt', '.pth', '.bin', '.h5', '.pkl',
    '.db', '.sqlite', '.sqlite3',
    '.woff', '.woff2', '.ttf', '.otf', '.eot',
    '.map', '.lock'
];

// Only files with these extensions (or names below) are collected.
// This keeps stray binaries and data dumps out even if the lists above miss them.
const INCLUDED_EXTENSIONS = [
    '.py', '.pyi',
    '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx',
    '.json', '.md', '.mdx', '.txt',
    '.toml', '.cfg', '.ini', '.yml', '.yaml',
    '.sql', '.sh', '.bat', '.ps1',
    '.html', '.css', '.scss'
];

// Files collected by exact name even without a known extension
const INCLUDED_FILENAMES = [
    'Dockerfile',
    'Makefile',
    '.env.example',
    '.env.sample',
    '.env.template',
    '.dockerignore'
];

// Hidden files collected when their name starts with one of these
const ALLOWED_HIDDEN_FILE_PREFIXES = [
    '.env.example', '.env.sample', '.env.template',
    '.eslintrc', '.prettierrc', '.babelrc', '.dockerignore'
];

// Env files that are safe to collect (templates). Every other ".env*" file is treated as a secret.
const SAFE_ENV_FILES = ['.env.example', '.env.sample', '.env.template'];

// Skip files larger than this (override with --max-kb)
const MAX_FILE_BYTES = args.maxKb * 1024;

// Output file configuration
const OUTPUT_FILE = path.resolve(ROOT, args.out);
const OUTPUT_MIN_FILE = path.resolve(ROOT, 'code.min.txt');

// ============================================
// STATE
// ============================================

const stats = { processed: 0, skippedDirs: 0, skippedFiles: 0, errors: 0, bytes: 0 };
const skipReasons = {};
const onlyMatched = new Set();

// ============================================
// HELPER FUNCTIONS
// ============================================

function getRelativePath(filePath) {
    const relative = path.relative(ROOT, filePath);
    return relative ? relative.replace(/\\/g, '/') : '.';
}

function countSkip(reason) {
    skipReasons[reason] = (skipReasons[reason] || 0) + 1;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Returns a reason string if the directory should be skipped, otherwise null. */
function ignoredDirectoryReason(dirName, relativePath) {
    if (IGNORED_DIRECTORIES.includes(dirName)) return 'ignored folder';
    if (dirName.endsWith('.egg-info')) return 'ignored folder';
    if (dirName.startsWith('.') && !ALLOWED_HIDDEN_DIRECTORIES.includes(dirName)) return 'hidden folder';
    if (IGNORED_DIRECTORY_PATHS.includes(relativePath)) return 'ignored folder path';
    return null;
}

/** Returns a reason string if the file should be skipped, otherwise null. */
async function ignoredFileReason(fileName, relativePath, fullPath) {
    const ext = path.extname(fileName).toLowerCase();

    if (IGNORED_FILES.includes(fileName)) return 'ignored file';
    if (fileName.startsWith('.env') && !SAFE_ENV_FILES.includes(fileName)) return 'secret (.env)';
    if (IGNORED_FILE_EXTENSIONS.includes(ext)) return 'ignored file type';
    if (IGNORED_FILE_PATHS.includes(relativePath)) return 'ignored file path';

    if (fileName.startsWith('.') && !ALLOWED_HIDDEN_FILE_PREFIXES.some(p => fileName.startsWith(p))) {
        return 'hidden file';
    }

    const known = INCLUDED_EXTENSIONS.includes(ext)
        || INCLUDED_FILENAMES.includes(fileName)
        || ALLOWED_HIDDEN_FILE_PREFIXES.some(p => fileName.startsWith(p));
    if (!known) return 'not a source/text type';

    const info = await fsp.stat(fullPath);
    if (info.size > MAX_FILE_BYTES) return `larger than ${args.maxKb} KB`;

    return null;
}

/** Cheap binary check: null bytes, or lots of control characters, in the first 8 KB. */
function looksBinary(buffer) {
    const n = Math.min(buffer.length, 8000);
    let suspicious = 0;
    for (let i = 0; i < n; i++) {
        const b = buffer[i];
        if (b === 0) return true;
        if (b < 7 || (b > 13 && b < 32 && b !== 27)) suspicious++;
    }
    return n > 0 && suspicious / n > 0.1;
}

/** True when the path is one of the --only entries or inside one. */
function matchesOnly(relativePath) {
    if (args.only.length === 0) return true;
    for (const p of args.only) {
        if (relativePath === p || relativePath.startsWith(p + '/')) {
            onlyMatched.add(p);
            return true;
        }
    }
    return false;
}

/** Recursively collect every non-ignored file, in a stable (alphabetical) order. */
async function traverseDirectory(dirPath, files = []) {
    let entries;
    try {
        entries = await fsp.readdir(dirPath, { withFileTypes: true });
    } catch (err) {
        console.error(`  ❌ Error reading directory ${dirPath}: ${err.message}`);
        stats.errors++;
        return files;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = getRelativePath(fullPath);

        try {
            if (entry.isSymbolicLink()) {
                stats.skippedFiles++;
                countSkip('symbolic link');
                continue;
            }

            if (entry.isDirectory()) {
                const why = ignoredDirectoryReason(entry.name, relativePath);
                if (why) {
                    stats.skippedDirs++;
                    countSkip(why);
                    if (args.verbose) console.log(`  ⏭️  Skipping directory (${why}): ${relativePath}`);
                    continue;
                }
                await traverseDirectory(fullPath, files);
            } else if (entry.isFile()) {
                const why = await ignoredFileReason(entry.name, relativePath, fullPath);
                if (why) {
                    stats.skippedFiles++;
                    countSkip(why);
                    if (args.verbose) console.log(`  ⏭️  Skipping file (${why}): ${relativePath}`);
                    continue;
                }
                if (matchesOnly(relativePath)) files.push(fullPath);
            }
        } catch (err) {
            console.error(`  ❌ Error accessing ${fullPath}: ${err.message}`);
            stats.errors++;
        }
    }

    return files;
}

/** Read a file as text. Returns null if it turns out to be binary. */
async function readFileContent(filePath) {
    const buffer = await fsp.readFile(filePath);
    if (looksBinary(buffer)) return null;
    return buffer.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

function displayConfig() {
    console.log('\n⚙️  Configuration:');
    console.log(`  • Root: ${ROOT}`);
    console.log(`  • Output: ${getRelativePath(OUTPUT_FILE)}`);
    console.log(`  • Ignored folders (by name): ${IGNORED_DIRECTORIES.length} (+ every hidden folder)`);
    console.log(`  • Ignored file types: ${IGNORED_FILE_EXTENSIONS.length}`);
    console.log(`  • Collected file types: ${INCLUDED_EXTENSIONS.length}`);
    console.log(`  • Size limit per file: ${args.maxKb} KB`);
    if (args.only.length > 0) {
        console.log('\n  🎯 Only collecting:');
        args.only.forEach(p => console.log(`    - ${p}`));
    }
}

// ============================================
// MAIN FUNCTIONS
// ============================================

async function createCodeDocument() {
    console.log('\n📂 Scanning directory:', ROOT);
    console.log('🔍 Gathering files...\n');

    const allFiles = await traverseDirectory(ROOT);

    if (args.only.length > 0) {
        const missing = args.only.filter(p => !onlyMatched.has(p));
        if (missing.length > 0) {
            console.log('⚠️  Nothing collected for these --only entries (wrong path, or the file was ignored):');
            missing.forEach(p => console.log(`    - ${p}`));
        }
    }

    if (allFiles.length === 0) {
        console.log('❌ No files found to process!');
        return null;
    }

    console.log(`\n📊 Found ${allFiles.length} files to process\n`);

    const bodies = [];
    const included = [];

    for (let i = 0; i < allFiles.length; i++) {
        const filePath = allFiles[i];
        const relativePath = getRelativePath(filePath);

        let content;
        try {
            content = await readFileContent(filePath);
        } catch (err) {
            console.error(`  ❌ Error reading ${relativePath}: ${err.message}`);
            stats.errors++;
            continue;
        }

        if (content === null) {
            console.log(`  ⏭️  Skipping binary file: ${relativePath}`);
            stats.skippedFiles++;
            countSkip('binary content');
            continue;
        }

        console.log(`📝 Processing (${i + 1}/${allFiles.length}): ${relativePath}`);

        let block = `\n${'='.repeat(80)}\nFILE: ${relativePath}\n${'='.repeat(80)}\n\n${content}`;
        if (!content.endsWith('\n')) block += '\n';

        bodies.push(block);
        included.push(relativePath);
        stats.processed++;
    }

    if (included.length === 0) {
        console.log('❌ Every file turned out to be binary or unreadable!');
        return null;
    }

    const header =
        `SOURCE CODE COLLECTION\n` +
        `Root: ${path.basename(ROOT)}\n` +
        `Generated: ${new Date().toISOString()}\n` +
        `Files: ${included.length}\n\n` +
        `FILE LIST\n` +
        included.map(p => `  ${p}`).join('\n') + '\n';

    const outputContent = header + bodies.join('');

    try {
        await fsp.writeFile(OUTPUT_FILE, outputContent, 'utf8');
        stats.bytes = Buffer.byteLength(outputContent);
        console.log(`\n✅ Created: ${OUTPUT_FILE}`);
        console.log(`📏 Size: ${formatFileSize(stats.bytes)}`);
        return outputContent;
    } catch (err) {
        console.error(`❌ Error writing file: ${err.message}`);
        return null;
    }
}

/** Optional: whitespace-stripped copy. Note: this breaks Python (indentation matters). */
async function createMinifiedVersion(sourceContent) {
    console.log('\n⚡ Creating minified version...');
    try {
        const minified = sourceContent.replace(/\s/g, '');
        await fsp.writeFile(OUTPUT_MIN_FILE, minified, 'utf8');
        console.log(`✅ Created: ${OUTPUT_MIN_FILE}`);
        console.log(`📏 Size: ${formatFileSize(minified.length)}`);
        console.log('⚠️  Whitespace is removed, so Python indentation is lost. Use code.txt for Python code.');
        return true;
    } catch (err) {
        console.error(`❌ Error creating minified file: ${err.message}`);
        return false;
    }
}

function displaySummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Files collected: ${stats.processed}`);
    console.log(`⏭️  Folders skipped: ${stats.skippedDirs}`);
    console.log(`⏭️  Files skipped: ${stats.skippedFiles}`);
    const reasons = Object.entries(skipReasons).sort((a, b) => b[1] - a[1]);
    if (reasons.length > 0) {
        console.log('   Skipped because of:');
        reasons.forEach(([why, n]) => console.log(`     - ${why}: ${n}`));
    }
    console.log(`❌ Errors encountered: ${stats.errors}`);
    console.log(`📁 Output: ${path.basename(OUTPUT_FILE)} (${formatFileSize(stats.bytes)})`);
    if (stats.bytes > 300 * 1024 && args.only.length === 0) {
        console.log('\n💡 The output is large. To share only part of the project, run for example:');
        console.log('   node code_collection.js --only games,jobs.py,tests/test_football_completion.py');
    }
    console.log('\n🎉 Done!');
}

// ============================================
// SCRIPT ENTRY POINT
// ============================================

async function main() {
    console.log('🔍 Source Code Collector');
    console.log('='.repeat(50));

    displayConfig();

    try {
        const sourceContent = await createCodeDocument();

        if (!sourceContent) {
            console.log('❌ Failed to create code document');
            process.exitCode = 1;
            return;
        }

        if (args.min) await createMinifiedVersion(sourceContent);
        displaySummary();
    } catch (error) {
        console.error('💥 Unexpected error:', error.message);
        if (error.stack) console.error(error.stack);
        process.exitCode = 1;
    }
}

main();
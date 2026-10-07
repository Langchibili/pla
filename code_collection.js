const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Promisify fs functions for async/await usage
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// ============================================
// CONFIGURATION - Customize these as needed
// ============================================

// Directories to ignore (by name - anywhere in the tree)
const IGNORED_DIRECTORIES = [
    'node_modules',
    '.git',
    '.vscode',
    '.idea',
    'dist',
    'build',
    'public',
    'coverage',
    '.next',
    '.strapi',
    '.nuxt',
    '.cache',
    '.DS_Store'
];

// Specific directory paths to ignore (relative to root)
const IGNORED_DIRECTORY_PATHS = [
    'app/(auth)',
    'components/Map',
    'components/Rider',
    'lib/api',
    'app/(main)',
    'app/finding-driver',
    'app/trip-summary'
];

// Files to ignore (by filename - anywhere in the tree)
const IGNORED_FILES = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.gitignore',
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    'code.txt',
    'code.min.txt',
    'Thumbs.db',
    'desktop.ini',
    'collect-code.js'  // This script itself
];

// Specific file paths to ignore (relative to root)
const IGNORED_FILE_PATHS = [
    'lib/hooks/useAuth.js',
    'lib/hooks/useRide.js',
    'app/page.js'
];

// File extensions to ignore
const IGNORED_FILE_EXTENSIONS = [
    '.log', '.tmp', '.temp', '.bak', '.swp', '.swo',
    '.pid', '.seed', '.pem', '.cert', '.key',
    '.zip', '.rar', '.7z', '.gz', '.tar',
    '.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv',
    '.exe', '.dll', '.so', '.dylib',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx'
];

// Custom ignored items - Add your own here
const CUSTOM_IGNORED_FILES = [
    // 'secrets.json',
    // 'private.key'
];

const CUSTOM_IGNORED_PATHS = [
    // 'app/specific-folder/specific-file.js'
];

// Combine all ignored files
const ALL_IGNORED_FILES = [...IGNORED_FILES, ...CUSTOM_IGNORED_FILES];
const ALL_IGNORED_FILE_PATHS = [...IGNORED_FILE_PATHS, ...CUSTOM_IGNORED_PATHS];

// Output file configuration
const OUTPUT_FILE = path.join(process.cwd(), 'code.txt');
const OUTPUT_MIN_FILE = path.join(process.cwd(), 'code.min.txt');

// Statistics tracking
let stats = {
    processed: 0,
    skipped: 0,
    errors: 0
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get normalized relative path from root directory
 */
function getRelativePath(filePath) {
    const relative = path.relative(process.cwd(), filePath);
    return relative ? relative.replace(/\\/g, '/') : '.';
}

/**
 * Check if a directory should be ignored
 */
function shouldIgnoreDirectory(dirPath) {
    const relativePath = getRelativePath(dirPath);
    const dirName = path.basename(dirPath);

    // Check by directory name (global)
    if (IGNORED_DIRECTORIES.includes(dirName)) {
        return true;
    }

    // Check exact directory path
    if (IGNORED_DIRECTORY_PATHS.includes(relativePath)) {
        return true;
    }

    return false;
}

/**
 * Check if a file should be ignored
 */
function shouldIgnoreFile(fileName, filePath) {
    const relativePath = getRelativePath(filePath);
    const ext = path.extname(fileName).toLowerCase();

    // Check by filename
    if (ALL_IGNORED_FILES.includes(fileName)) {
        return true;
    }

    // Check by extension
    if (IGNORED_FILE_EXTENSIONS.includes(ext)) {
        return true;
    }

    // Check exact file path
    if (ALL_IGNORED_FILE_PATHS.includes(relativePath)) {
        return true;
    }

    // Check if file is in an ignored directory
    const fileDir = path.dirname(relativePath);
    if (IGNORED_DIRECTORY_PATHS.includes(fileDir)) {
        return true;
    }

    // Check hidden files (except allowed ones)
    if (fileName.startsWith('.') && !fileName.startsWith('.env')) {
        const allowedHidden = ['.eslintrc', '.prettierrc', '.babelrc', '.npmrc'];
        if (!allowedHidden.some(allowed => fileName.startsWith(allowed))) {
            return true;
        }
    }

    return false;
}

/**
 * Recursively traverse directory and collect all non-ignored files
 */
async function traverseDirectory(dirPath) {
    const files = [];

    // Skip if this directory should be ignored
    if (shouldIgnoreDirectory(dirPath)) {
        console.log(`  ⏭️  Skipping directory: ${getRelativePath(dirPath)}`);
        stats.skipped++;
        return files;
    }

    try {
        const items = await readdir(dirPath);

        for (const item of items) {
            const fullPath = path.join(dirPath, item);

            try {
                const fileStat = await stat(fullPath);

                if (fileStat.isDirectory()) {
                    const subFiles = await traverseDirectory(fullPath);
                    files.push(...subFiles);
                } else if (fileStat.isFile()) {
                    if (!shouldIgnoreFile(item, fullPath)) {
                        files.push(fullPath);
                    } else {
                        console.log(`  ⏭️  Skipping file: ${getRelativePath(fullPath)}`);
                        stats.skipped++;
                    }
                }
            } catch (err) {
                console.error(`  ❌ Error accessing ${fullPath}: ${err.message}`);
                stats.errors++;
            }
        }
    } catch (err) {
        console.error(`  ❌ Error reading directory ${dirPath}: ${err.message}`);
        stats.errors++;
    }

    return files;
}

/**
 * Read file content with encoding detection
 */
async function readFileContent(filePath) {
    try {
        const buffer = await readFile(filePath);

        // Try UTF-8 first
        try {
            return buffer.toString('utf8');
        } catch (err) {
            // Fallback to latin1 for binary files
            return `[BINARY FILE]\n${buffer.toString('base64')}\n[/BINARY FILE]`;
        }
    } catch (err) {
        console.error(`  ❌ Error reading file: ${err.message}`);
        stats.errors++;
        return `[ERROR: ${err.message}]`;
    }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Display configuration summary
 */
function displayConfig() {
    console.log('\n⚙️  Configuration:');
    console.log(`  • Ignored directories (by name): ${IGNORED_DIRECTORIES.length}`);
    console.log(`  • Ignored directory paths: ${IGNORED_DIRECTORY_PATHS.length}`);
    console.log(`  • Ignored files (by name): ${ALL_IGNORED_FILES.length}`);
    console.log(`  • Ignored file paths: ${ALL_IGNORED_FILE_PATHS.length}`);
    console.log(`  • Ignored extensions: ${IGNORED_FILE_EXTENSIONS.length}`);

    if (IGNORED_DIRECTORY_PATHS.length > 0) {
        console.log('\n  📁 Ignored directories:');
        IGNORED_DIRECTORY_PATHS.forEach(dir => console.log(`    - ${dir}`));
    }

    if (ALL_IGNORED_FILE_PATHS.length > 0) {
        console.log('\n  📄 Ignored files:');
        ALL_IGNORED_FILE_PATHS.forEach(file => console.log(`    - ${file}`));
    }
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Create the complete source code document
 */
async function createCodeDocument() {
    console.log('\n📂 Scanning directory:', process.cwd());
    console.log('🔍 Gathering files...\n');

    const allFiles = await traverseDirectory(process.cwd());

    if (allFiles.length === 0) {
        console.log('❌ No files found to process!');
        return null;
    }

    console.log(`\n📊 Found ${allFiles.length} files to process\n`);

    let outputContent = '';

    // Process each file
    for (let i = 0; i < allFiles.length; i++) {
        const filePath = allFiles[i];
        const relativePath = getRelativePath(filePath);

        console.log(`📝 Processing (${i + 1}/${allFiles.length}): ${relativePath}`);

        // Add file header with path
        outputContent += `\n${'='.repeat(80)}\n`;
        outputContent += `FILE: ${relativePath}\n`;
        outputContent += `${'='.repeat(80)}\n\n`;

        // Add file content
        const content = await readFileContent(filePath);
        outputContent += content;

        // Ensure trailing newline
        if (content && !content.endsWith('\n')) {
            outputContent += '\n';
        }

        stats.processed++;
    }

    // Write to file
    try {
        await writeFile(OUTPUT_FILE, outputContent, 'utf8');
        console.log(`\n✅ Created: ${OUTPUT_FILE}`);
        console.log(`📏 Size: ${formatFileSize(outputContent.length)}`);
        return outputContent;
    } catch (err) {
        console.error(`❌ Error writing file: ${err.message}`);
        return null;
    }
}

/**
 * Create minified version (remove all whitespace)
 */
async function createMinifiedVersion(sourceContent) {
    if (!sourceContent) {
        console.log('❌ No source content to minify');
        return false;
    }

    console.log('\n⚡ Creating minified version...');

    try {
        // Remove all whitespace
        const minified = sourceContent.replace(/\s/g, '');

        await writeFile(OUTPUT_MIN_FILE, minified, 'utf8');
        console.log(`✅ Created: ${OUTPUT_MIN_FILE}`);
        console.log(`📏 Size: ${formatFileSize(minified.length)}`);

        const reduction = ((1 - minified.length / sourceContent.length) * 100).toFixed(2);
        console.log(`📉 Reduction: ${reduction}%`);

        return true;
    } catch (err) {
        console.error(`❌ Error creating minified file: ${err.message}`);
        return false;
    }
}

/**
 * Display final summary
 */
function displaySummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Files processed: ${stats.processed}`);
    console.log(`⏭️  Files/directories skipped: ${stats.skipped}`);
    console.log(`❌ Errors encountered: ${stats.errors}`);
    console.log(`📁 Output files:`);
    console.log(`   - ${path.basename(OUTPUT_FILE)}`);
    console.log(`   - ${path.basename(OUTPUT_MIN_FILE)}`);
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
            return;
        }

        await createMinifiedVersion(sourceContent);
        displaySummary();

    } catch (error) {
        console.error('💥 Unexpected error:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

// Run the script
main();
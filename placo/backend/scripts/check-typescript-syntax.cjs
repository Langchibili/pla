const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const ignore = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '.tmp']);
const files = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.isDirectory() && ignore.has(item.name)) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full);
    else if (item.isFile() && full.endsWith('.ts')) files.push(full);
  }
}
walk(path.join(root, 'src'));
walk(path.join(root, 'config'));
const diagnostics = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: true },
  });
  for (const diagnostic of result.diagnostics ?? []) {
    if (diagnostic.category !== ts.DiagnosticCategory.Error) continue;
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    diagnostics.push(`${path.relative(root, file)}: ${message}`);
  }
}
console.log(`Parsed ${files.length} TypeScript files.`);
if (diagnostics.length) { console.error(diagnostics.join('\n')); process.exitCode = 1; }
else console.log('TypeScript syntax transpilation passed. This is not a semantic type-check or Strapi build.');

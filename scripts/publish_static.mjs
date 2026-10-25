import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'out');
if (!existsSync(path.join(output, 'index.html'))) {
  throw new Error('Run npm run build before publishing the static files.');
}

// GitHub Pages serves main:/; keep source, old image URLs, domain configuration,
// and Google ownership verification intact when updating the built pages.
const protectedNames = new Set([
  '.git', '.github', '.gitignore', 'CNAME', 'LICENSE', 'README.md',
  'src', 'content', 'public', 'scripts', 'node_modules', 'out',
  'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json',
  'next-env.d.ts', 'postcss.config.mjs', 'tailwind.config.mjs',
  'eslint.config.mjs', 'google34c29e8879a232ca.html',
]);
const entries = readdirSync(output);
for (const name of entries) {
  if (protectedNames.has(name)) throw new Error(`Export would overwrite protected file: ${name}`);
}
// Replace generated bundles so old framework versions are no longer published.
if (entries.includes('_next')) {
  rmSync(path.join(root, '_next'), { recursive: true, force: true });
}
for (const name of entries) {
  cpSync(path.join(output, name), path.join(root, name), {
    recursive: true,
    filter: (source, destination) => {
      if (statSync(source).isFile() && existsSync(destination) && statSync(destination).isFile()) {
        // Exported photos may be read-only. Keep identical assets, and replace
        // changed files instead of attempting to write into a read-only file.
        if (readFileSync(source).equals(readFileSync(destination))) return false;
        rmSync(destination);
      }
      return true;
    },
  });
}
writeFileSync(path.join(root, '.nojekyll'), '');
console.log('Static pages copied to the repository root for GitHub Pages.');

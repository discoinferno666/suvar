import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

const root = resolve('dist');
const failures = [];
let checked = 0;

async function checkReference(file, reference) {
  if (!reference || /^(?:#|data:|https?:|mailto:|tel:|\/\/)/i.test(reference)) return;
  const localPath = decodeURIComponent(reference.split(/[?#]/)[0]);
  if (!localPath) return;
  if (localPath.startsWith('/')) {
    failures.push(`${relative(root, file)}: absolute path ${reference} breaks project Pages URLs`);
    return;
  }
  const target = resolve(dirname(file), localPath);
  if (target !== root && !target.startsWith(root + sep)) {
    failures.push(`${relative(root, file)}: reference escapes the published directory: ${reference}`);
    return;
  }
  checked++;
  try {
    if (!(await stat(target)).isFile()) throw new Error('not a file');
  } catch {
    failures.push(`${relative(root, file)}: missing ${reference}`);
  }
}

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspect(file);
    } else if (/\.(?:html|css)$/.test(entry.name)) {
      const source = await readFile(file, 'utf8');
      const pattern = entry.name.endsWith('.html')
        ? /(?:src|href)\s*=\s*["']([^"']+)["']/gi
        : /url\(\s*["']?([^\s"')]+)["']?\s*\)/gi;
      for (const match of source.matchAll(pattern)) await checkReference(file, match[1]);
    } else if (['script.js', 'effects.js'].includes(entry.name)) {
      const source = await readFile(file, 'utf8');
      for (const match of source.matchAll(/["'](assets\/[^"']+)["']/g)) {
        await checkReference(file, match[1]);
      }
    }
  }
}

await stat(join(root, 'index.html'));
await stat(join(root, '.nojekyll'));
await inspect(root);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Static site verified: ${checked} local references exist and work under a repository path.`);
}

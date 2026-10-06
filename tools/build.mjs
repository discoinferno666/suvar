import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const manifestFile = join(root, 'assets', 'optimized', 'manifest.json');
const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
for (const optimized of Object.values(manifest)) await stat(join(root, optimized));

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of ['index.html', 'styles.css', 'design.css', 'script.js', 'effects.js']) {
  let source = await readFile(join(root, file), 'utf8');
  // Rewrite only the production copy; the development site keeps using originals.
  for (const [original, optimized] of Object.entries(manifest)) {
    source = source.replaceAll(original, optimized);
  }
  await writeFile(join(dist, file), source);
}
await cp(join(root, 'assets'), join(dist, 'assets'), {
  recursive: true,
  filter: source => !/\.(?:jpe?g|png)$/i.test(source) && source !== manifestFile
});
await writeFile(join(dist, '.nojekyll'), '');
console.log('Standalone HTML/CSS/JS built in dist with optimized WebP images.');

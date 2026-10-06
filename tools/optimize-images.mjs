import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceDirectory = resolve(root, 'assets');
const outputDirectory = resolve(sourceDirectory, 'optimized');
const isImage = /\.(?:jpe?g|png)$/i;

async function findImages(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (file === outputDirectory) continue;
    if (entry.isDirectory()) files.push(...await findImages(file));
    else if (entry.isFile() && isImage.test(entry.name)) files.push(file);
  }
  return files.sort();
}

const files = await findImages(sourceDirectory);
// Only this generated directory is cleared; originals are never written to.
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
const manifest = {};
let originalBytes = 0;
let optimizedBytes = 0;

for (const source of files) {
  const sourcePath = relative(sourceDirectory, source);
  // Retain the original extension to avoid collisions between photo.jpg/photo.png.
  const output = join(outputDirectory, `${sourcePath}.webp`);
  await mkdir(dirname(output), { recursive: true });
  const info = await sharp(source)
    .autoOrient()
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(output);

  const toUrl = file => relative(root, file).split(sep).join('/');
  manifest[toUrl(source)] = toUrl(output);
  originalBytes += (await stat(source)).size;
  optimizedBytes += info.size;
}

// Write the manifest last so a failed optimization cannot produce a valid build.
await writeFile(join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
const megabytes = bytes => (bytes / 1024 / 1024).toFixed(2);
console.log(`Optimized ${files.length} images: ${megabytes(originalBytes)} MB -> ${megabytes(optimizedBytes)} MB.`);
console.log('WebP quality: 80; maximum width: 1920 px; no enlargement. Output: assets/optimized/');

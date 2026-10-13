import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceDirectory = resolve(root, 'assets');
const outputDirectory = resolve(sourceDirectory, 'optimized');
const upscaledDirectory = resolve(sourceDirectory, 'Upscaled');
const tablesDirectory = resolve(sourceDirectory, 'tables');
const isImage = /\.(?:jpe?g|png)$/i;
const toUrl = file => relative(root, file).split(sep).join('/');
const overrides = JSON.parse(await readFile(new URL('./image-overrides.json', import.meta.url), 'utf8'));

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
const sourceUrls = new Set(files.map(toUrl));
for (const [original, replacement] of Object.entries(overrides)) {
  if (!sourceUrls.has(original) || !sourceUrls.has(replacement) || !/^(?:assets\/Upscaled\/|assets\/tables\/)/.test(replacement)) {
    throw new Error(`Invalid image override: ${original} -> ${replacement}`);
  }
}
// Do not generate outdated branches or tables that have replacements.
const selectedFiles = files.filter(file => !Object.hasOwn(overrides, toUrl(file)));
// Only this generated directory is cleared; originals are never written to.
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
const manifest = {};
let originalBytes = 0;
let optimizedBytes = 0;
let upscaledBytes = 0;
let upscaledOptimizedBytes = 0;
let upscaledCount = 0;
let tablesBytes = 0;
let tablesOptimizedBytes = 0;
let tablesCount = 0;

for (const source of selectedFiles) {
  const sourcePath = relative(sourceDirectory, source);
  // Retain the original extension to avoid collisions between photo.jpg/photo.png.
  const output = join(outputDirectory, `${sourcePath}.webp`);
  await mkdir(dirname(output), { recursive: true });
  const isUpscaled = source.startsWith(upscaledDirectory + sep);
  const isTable = source.startsWith(tablesDirectory + sep);
  const image = sharp(source).autoOrient();
  const info = await (isUpscaled || isTable
    // Keep every pixel, including transparent RGB values, and the full upscale size.
    ? image.webp({ lossless: true, exact: true, effort: 6 })
    : image.resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 80 })
  ).toFile(output);

  // Encode spaces in uploaded filenames so CSS url() and browser requests stay valid.
  manifest[toUrl(source)] = toUrl(output).split('/').map(encodeURIComponent).join('/');
  const sourceBytes = (await stat(source)).size;
  originalBytes += sourceBytes;
  optimizedBytes += info.size;
  if (isUpscaled) {
    upscaledCount++;
    upscaledBytes += sourceBytes;
    upscaledOptimizedBytes += info.size;
  }
  if (isTable) {
    tablesCount++;
    tablesBytes += sourceBytes;
    tablesOptimizedBytes += info.size;
  }
}

for (const [original, replacement] of Object.entries(overrides)) {
  manifest[original] = manifest[replacement];
}

// Write the manifest last so a failed optimization cannot produce a valid build.
await writeFile(join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
const megabytes = bytes => (bytes / 1024 / 1024).toFixed(2);
console.log(`Optimized ${selectedFiles.length} images: ${megabytes(originalBytes)} MB -> ${megabytes(optimizedBytes)} MB.`);
console.log(`Upscaled: ${upscaledCount} lossless WebP images at full resolution, ${megabytes(upscaledBytes)} MB -> ${megabytes(upscaledOptimizedBytes)} MB.`);
console.log(`Tables: ${tablesCount} lossless WebP images at full resolution, ${megabytes(tablesBytes)} MB -> ${megabytes(tablesOptimizedBytes)} MB.`);
console.log('Other images: WebP quality 80, maximum width 1920 px, no enlargement. Output: assets/optimized/');

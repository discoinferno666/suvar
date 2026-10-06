import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
const sources = await Promise.all(['tools/reference/desktop-current.txt', 'tools/reference/mobile-current.txt', 'tools/reference/lantern-chapter-two-current.txt', 'tools/reference/lantern-results-current.txt', 'tools/reference/hero-scene-current.txt'].map(p => readFile(p, 'utf8')));
const assets = new Map();
for (const source of sources) {
  const prefix = source.match(/assetPathPrefix = "([^"]+)"/)[1];
  for (const match of source.matchAll(/const (\w+) = `\$\{assetPathPrefix\}\/([^`]+)`/g)) assets.set(match[2], `${prefix}/${match[2]}`);
}
await mkdir('assets', { recursive: true });
const jobs = [...assets];
let completed = 0;
await Promise.all(Array.from({length: 6}, async () => {
  while (jobs.length) {
    const [name, url] = jobs.shift();
    try { if ((await stat(`assets/${name}`)).size > 0) { completed++; continue; } } catch {}
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    await writeFile(`assets/${name}`, Buffer.from(await response.arrayBuffer()));
    completed++;
    if (completed % 10 === 0) console.log(`${completed}/${assets.size} assets downloaded`);
  }
}));
console.log(`Saved ${completed} original Figma assets.`);
for (const family of ['Inter:wght@400;500;600;700;900', 'Lora:wght@700', 'Inter:ital,wght@1,600']) {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}&display=swap`, {headers:{'User-Agent':'Mozilla/5.0'}})).text();
  let local = css;
  for (const match of css.matchAll(/url\((https:[^)]+)\)/g)) {
    const name = new URL(match[1]).pathname.split('/').pop();
    await writeFile(`assets/${name}`, Buffer.from(await (await fetch(match[1])).arrayBuffer()));
    local = local.replace(match[1], `./${name}`);
  }
  await writeFile(`assets/font-${family.startsWith('Lora')?'lora':family.includes('ital')?'italic':'inter'}.css`, local);
}

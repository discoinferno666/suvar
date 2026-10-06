import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of ['index.html','styles.css','design.css','script.js','effects.js','assets']) await cp(file, `dist/${file}`, {recursive:true});
await writeFile('dist/.nojekyll', '');
console.log('Standalone HTML/CSS/JS copied to dist. No compilation or framework runtime required.');

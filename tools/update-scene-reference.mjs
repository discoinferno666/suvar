import { parse } from '@babel/parser';
import { readFile, writeFile } from 'node:fs/promises';

// Replace only the opening scene. Preserve the other corrected Figma groups.
const path = 'tools/reference/desktop-current.txt';
let source = await readFile(path, 'utf8');
const reference = await readFile('tools/reference/hero-scene-current.txt', 'utf8');
const parseSource = text => parse(text, {sourceType:'module', plugins:['jsx']});
const nodes = new Map();
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'JSXElement') {
    const id = node.openingElement.attributes.find(a => a.name?.name === 'data-node-id')?.value?.value;
    if (id) nodes.set(id, node);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  }
}
visit(parseSource(source));
const root = parseSource(reference).program.body.find(n => n.type === 'ExportDefaultDeclaration')
  .declaration.body.body.find(n => n.type === 'ReturnStatement').argument;
const first = nodes.get('34:1115') || nodes.get('15:458');
const last = nodes.get('34:1115') || nodes.get('15:460');
if (!first || !last) throw new Error('Opening scene not found');
source = source.slice(0, first.start) + reference.slice(root.start, root.end) + source.slice(last.end);
if (!source.includes('const imgSceneBackground')) {
  const bindings = reference.slice(reference.indexOf('const imgSceneBackground'), reference.indexOf('export default')).trim();
  source = source.replace('export default function', `${bindings}\n\nexport default function`);
}
await writeFile(path, source);
console.log('Updated the four opening scene layers from Figma.');

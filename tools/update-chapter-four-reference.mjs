import { parse } from '@babel/parser';
import { readFile, writeFile } from 'node:fs/promises';

// Update only chapter IV; preserve the corrected hero, lanterns and earlier chapters.
const parseSource = source => parse(source, { sourceType: 'module', plugins: ['jsx'] });
const rootOf = ast => ast.program.body.find(n => n.type === 'ExportDefaultDeclaration').declaration.body.body.find(n => n.type === 'ReturnStatement').argument;
const nodeId = node => node.openingElement.attributes.find(a => a.name?.name === 'data-node-id')?.value?.value;
const bindings = ast => {
  const values = new Map();
  for (const node of ast.program.body) if (node.type === 'VariableDeclaration') for (const d of node.declarations) {
    if (d.init.type === 'StringLiteral' && d.init.value.startsWith('assets/')) values.set(d.id.name, d.init.value);
    else if (d.init.type === 'TemplateLiteral') values.set(d.id.name, 'assets/' + d.init.quasis.at(-1).value.cooked.replace(/^\//, ''));
  }
  return values;
};
let source = await readFile('tools/reference/desktop-current.txt', 'utf8');
const target = await readFile('tools/reference/chapter-four-current.txt', 'utf8');
const ast = parseSource(source), targetAst = parseSource(target);
const children = rootOf(ast).children.filter(n => n.type === 'JSXElement');
const first = children.find(n => nodeId(n) === '15:728');
if (!first) throw new Error('Chapter IV starting layer is missing');
const targetChildren = rootOf(targetAst).children.filter(n => n.type === 'JSXElement');
let body = targetChildren.map(n => target.slice(n.start, n.end)).join('\n');
const oldByFile = new Map([...bindings(ast)].map(([name, path]) => [path, name]));
const added = [];
const replacements = new Map();
for (const [name, path] of bindings(targetAst)) {
  const replacement = oldByFile.get(path) || `chapterFour${name[0].toUpperCase()}${name.slice(1)}`;
  replacements.set(name, replacement);
  if (!oldByFile.has(path)) { added.push(`const ${replacement} = ${JSON.stringify(path)};`); oldByFile.set(path, replacement); }
}
// Rewrite JavaScript identifiers only; JSX tag names such as <img> are not bindings.
body = targetChildren.map(root => {
  const edits = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Identifier' && replacements.has(node.name)) edits.push(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(root);
  let code = target.slice(root.start, root.end);
  for (const node of edits.sort((a, b) => b.start - a.start)) {
    const start = node.start - root.start, end = node.end - root.start;
    code = code.slice(0, start) + replacements.get(node.name) + code.slice(end);
  }
  return code;
}).join('\n');
source = source.slice(0, first.start) + body + source.slice(children.at(-1).end);
if (added.length) source = source.replace('export default function', `${added.join('\n')}\n\nexport default function`);
await writeFile('tools/reference/desktop-current.txt', source);
console.log('Chapter IV updated from its saved Figma reference.');

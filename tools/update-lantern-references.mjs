import { parse } from '@babel/parser';
import { readFile, writeFile } from 'node:fs/promises';

// Apply only the two requested Figma groups; preserve the rest of the composition.
let source = await readFile('tools/reference/desktop-current.txt', 'utf8');
for (const [id, file, names] of [
  ['15:519', 'lantern-chapter-two-current.txt', {imgImage173:'imgImage177', imgImage174:'imgLanternFourMaskMiddle', imgImage175:'imgLanternFourMaskInner', imgImage176:'imgImage175'}],
  ['15:679', 'lantern-results-current.txt', {imgImage173:'imgImage180', imgImage174:'imgImage181', imgImage175:'imgImage182', imgImage176:'imgImage175'}]
]) {
  const ast = parse(source, {sourceType:'module', plugins:['jsx']});
  let target;
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type==='JSXElement' && node.openingElement.attributes.some(a=>a.name?.name==='data-node-id' && a.value?.value===id)) target=node;
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value==='object') visit(value);
    }
  }
  visit(ast);
  if (!target) throw new Error('Figma group missing: '+id);
  const reference = await readFile('tools/reference/'+file, 'utf8');
  const refAst = parse(reference, {sourceType:'module', plugins:['jsx']});
  const component = refAst.program.body.find(n=>n.type==='ExportDefaultDeclaration');
  const root = component.declaration.body.body.find(n=>n.type==='ReturnStatement').argument;
  const replacement = reference.slice(root.start, root.end)
    .replace('className="contents relative size-full"', 'className="contents"')
    .replace(/\bimgImage17[3-6]\b/g, name=>names[name]);
  source = source.slice(0,target.start)+replacement+source.slice(target.end);
}
if (!source.includes('const imgLanternFourMaskMiddle')) {
  source = source.replace('export default function', 'const imgLanternFourMaskMiddle = `${assetPathPrefix}/b3969.svg`;\nconst imgLanternFourMaskInner = `${assetPathPrefix}/1459b.svg`;\n\nexport default function');
}
await writeFile('tools/reference/desktop-current.txt', source);
console.log('Updated the two right-hand lantern groups from current Figma references.');

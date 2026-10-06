import { parse } from '@babel/parser';
import { readFile, writeFile } from 'node:fs/promises';
const unknown = new Set();
const escape = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const cssRules = [];
const manifests = [];
let seq = 0;
function css(classes) {
  const result = {};
  let tx='0',ty='0',from='transparent',to='transparent',fromStop='',toStop='',gradient='';
  const fixed = {
    absolute:{position:'absolute'},relative:{position:'relative'},contents:{display:'contents'},block:{display:'block'},flex:{display:'flex'},
    'flex-col':{'flex-direction':'column'},'flex-none':{flex:'none'},'shrink-0':{'flex-shrink':'0'},'content-stretch':{'align-content':'stretch'},
    'items-center':{'align-items':'center'},'items-start':{'align-items':'flex-start'},'items-end':{'align-items':'flex-end'},'justify-center':{'justify-content':'center'},
    'font-black':{'font-weight':'900'},'font-bold':{'font-weight':'700'},'font-semibold':{'font-weight':'600'},'font-medium':{'font-weight':'500'},'font-normal':{'font-weight':'400'},
    italic:{'font-style':'italic'},'not-italic':{'font-style':'normal'},uppercase:{'text-transform':'uppercase'},
    'text-white':{color:'#fff'},'text-black':{color:'#000'},'text-center':{'text-align':'center'},'bg-black':{background:'#000'},
    'w-full':{width:'100%'},'h-full':{height:'100%'},'size-full':{width:'100%',height:'100%'},'min-w-full':{'min-width':'100%'},'min-w-px':{'min-width':'1px'},
    'left-0':{left:'0'},'top-0':{top:'0'},'left-px':{left:'1px'},'top-px':{top:'1px'},'left-1/2':{left:'50%'},'inset-0':{inset:'0'},
    'overflow-hidden':{overflow:'hidden'},'overflow-clip':{overflow:'clip'},'max-w-none':{'max-width':'none'},'pointer-events-none':{'pointer-events':'none'},
    'object-cover':{'object-fit':'cover'},'object-bottom':{'object-position':'bottom'},'whitespace-nowrap':{'white-space':'nowrap'},'whitespace-pre-wrap':{'white-space':'pre-wrap'},
    'leading-none':{'line-height':'1'},'mb-0':{'margin-bottom':'0'},'border-3':{'border-width':'3px'},'border-solid':{'border-style':'solid'},
    'cursor-pointer':{cursor:'pointer'},underline:{'text-decoration-line':'underline'},'decoration-solid':{'text-decoration-style':'solid'},'decoration-from-font':{'text-decoration-thickness':'from-font'},
    'mask-alpha':{'mask-mode':'alpha'},'mask-intersect':{'mask-composite':'intersect'},'mask-no-clip':{'mask-clip':'no-clip'},'mask-no-repeat':{'mask-repeat':'no-repeat'}
  };
  const props={w:'width',h:'height',left:'left',top:'top',inset:'inset',gap:'gap',leading:'line-height',tracking:'letter-spacing',p:'padding',pl:'padding-left',mb:'margin-bottom','rounded-tl':'border-top-left-radius','mask-position':'mask-position','mask-size':'mask-size',aspect:'aspect-ratio',flex:'flex'};
  for(const token of classes.split(/\s+/).filter(Boolean)) {
    if(fixed[token]) {Object.assign(result,fixed[token]);continue;}
    if(token==='-translate-x-1/2'){tx='-50%';continue;}
    if(token==='-translate-y-1/2'){ty='-50%';continue;}
    if(token==='-scale-y-100'){result.scale='1 -1';continue;}
    if(token==='rotate-180'||token==='-rotate-90'){result.rotate=token==='rotate-180'?'180deg':'-90deg';continue;}
    if(token==='bg-gradient-to-b'||token==='bg-gradient-to-l'){gradient=token.endsWith('b')?'to bottom':'to left';continue;}
    if(token==='from-black'){from='#000';continue;}
    if(token==='to-black'){to='#000';continue;}
    const arbitrary=token.match(/^(.*?)\[(.*)\]$/);
    if(arbitrary){
      const prefix=arbitrary[1].replace(/-$/,'');let v=arbitrary[2].replaceAll('_',' ');
      if(v.startsWith('calc('))v=v.replace(/([\d%])([+-])/g,'$1 $2 ');
      if(prefix==='') {const at=v.indexOf(':');result[v.slice(0,at)]=v.slice(at+1);continue;}
      if(props[prefix]){result[props[prefix]]=v;continue;}
      if(prefix==='size'){result.width=v;result.height=v;continue;}
      if(prefix==='text'){result[v.startsWith('#')?'color':'font-size']=v;continue;}
      if(prefix==='border'){result['border-color']=v;continue;}
      if(prefix==='font'){result['font-family']=v.includes('Lora')?'Lora, Georgia, serif':'Inter, Arial, sans-serif';continue;}
      if(prefix==='rotate'){result.rotate=v;continue;}
      if(prefix==='blur'){result.filter=`blur(${v})`;continue;}
      if(prefix==='from'||prefix==='to'){if(v.endsWith('%')){if(prefix==='from')fromStop=v;else toStop=v;}else{if(prefix==='from')from=v;else to=v;}continue;}
    }
    unknown.add(token);
  }
  if(tx!=='0'||ty!=='0')result.translate=`${tx} ${ty}`;
  if(gradient)result.background=`linear-gradient(${gradient}, ${from} ${fromStop}, ${to} ${toStop})`;
  return result;
}
function serialize(style){return Object.entries(style).map(([k,v])=>`${k}:${v}`).join(';');}
const chapterIds={desktop:['15:443','15:416','15:594','15:731'],mobile:['15:889','15:909','15:924','15:1034']};
const photoIds={desktop:['15:576','15:577','15:578','15:579','15:627','15:628','15:629','15:630','15:639','15:761','15:777'],mobile:['15:987','15:988','15:989','15:990','15:982','15:1006','15:1066','15:1082']};
const artRoots=[];
for(const variant of ['desktop','mobile']) {
  const source = await readFile(`tools/reference/${variant}-current.txt`,'utf8');
  const ast=parse(source,{sourceType:'module',plugins:['jsx']});
  const bindings={};
  for(const node of ast.program.body)if(node.type==='VariableDeclaration')for(const d of node.declarations){
    if(d.init.type==='StringLiteral')bindings[d.id.name]=d.init.value;
    if(d.init.type==='TemplateLiteral')bindings[d.id.name]='assets/'+d.init.quasis.at(-1).value.cooked.replace(/^\//,'');
  }
  function value(n){
    if(n.type==='StringLiteral'||n.type==='NumericLiteral')return n.value;
    if(n.type==='Identifier')return bindings[n.name];
    if(n.type==='TemplateLiteral')return n.quasis.map((q,i)=>q.value.cooked+(n.expressions[i]?value(n.expressions[i]):'')).join('');
    throw new Error('Unsupported expression '+n.type);
  }
  function render(node,root=false,parentTop=0){
    if(node.type==='JSXText')return /^\s*$/.test(node.value)?'':escape(node.value.replace(/\n\s*/g,' ').trim());
    if(node.type==='JSXExpressionContainer')return escape(value(node.expression));
    if(node.type!=='JSXElement')throw new Error(node.type);
    let tag=node.openingElement.name.name;
    const attrs={},style={};let classes='';
    for(const attr of node.openingElement.attributes){
      const name=attr.name.name;
      if(name==='className'){classes=attr.value.value;Object.assign(style,css(classes));}
      else if(name==='style'){for(const p of attr.value.expression.properties)style[p.key.name.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())]=value(p.value);}
      else attrs[name]=attr.value?attr.value.type==='JSXExpressionContainer'?value(attr.value.expression):attr.value.value:'';
    }
    const id=attrs['data-node-id'];
    // Figma exports mask geometry in canvas coordinates. Intersect nested masks
    // explicitly: the browser's default union exposes the rectangular source.
    if(style['mask-image'])Object.assign(style,{'mask-mode':'alpha','mask-composite':'intersect','mask-repeat':'no-repeat','mask-clip':'no-clip'});
    // The export reflects this branch's canvas-space mask twice. Use Figma's
    // isolated transparent rendering of the visible branch at its native bounds.
    const isolatedBranch=id==='15:806';
    if(isolatedBranch){Object.keys(style).forEach(k=>delete style[k]);Object.assign(style,{position:'absolute',left:'0',top:'12522px',width:'113px',height:'672px'});}
    // Figma rounds these fractional-font list rows to a 30px line box.
    // Preserve that rhythm so the auto-layout icons keep their design positions.
    if(['15:962','15:965','15:968','15:971','15:974','15:977','15:978'].includes(id))style['line-height']='30px';
    // Figma OUTSIDE strokes extend by their full weight; CSS strokes are centered.
    const strokeMap={'15:466':[4,'#f2e0c5'],'15:697':[4,'#eedca8'],'15:454':[1.7686,'#f5efd7'],'15:877':[1.6873,'#f2e0c5'],'15:900':[1.2261,'#f5efd7'],'15:1011':[2.2297,'#eedca8']};
    if(strokeMap[id]){style['-webkit-text-stroke']=`${strokeMap[id][0]}px ${strokeMap[id][1]}`;style['paint-order']='stroke fill';}
    const isText=classes.includes("font-['")&&tag!=='a';
    const isChapter=chapterIds[variant].includes(id);
    if(root){tag='article';attrs.class=`case-art case-art--${variant}`;attrs['data-width']=variant==='desktop'?1440:430;attrs['data-height']=15432;attrs['aria-label']='Кейс рекламной кампании Суварстроит';delete style.position;delete style.width;delete style.height;}
    else {
      attrs.class=`design-layer layer-${++seq}`;
      if((isText && style.position==='absolute') || ['15:501','15:880','15:884'].includes(id))attrs.class+=' story-copy';
      if(isChapter){attrs.class+=' chapter-heading';attrs.id=`${variant}-chapter-${chapterIds[variant].indexOf(id)+1}`;tag='h2';}
      if(photoIds[variant].includes(id)){attrs.class+=' expandable';attrs.tabindex='0';attrs.role='button';attrs['aria-label']=`Увеличить ${attrs['data-name']?.startsWith('Баннер')?'баннер':'иллюстрацию или таблицу'}`;}
      const sceneLayers = {'34:1107':'background','34:1113':'sofa','15:459':'characters','37:1118':'table'};
      if (variant === 'desktop' && sceneLayers[id]) {
        attrs.class += ' hero-scene';
        attrs['data-scene-layer'] = sceneLayers[id];
      }
      if(variant === 'mobile' && ['15:860','15:861','15:863'].includes(id))attrs.class+=' hero-scene';
      const controls=variant==='desktop'?['15:737','15:740']:['15:1043','15:1050'];
      if(controls.includes(id)){tag='button';attrs.type='button';attrs.class+=' gallery-control';attrs['data-direction']=controls.indexOf(id)===0?'previous':'next';attrs['aria-label']=controls.indexOf(id)===0?'Предыдущий материал':'Следующий материал';}
      if(id===(variant==='desktop'?'15:750':'15:1039'))attrs.class+=' gallery-window';
      if(id===(variant==='desktop'?'15:751':'15:1041'))attrs.class+=' gallery-frame';
      cssRules.push(`.layer-${seq}{${serialize(style)}}`);
    }
    const positionedTop=style.display==='contents'?parentTop:parentTop+(style.top?.endsWith('px')?parseFloat(style.top):0);
    if(tag==='img'){
      attrs.alt='';attrs.decoding='async';
      // Lazy-load all pictures below the opening illustrated scene.
      attrs.loading=positionedTop>1400?'lazy':'eager';
      manifests.push({variant,node:id||null,src:attrs.src,style});
    }
    if(tag==='a'){attrs.rel='noopener noreferrer';attrs['aria-label']='Открыть предложение Суварстроит';}
    let body=isolatedBranch?'<img src="assets/chapter-four-left-branch.png" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;pointer-events:none">':node.children.map(n=>render(n,false,positionedTop)).join('');
    if(isolatedBranch)manifests.push({variant,node:id,src:'assets/chapter-four-left-branch.png',style});
    if(attrs.class?.includes('gallery-window'))body+=`<div class="gallery-media">${[['10090.png','Зилант за окном квартиры'],['7fbf1.png','Су Анасы и Шурале'],['13512.png','Шурале на билборде']].map(([file,name],index)=>`<button type="button" class="gallery-slide" data-slide="${index}" aria-label="Увеличить иллюстрацию: ${name}"><img src="assets/${file}" alt="${name}" loading="lazy" decoding="async"></button>`).join('')}</div>`;
    // The lanterns are painted into the original transparent source images.
    // Add light at their exact local image coordinates; preserve the source art.
    if(node.children.some(n=>n.type==='JSXElement'&&n.openingElement.name.name==='img')){
      const image=node.children.find(n=>n.type==='JSXElement'&&n.openingElement.name.name==='img');
      const src=image.openingElement.attributes.find(a=>a.name.name==='src');
      const path=src?value(src.value.expression):'';
      if(path==='assets/435aa.png')body+='<span class="lantern-glow lantern-glow--hanging" aria-hidden="true"></span>';
      if(path==='assets/1bf9f.png')body+='<span class="lantern-glow lantern-glow--books" aria-hidden="true"></span>';
    }
    return `<${tag} ${Object.entries(attrs).map(([k,v])=>`${k}="${escape(v)}"`).join(' ')}>${['img','br'].includes(tag)?'':body+`</${tag}>`}`;
  }
  const exp=ast.program.body.find(n=>n.type==='ExportDefaultDeclaration');
  const root=exp.declaration.body.body.find(n=>n.type==='ReturnStatement').argument;
  artRoots.push(render(root,true).replace('</article>','<p class="sr-only gallery-status" aria-live="polite"></p></article>'));
}
if(unknown.size)throw new Error('Unconverted styling: '+[...unknown].join(', '));
await writeFile('design.css',`/* Native CSS for the art-directed Figma layers. No utility CSS runtime. */\n${cssRules.join('\n')}\n`);
await writeFile('assets-manifest.json',JSON.stringify(manifests,null,2));
await writeFile('index.html',`<!doctype html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#11120a"><meta name="description" content="Как герои татарского фольклора помогли Суварстроит выделиться на рынке недвижимости. Кейс Reaspekt Creative."><title>Суварстроит · Сказка становится реальностью</title><link rel="stylesheet" href="assets/font-inter.css"><link rel="stylesheet" href="assets/font-italic.css"><link rel="stylesheet" href="assets/font-lora.css"><link rel="stylesheet" href="design.css"><link rel="stylesheet" href="styles.css"></head>
<body><a class="skip-link" href="#case">Перейти к кейсу</a><h1 class="sr-only">Поселили героев татарского фольклора в новостройки</h1>
<nav class="chapter-nav" aria-label="Навигация по кейсу"><a class="nav-brand" href="#case">#СУВАРСТРОИТ</a><button class="chapter-toggle" aria-expanded="false" aria-controls="chapter-links">Главы <span aria-hidden="true">+</span></button><div id="chapter-links" class="chapter-links"><button data-chapter="1">Идея</button><button data-chapter="2">Герои</button><button data-chapter="3">Эксперимент</button><button data-chapter="4">Продолжение</button></div><button class="motion-toggle" aria-pressed="false" aria-label="Отключить анимации">Анимация: вкл.</button></nav>
<main id="case"><span class="nav-sentinel" aria-hidden="true"></span><div class="art-shell">${artRoots.join('\n')}</div></main>
<dialog class="image-dialog" aria-label="Увеличенное изображение"><button class="dialog-close" aria-label="Закрыть изображение">×</button><img class="dialog-image" alt=""><p class="dialog-caption"></p></dialog>
<button class="back-to-top" aria-label="Вернуться к началу">↑</button><script defer src="assets/gsap.min.js"></script><script defer src="assets/ScrollTrigger.min.js"></script><script defer src="effects.js"></script><script defer src="script.js"></script></body></html>`);
console.log(`Converted ${seq} layers to native HTML/CSS; ${manifests.length} image placements.`);

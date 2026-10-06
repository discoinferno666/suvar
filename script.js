gsap.registerPlugin(ScrollTrigger);
const shell = document.querySelector('.art-shell');
const artboards = [...document.querySelectorAll('.case-art')];
const mobileQuery = matchMedia('(max-width: 1099px)');
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
const nav = document.querySelector('.chapter-nav');
const topButton = document.querySelector('.back-to-top');
const motionButton = document.querySelector('.motion-toggle');
const chapterToggle = document.querySelector('.chapter-toggle');
const chapterLinks = document.querySelector('.chapter-links');
const dialog = document.querySelector('.image-dialog');
let motionOff = reducedQuery.matches;
let animationContext;
let sceneParallaxContext;
let artworkWidth = 0;
let artworkViewportWidth = 0;
let layoutFrame;
let chapterFrame;
let opener;
const storyEffects = createStoryEffects();
const activeArtboard = () => artboards[mobileQuery.matches ? 1 : 0];

function resizeArtwork() {
  const active = activeArtboard();
  const width = shell.clientWidth;
  const viewportWidth = document.documentElement.clientWidth;
  const scale = width / Number(active.dataset.width);
  for (const artboard of artboards) artboard.style.setProperty('--art-scale', scale);
  shell.style.height = `${Number(active.dataset.height) * scale}px`;
  if (artworkWidth && (width !== artworkWidth || viewportWidth !== artworkViewportWidth)) animateSceneParallax();
  artworkWidth = width;
  artworkViewportWidth = viewportWidth;
  ScrollTrigger.refresh();
  updateCurrentChapter();
}

function animateSceneParallax() {
  sceneParallaxContext?.revert();
  sceneParallaxContext = undefined;
  if (motionOff) return;
  const art = activeArtboard();
  const background = art.querySelector('[data-scene-layer="background"]');
  const sofa = art.querySelector('[data-scene-layer="sofa"]');
  const table = art.querySelector('[data-scene-layer="table"]');
  if (!background || !sofa || !table) return;
  const scale = shell.clientWidth / Number(art.dataset.width);
  // Figma positions this layer by its centre (translate-x: -50%).
  // Layout offsets exclude animation, keeping the limit stable while scrolled.
  const initialRight = art.getBoundingClientRect().left
    + (table.offsetLeft + table.offsetWidth / 2) * scale;
  const room = (initialRight - document.documentElement.clientWidth) / scale;
  const travel = Math.min(112, Math.max(0, room));
  // Rebuild only this context when the artwork width changes. Reverting first
  // restores CSS centring before GSAP measures the new horizontal transforms.
  sceneParallaxContext = gsap.context(() => {
    const timeline = gsap.timeline({paused: true})
      .fromTo(background, {x: 0}, {x: 96, duration: 1, ease: 'none'}, 0)
      .fromTo(table, {x: 0}, {x: -112, duration: 1, ease: progress => Math.min(progress, travel / 112)}, 0);
    ScrollTrigger.create({
      animation: timeline,
      trigger: sofa,
      start: () => Math.max(0, art.getBoundingClientRect().top + window.scrollY + sofa.offsetTop * scale - innerHeight),
      end: () => art.getBoundingClientRect().top + window.scrollY + (sofa.offsetTop + sofa.offsetHeight) * scale,
      scrub: .65
    });
  }, art);
}

function animateStory() {
  sceneParallaxContext?.revert();
  sceneParallaxContext = undefined;
  animationContext?.revert();
  const art = activeArtboard();
  animationContext = gsap.context(() => {
    const heroCopy = [...art.querySelectorAll('.story-copy')].filter(el => el.getBoundingClientRect().top-art.getBoundingClientRect().top < 1300*shell.clientWidth/Number(art.dataset.width));
    const cleanups = [];
    if (!motionOff) {
      cleanups.push(storyEffects.paintText(heroCopy,true));
      cleanups.push(storyEffects.candlelight(art));
      const scene = art.querySelectorAll('.hero-scene');
      if (scene.length) {
        gsap.from(scene, { opacity: 0, duration: 1.8, ease: 'power2.out' });
        if (art.classList.contains('case-art--mobile')) {
          // Keep the existing mobile scene animation; its artwork is combined.
          gsap.to(scene, {y: -35, ease: 'none', scrollTrigger: {
            trigger: art, start: 'top top', end: 'top -1000', scrub: 1.2
          }});
        }
      }
      const laterCopy=[...art.querySelectorAll('.story-copy,.chapter-heading')].filter(copy=>!heroCopy.includes(copy));
      cleanups.push(storyEffects.paintText(laterCopy));
      for (const picture of art.querySelectorAll('.expandable')) {
        gsap.from(picture, { y: 24, opacity: 0, duration: .95, ease: 'power3.out', scrollTrigger: { trigger: picture, start: 'top 94%', toggleActions:'play none none none' } });
      }
    }
    return () => cleanups.forEach(cleanup=>cleanup());
  }, art);
  animateSceneParallax();
  storyEffects.setFireflies(!motionOff);
  motionButton.textContent = `Анимация: ${motionOff ? 'выкл.' : 'вкл.'}`;
  motionButton.setAttribute('aria-pressed', String(motionOff));
  motionButton.setAttribute('aria-label', motionOff ? 'Включить анимации' : 'Отключить анимации');
  ScrollTrigger.refresh();
}

function setChapter(number) { document.querySelectorAll('[data-chapter]').forEach(button => button.classList.toggle('is-current', Number(button.dataset.chapter) === number)); }
// Figma's layer order differs from the reading order in the current composition.
// Derive the current chapter from its rendered position, including artwork scale.
function updateCurrentChapter() {
  const headings = [...activeArtboard().querySelectorAll('.chapter-heading')]
    .map(heading => ({ number: Number(heading.id.split('-').at(-1)), top: heading.getBoundingClientRect().top }))
    .sort((a, b) => a.top - b.top);
  const current = headings.filter(heading => heading.top <= innerHeight * .35).at(-1);
  setChapter(current?.number || 0);
}
window.addEventListener('scroll', () => {
  cancelAnimationFrame(chapterFrame);
  chapterFrame = requestAnimationFrame(updateCurrentChapter);
}, { passive: true });
function closeMenu() { chapterLinks.classList.remove('is-open'); chapterToggle.setAttribute('aria-expanded', 'false'); }
chapterToggle.addEventListener('click', () => { const open = chapterLinks.classList.toggle('is-open'); chapterToggle.setAttribute('aria-expanded', String(open)); });
document.querySelectorAll('[data-chapter]').forEach(button => button.addEventListener('click', () => { const variant=mobileQuery.matches?'mobile':'desktop'; const target=document.getElementById(`${variant}-chapter-${button.dataset.chapter}`); if(target){const top=target.getBoundingClientRect().top+window.scrollY-90;window.scrollTo({top,behavior:motionOff?'instant':'smooth'});} closeMenu(); }));
topButton.addEventListener('click', () => window.scrollTo({top:0,behavior:motionOff?'instant':'smooth'}));
motionButton.addEventListener('click', () => { motionOff = !motionOff; animateStory(); });
reducedQuery.addEventListener('change', event => { motionOff=event.matches; animateStory(); });
mobileQuery.addEventListener('change', () => { resizeArtwork(); animateStory(); closeMenu(); });
new ResizeObserver(() => { cancelAnimationFrame(layoutFrame); layoutFrame=requestAnimationFrame(resizeArtwork); }).observe(shell);
window.addEventListener('resize', () => {cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(resizeArtwork);}, {passive:true});
new IntersectionObserver(([entry])=>{
  const visible=entry.boundingClientRect.top<0;
  nav.classList.toggle('is-visible',visible);
  topButton.classList.toggle('is-visible',visible);
}).observe(document.querySelector('.nav-sentinel'));

function openImage(element) {
  const image = element.querySelector('img');
  if (!image) return;
  opener = element;
  const caption = element.dataset.name?.startsWith('Баннер') ? element.dataset.name.replace(/\s\d.*$/, '') : element.querySelector('img').src.includes('6cc44') ? 'Результаты рекламной кампании' : 'Материалы рекламной кампании';
  dialog.querySelector('img').src=image.src;
  dialog.querySelector('img').alt=caption;
  dialog.querySelector('p').textContent=caption;
  dialog.showModal();
  document.body.classList.add('viewer-open');
  if (!motionOff) gsap.fromTo(dialog, {y:15,opacity:0}, {y:0,opacity:1,duration:.3,ease:'power2.out'});
}
document.querySelectorAll('.expandable,.gallery-slide').forEach(element => { element.addEventListener('click',()=>openImage(element)); element.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openImage(element);}}); });
dialog.querySelector('button').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{document.body.classList.remove('viewer-open');opener?.focus({preventScroll:true});});
document.addEventListener('keydown', event => {if(event.key==='Escape')closeMenu();});

let galleryIndex = 0;
function renderGallery(animated = false) {
  for (const art of artboards) {
    const slides = [...art.querySelectorAll('.gallery-slide')];
    for (const [index,slide] of slides.entries()) {
      const selected = index === galleryIndex;
      gsap.killTweensOf(slide);
      slide.setAttribute('aria-hidden',String(!selected));
      slide.tabIndex=selected?0:-1;
      slide.style.pointerEvents=selected?'auto':'none';
      if(animated&&!motionOff&&art===activeArtboard())gsap.to(slide,{autoAlpha:selected?1:0,duration:.65,ease:'sine.inOut'});
      else gsap.set(slide,{autoAlpha:selected?1:0});
    }
    art.querySelector('.gallery-status').textContent=`Материал ${galleryIndex+1} из ${slides.length}`;
  }
}
document.querySelectorAll('.gallery-control').forEach(button=>button.addEventListener('click',()=>{
  const count=activeArtboard().querySelectorAll('.gallery-slide').length;
  galleryIndex=(galleryIndex+(button.dataset.direction==='next'?1:-1)+count)%count;
  renderGallery(true);
}));
renderGallery();

resizeArtwork();
document.fonts.ready.then(() => {resizeArtwork();animateStory();});
window.addEventListener('pagehide',()=>{sceneParallaxContext?.revert();animationContext?.revert();},{once:true});

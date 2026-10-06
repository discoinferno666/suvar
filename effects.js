/* GSAP ink reveals and candlelight; a small, bounded canvas swarm for the cursor. */
window.createStoryEffects = function () {
  const namespace = 'http://www.w3.org/2000/svg';
  let filterNumber = 0;
  let canvas, context, particles = [], enabled = false, running = false;
  let pointer = {x:0,y:0}, lastMove = 0, lastSpawn = 0, lastFrame = 0;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

  function paintText(elements, initial = false) {
    const svg = document.createElementNS(namespace, 'svg');
    svg.classList.add('effect-definitions');
    svg.setAttribute('aria-hidden', 'true');
    const defs = document.createElementNS(namespace, 'defs');
    svg.append(defs);
    document.body.append(svg);
    const painted = [];
    elements.forEach((element, index) => {
      const filter = document.createElementNS(namespace, 'filter');
      const id = `ink-wash-${++filterNumber}`;
      filter.setAttribute('id', id);
      filter.setAttribute('x', '-10%');filter.setAttribute('y', '-25%');
      filter.setAttribute('width', '120%');filter.setAttribute('height', '150%');
      filter.setAttribute('color-interpolation-filters', 'sRGB');
      filter.innerHTML = `<feTurbulence type="fractalNoise" baseFrequency=".018 .085" numOctaves="3" seed="${index+3}" result="paper"/><feColorMatrix in="paper" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .333 .333 .333 0 0" result="grain"/><feComponentTransfer in="grain" result="wet"><feFuncA type="linear" slope="16" intercept="-12"/></feComponentTransfer><feGaussianBlur in="wet" stdDeviation=".35" result="wash"/><feComposite in="SourceGraphic" in2="wash" operator="in"/>`;
      defs.append(filter);
      const alpha = filter.querySelector('feFuncA');
      element.classList.add('ink-painting');
      gsap.set(element, {filter:`url(#${id})`, '--ink-progress':'-15%'});
      const timeline = gsap.timeline({
        delay: initial ? .15 + index*.12 : 0,
        scrollTrigger: initial ? undefined : {trigger:element,start:'top 94%',toggleActions:'play none none none'},
        onComplete: () => {element.classList.remove('ink-painting');element.style.removeProperty('filter');element.style.removeProperty('--ink-progress');}
      });
      timeline.to(element, {'--ink-progress':'118%',duration:1.55,ease:'sine.inOut'},0)
        .to(alpha, {attr:{intercept:0},duration:1.65,ease:'power1.out'},0);
      painted.push(element);
    });
    return () => {for(const element of painted){element.classList.remove('ink-painting');element.style.removeProperty('filter');element.style.removeProperty('--ink-progress');}svg.remove();};
  }

  function candlelight(artboard) {
    const variants = {
      '435aa.png': ['hanging', 'assets/lantern-hanging-dim.png'],
      '1bf9f.png': ['books', 'assets/lantern-books-dim.png'],
      '003a7.png': ['city', 'assets/lantern-city-dim.png']
    };
    const lights = [];
    const glowPositions = {
      hanging: [[.111, .51, .32, .64]],
      books: [[.841, .477, .44, .44]],
      city: [[.278, .71, .36, .38], [.627, .12, .18, .20]]
    };
    function addHalos(original, type) {
      const imageBounds = original.getBoundingClientRect();
      const artBounds = artboard.getBoundingClientRect();
      const scale = artBounds.width / Number(artboard.dataset.width);
      const mirrored = original.closest('[data-node-id="15:525"], [data-node-id="15:685"]');
      // Put the light outside the source masks so its soft edge reaches the
      // surroundings. Coordinates remain in the scaled artboard's own space.
      return glowPositions[type].map(([x, y, width, height]) => {
        const glow = document.createElement('span');
        glow.className = 'lantern-halo';
        glow.setAttribute('aria-hidden', 'true');
        Object.assign(glow.style, {
          left: `${(imageBounds.left - artBounds.left + imageBounds.width * (mirrored ? 1 - x : x)) / scale}px`,
          top: `${(imageBounds.top - artBounds.top + imageBounds.height * y) / scale}px`,
          width: `${imageBounds.width * width / scale}px`,
          height: `${imageBounds.height * height / scale}px`
        });
        artboard.append(glow);
        return glow;
      });
    }
    let disposed = false;
    const resumeVisible = () => lights.forEach(light => {
      if (light.ready && light.visible && !document.hidden) light.pulse.play();
      else light.pulse.pause();
    });
    // Clone the exact image geometry inside its existing Figma masks. Only the
    // glass is exposed, so generated details never move the frame or foliage.
    for (const original of artboard.querySelectorAll('img')) {
      // Production images retain their original filename with a .webp suffix.
      const variant = variants[original.getAttribute('src')?.split('/').at(-1)?.replace(/\.webp$/i, '')];
      if (!variant) continue;
      const dim = original.cloneNode(false);
      dim.src = variant[1];
      dim.classList.add('lantern-dim', `lantern-dim--${variant[0]}`);
      dim.setAttribute('aria-hidden', 'true');
      original.after(dim);
      const index = lights.length;
      const hero = original.closest('[data-node-id="15:475"], [data-node-id="15:869"]');
      const addedHalos = hero ? [] : addHalos(original, variant[0]);
      const halo = hero ? [...artboard.querySelectorAll(artboard.classList.contains('case-art--desktop')
        ? '[data-node-id="15:470"]'
        : '[data-node-id="15:866"]')] : addedHalos;
      if (addedHalos.length) gsap.set(addedHalos, {opacity: .85});
      const pulse = gsap.timeline({repeat: -1, paused: true});
      const light = {pulse, ready: false, visible: false};
      const pace = 1 + (index % 4) * .09;
      // Every cycle ends at its starting value with zero velocity at the seam.
      for (const [opacity, duration] of [[1, 1.25], [.42, .65], [.82, .85], [0, 1.5]]) {
        const at = pulse.duration();
        pulse.to(dim, {opacity, duration: duration * pace, ease: 'sine.inOut'}, at);
        if (halo.length) pulse.to(halo, {opacity: hero ? 1 - opacity * .7 : .85 - opacity * .75,
          duration: duration * pace, ease: 'sine.inOut'}, at);
      }
      const trigger = ScrollTrigger.create({trigger: original, start: 'top bottom', end: 'bottom top',
        onToggle: self => {light.visible = self.isActive; resumeVisible();}});
      light.visible = trigger.isActive;
      light.trigger = trigger;
      light.dim = dim;
      light.halos = addedHalos;
      lights.push(light);
      // Do not start the halo until its dim image is decoded. On failure the
      // original bright state remains intact; rebuilding cannot revive old loops.
      dim.decode().then(() => {
        if (disposed) return;
        light.ready = true;
        resumeVisible();
      }).catch(() => { if (!disposed) {dim.remove(); addedHalos.forEach(glow => glow.remove());} });
    }
    document.addEventListener('visibilitychange', resumeVisible);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', resumeVisible);
      for (const {pulse, trigger, dim, halos} of lights) {
        trigger.kill(); pulse.kill(); dim.remove(); halos.forEach(glow => glow.remove());
      }
    };
  }

  function sizeCanvas() {
    if(!canvas||!context)return;
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);
    context.setTransform(dpr,0,0,dpr,0,0);
  }
  function resetSwarm() {
    particles=[];
    if(running){gsap.ticker.remove(drawSwarm);running=false;}
    context?.clearRect(0,0,innerWidth,innerHeight);
  }
  function drawSwarm() {
    const now=performance.now(),dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;
    context.clearRect(0,0,innerWidth,innerHeight);
    particles=particles.filter(p=>now-p.born<p.life);
    for(const p of particles){
      const age=(now-p.born)/p.life;
      p.vx+=(pointer.x-p.x)*dt*.055;p.vy+=(pointer.y-p.y)*dt*.055;
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      const x=p.x+Math.sin(now*.0015+p.phase)*8,y=p.y+Math.cos(now*.0018+p.phase)*6;
      const alpha=Math.sin(age*Math.PI)*(.62+.24*Math.sin(now*.007+p.phase));
      const glowRadius=24+p.radius*2;
      const halo=context.createRadialGradient(x,y,0,x,y,glowRadius);
      halo.addColorStop(0,`rgba(255,223,135,${alpha*.9})`);
      halo.addColorStop(.18,`rgba(255,205,91,${alpha*.5})`);
      halo.addColorStop(.45,`rgba(244,180,59,${alpha*.16})`);
      halo.addColorStop(1,'rgba(244,180,59,0)');
      context.fillStyle=halo;context.fillRect(x-glowRadius,y-glowRadius,glowRadius*2,glowRadius*2);
      context.fillStyle=`rgba(255,249,216,${Math.min(1,alpha*1.35)})`;
      context.beginPath();context.arc(x,y,p.radius,0,Math.PI*2);context.fill();
    }
    if(!particles.length&&now-lastMove>150)resetSwarm();
  }
  function followPointer(event) {
    if(!enabled||!finePointer.matches||event.pointerType==='touch'||document.querySelector('dialog[open]'))return;
    if(!canvas)setFireflies(true);
    if(!context)return;
    const now=performance.now();
    pointer={x:event.clientX,y:event.clientY};lastMove=now;
    if(now-lastSpawn>45){
      lastSpawn=now;
      if(particles.length>=24)particles.shift();
      const phase=Math.random()*Math.PI*2;
      particles.push({x:pointer.x+Math.cos(phase)*22,y:pointer.y+Math.sin(phase)*18,vx:(Math.random()-.5)*20,vy:-10-Math.random()*12,born:now,life:1700+Math.random()*800,phase,radius:2.1+Math.random()*1.1});
    }
    if(!running){lastFrame=now;running=true;gsap.ticker.add(drawSwarm);}
  }
  function setFireflies(active) {
    enabled=active;
    if(active&&finePointer.matches&&!canvas){
      canvas=document.createElement('canvas');canvas.className='cursor-fireflies';canvas.setAttribute('aria-hidden','true');
      document.body.append(canvas);context=canvas.getContext('2d');sizeCanvas();
    }
    if(!active)resetSwarm();
  }
  window.addEventListener('pointermove',followPointer,{passive:true});
  window.addEventListener('resize',sizeCanvas,{passive:true});
  window.addEventListener('blur',resetSwarm);
  finePointer.addEventListener('change',()=>{resetSwarm();if(enabled)setFireflies(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetSwarm();});
  return {paintText,candlelight,setFireflies};
};

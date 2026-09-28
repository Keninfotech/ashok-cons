/* Ashok Constructions — interactions & scroll choreography
   Depends on GSAP + ScrollTrigger + Lenis (loaded from CDN, deferred).
   If any of them fail to load, or the visitor prefers reduced motion,
   the page falls back to a fully visible static layout. */
(() => {
  const d = document;
  const root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const small = () => innerWidth < 900;
  const motion = !reduce && !!(window.gsap && window.ScrollTrigger);
  const store = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };

  if (!motion) {
    root.classList.remove('js', 'hero-pending', 'pt');
    root.classList.add('no-motion');
  }

  let lenis = null;
  if (motion) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }
  const lockScroll = (on) => { if (lenis) on ? lenis.stop() : lenis.start(); root.style.overflow = on ? 'hidden' : ''; };
  const scrollToEl = (el, immediate) => {
    const offset = -Math.min(120, innerHeight * 0.12);
    if (lenis) lenis.scrollTo(el, { offset, immediate, duration: 1.4 });
    else scrollTo({ top: el.getBoundingClientRect().top + scrollY + offset, behavior: immediate || reduce ? 'auto' : 'smooth' });
  };

  /* ------------------------------------------------------------------ */
  /* Split text into masked words / chars (keeps an accessible label)   */
  /* ------------------------------------------------------------------ */
  function split(el, chars) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = (node, accent) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const mask = d.createElement('span');
            mask.className = 'wm';
            const w = d.createElement('span');
            // gradient text can't clip through transformed children, so split chars get a solid accent
            w.className = 'word' + (accent ? (chars ? ' accent-solid' : ' accent') : '');
            if (chars) [...part].forEach((c) => { const s = d.createElement('span'); s.className = 'char'; s.textContent = c; w.append(s); });
            else w.textContent = part;
            mask.append(w);
            frag.append(mask);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          const isAccent = n.classList.contains('accent');
          if (isAccent) n.classList.remove('accent');
          walk(n, accent || isAccent);
        }
      });
    };
    walk(el, false);
    $$('.wm', el).forEach((m) => m.setAttribute('aria-hidden', 'true'));
    el.classList.add('is-split');
  }
  if (motion) $$('[data-split]').forEach((el) => split(el, el.dataset.split === 'chars'));

  /* ------------------------------------------------------------------ */
  /* Navigation                                                          */
  /* ------------------------------------------------------------------ */
  const nav = $('.nav');
  if (nav) {
    let lastY = scrollY, ticking = false;
    const onScroll = () => {
      const y = scrollY;
      nav.classList.toggle('is-scrolled', y > 40);
      nav.classList.toggle('is-hidden', y > 500 && y > lastY + 2 && !root.classList.contains('menu-open') && !nav.matches(':focus-within'));
      if (y < lastY - 2) nav.classList.remove('is-hidden');
      lastY = y;
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    // hover pill + active-page dot
    const list = $('.nav__menu', nav);
    const pill = $('.nav__pill', nav);
    const dot = $('.nav__dot', nav);
    const current = $('.nav__links > li > [aria-current="page"], .nav__links > li > .is-current', nav);
    const place = (target) => {
      const r = target.getBoundingClientRect(), lr = list.getBoundingClientRect();
      return { x: r.left - lr.left, w: r.width };
    };
    const placeDot = () => {
      if (!current || !dot || !list.offsetWidth) return;
      const p = place(current);
      dot.style.transform = `translateX(${p.x + p.w / 2 - 2}px)`;
      dot.style.opacity = 1;
    };
    if (list) {
      $$('.nav__links > li > .nav__link', nav).forEach((a) => {
        a.addEventListener('pointerenter', () => {
          const p = place(a);
          pill.style.width = p.w + 'px';
          pill.style.transform = `translateX(${p.x}px)`;
          pill.style.opacity = 1;
        });
      });
      list.addEventListener('pointerleave', () => { pill.style.opacity = 0; });
      if (dot) dot.style.opacity = 0;
      addEventListener('resize', placeDot);
      (d.fonts ? d.fonts.ready : Promise.resolve()).then(placeDot);
    }

    // mobile menu
    const burger = $('.burger', nav);
    const mmenu = $('#mmenu');
    const setMenu = (open) => {
      root.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      mmenu.inert = !open;
      lockScroll(open);
      if (open) nav.classList.remove('is-hidden');
    };
    if (burger && mmenu) {
      mmenu.inert = true;
      burger.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
      d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); burger.focus(); } });
      $$('a', mmenu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    }
  }

  /* in-page anchors + deep links (e.g. projects/#gov-project) */
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = d.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    history.pushState(null, '', url.hash);
    scrollToEl(target);
  });

  /* ------------------------------------------------------------------ */
  /* Page transition curtain                                             */
  /* ------------------------------------------------------------------ */
  const curtain = $('.curtain');
  if (curtain && motion) {
    if (root.classList.contains('pt')) {
      gsap.fromTo(curtain, { clipPath: 'inset(0% 0 0% 0)' }, { clipPath: 'inset(0% 0 100% 0)', duration: 0.9, ease: 'expo.inOut', delay: 0.05 });
    }
    d.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
      if (url.pathname === location.pathname) return; // same page (anchor or self)
      e.preventDefault();
      store.set('ac-pt', '1');
      let gone = false;
      const leave = () => { if (!gone) { gone = true; location.href = url.href; } };
      gsap.fromTo(curtain, { clipPath: 'inset(100% 0 0% 0)' }, { clipPath: 'inset(0% 0 0% 0)', duration: 0.6, ease: 'expo.in', onComplete: leave });
      setTimeout(leave, 800); // animation frames can be throttled; never block navigation on them
    });
    addEventListener('pageshow', (e) => { if (e.persisted) gsap.set(curtain, { clipPath: 'inset(0% 0 100% 0)' }); });
  }

  /* ------------------------------------------------------------------ */
  /* Custom cursor + magnetic elements (desktop fine pointers only)      */
  /* ------------------------------------------------------------------ */
  if (motion && fine) {
    const cur = d.createElement('div');
    cur.className = 'cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<div class="cursor__ring"><span></span></div><div class="cursor__dot"></div>';
    d.body.append(cur);
    root.classList.add('has-cursor');
    const ring = $('.cursor__ring', cur), dotEl = $('.cursor__dot', cur), label = $('span', ring);
    const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
    const dx = gsap.quickTo(dotEl, 'x', { duration: 0.12, ease: 'power3' });
    const dy = gsap.quickTo(dotEl, 'y', { duration: 0.12, ease: 'power3' });
    gsap.set([ring, dotEl], { x: -100, y: -100 });
    addEventListener('pointermove', (e) => { rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY); }, { passive: true });
    d.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor-label], a, button, input, textarea, label');
      cur.classList.toggle('is-hover', !!t);
      const lbl = t && t.closest('[data-cursor-label]');
      cur.classList.toggle('is-label', !!lbl);
      if (lbl) label.textContent = lbl.dataset.cursorLabel;
    });
    d.addEventListener('pointerleave', () => gsap.set([ring, dotEl], { x: -100, y: -100 }));

    $$('[data-magnetic]').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
      const my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.3);
        my((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, .4)' }));
    });
  }

  /* ------------------------------------------------------------------ */
  /* 3D tilt + cursor glow cards                                         */
  /* ------------------------------------------------------------------ */
  if (fine && !reduce) {
    $$('[data-tilt]').forEach((card) => {
      let frame = 0, ev = null;
      const max = parseFloat(card.dataset.tilt) || 6;
      const update = () => {
        frame = 0;
        const r = card.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
        card.style.setProperty('--mx', px * 100 + '%');
        card.style.setProperty('--my', py * 100 + '%');
        card.style.setProperty('--rx', (0.5 - py) * max + 'deg');
        card.style.setProperty('--ry', (px - 0.5) * max + 'deg');
      };
      card.addEventListener('pointerenter', () => card.classList.add('is-tilting'));
      card.addEventListener('pointermove', (e) => { ev = e; if (!frame) frame = requestAnimationFrame(update); });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hero: slideshow, particles, parallax, intro                         */
  /* ------------------------------------------------------------------ */
  const hero = $('.hero');
  let heroIntro = null;
  if (hero) {
    const slides = $$('.hero__slide', hero);
    const caps = $$('.ticker__caption span', hero);
    const bars = $$('.ticker__bars button', hero);
    const num = $('.ticker__num b', hero);
    const DUR = 7000;
    let idx = 0, timer = 0, remaining = DUR, startedAt = 0, visible = true;
    hero.style.setProperty('--dur', DUR / 1000 + 's');

    const load = (i) => { const img = $('img[data-src]', slides[i]); if (img) { img.src = img.dataset.src; img.removeAttribute('data-src'); } };
    const go = (i) => {
      load(i); load((i + 1) % slides.length);
      slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
      caps.forEach((c, k) => { c.classList.toggle('is-out', k === idx && k !== i); c.classList.toggle('is-active', k === i); });
      bars.forEach((b, k) => { b.classList.toggle('is-active', k === i); b.classList.toggle('is-done', k < i); b.setAttribute('aria-current', k === i); });
      if (num) num.textContent = String(i + 1).padStart(2, '0');
      idx = i;
      schedule(DUR);
    };
    const schedule = (ms) => { clearTimeout(timer); remaining = ms; startedAt = Date.now(); if (visible) timer = setTimeout(() => go((idx + 1) % slides.length), ms); };
    const pause = () => { clearTimeout(timer); remaining -= Date.now() - startedAt; hero.classList.add('is-paused'); };
    const resume = () => { hero.classList.remove('is-paused'); schedule(Math.max(remaining, 400)); };
    bars.forEach((b, k) => b.addEventListener('click', () => go(k)));

    // particles: cheap drifting dust, only while the hero is on screen
    const canvas = $('.hero__fx canvas', hero);
    let fx = null;
    if (canvas && !reduce) {
      const ctx = canvas.getContext('2d');
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      let w = 0, h = 0, raf = 0, pts = [];
      const make = (y) => ({ x: Math.random() * w, y: y ?? Math.random() * h, r: Math.random() * 1.5 + 0.3, vy: -(Math.random() * 0.25 + 0.05), vx: (Math.random() - 0.5) * 0.12, a: Math.random() * 0.55 + 0.15 });
      const size = () => { w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
      const frame = () => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#9fdcff';
        for (const p of pts) {
          p.x += p.vx; p.y += p.vy;
          if (p.y < -4) Object.assign(p, make(h + 4));
          ctx.globalAlpha = p.a;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
        }
        raf = requestAnimationFrame(frame);
      };
      size();
      pts = Array.from({ length: innerWidth < 700 ? 26 : 64 }, () => make());
      addEventListener('resize', size);
      fx = { start: () => { if (!raf) frame(); }, stop: () => { cancelAnimationFrame(raf); raf = 0; } };
    }

    // pause everything when the hero is off-screen or the tab is hidden
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !d.hidden;
      if (visible) { resume(); fx && fx.start(); } else { pause(); fx && fx.stop(); }
    }).observe(hero);
    d.addEventListener('visibilitychange', () => {
      if (d.hidden) { visible = false; pause(); fx && fx.stop(); }
      else if (hero.getBoundingClientRect().bottom > 0) { visible = true; resume(); fx && fx.start(); }
    });

    // optional background video: set data-video="assets/video/hero.mp4" on .hero__media
    const media = $('.hero__media', hero);
    if (media && media.dataset.video && !reduce && !(navigator.connection && navigator.connection.saveData)) {
      const v = d.createElement('video');
      Object.assign(v, { muted: true, loop: true, playsInline: true, autoplay: true, className: 'hero__video' });
      v.setAttribute('aria-hidden', 'true');
      v.src = media.dataset.video;
      v.addEventListener('canplay', () => { v.classList.add('is-ready'); v.play().catch(() => {}); }, { once: true });
      v.addEventListener('error', () => v.remove(), { once: true });
      media.append(v);
    }

    go(0);

    if (motion) {
      // mouse depth parallax
      if (fine) {
        const layers = $$('[data-depth]', hero).map((el) => ({
          depth: parseFloat(el.dataset.depth),
          x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }),
          y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3' }),
        }));
        hero.addEventListener('pointermove', (e) => {
          const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
          layers.forEach((l) => { l.x(nx * l.depth * 60); l.y(ny * l.depth * 60); });
        });
      }
      // scroll-out: content lifts away while the image sinks and scales
      // (created after the intro so it records the revealed state as its start)
      const scrollOut = () => gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
        .to('.hero__content', { yPercent: -18, opacity: 0, ease: 'none' }, 0)
        .to('.hero__media', { yPercent: 14, scale: 1.08, ease: 'none' }, 0)
        .to('.hero .float-card', { yPercent: -120, opacity: 0, stagger: 0.05, ease: 'none' }, 0);

      heroIntro = () => {
        root.classList.remove('hero-pending');
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: scrollOut });
        tl.from('.hero__media', { scale: 1.25, opacity: 0, filter: 'blur(20px)', duration: 2.2, clearProps: 'filter' })
          .from('.hero .orb', { scale: 0.4, opacity: 0, duration: 2, stagger: 0.2 }, 0.2)
          .from('.hero .eyebrow', { y: 20, opacity: 0, duration: 1 }, 0.5)
          .from('.hero__title .char', { yPercent: 115, rotate: 8, duration: 1.3, stagger: 0.018 }, 0.6)
          .from('.hero__lead', { y: 30, opacity: 0, duration: 1.2 }, 1.2)
          .from('.hero__actions > *', { y: 30, opacity: 0, duration: 1.1, stagger: 0.1 }, 1.35)
          .from('.hero__ticker', { y: 30, opacity: 0, duration: 1.1 }, 1.5)
          .from('.hero .float-card', { y: 60, opacity: 0, scale: 0.9, duration: 1.4, stagger: 0.14 }, 1.4)
          .from('.scroll-cue', { opacity: 0, y: 20, duration: 1 }, 1.9);
      };
    }
  }

  /* ------------------------------------------------------------------ */
  /* Loader (home, first visit per session)                              */
  /* ------------------------------------------------------------------ */
  const loader = $('.loader');
  const startIntro = () => { if (heroIntro) heroIntro(); else root.classList.remove('hero-pending'); };
  if (loader && motion && !root.classList.contains('seen')) {
    store.set('ac-seen', '1');
    lockScroll(true);
    const count = $('.loader__count', loader);
    const prog = { v: 0 };
    gsap.timeline()
      .from('.loader__mark path', { scale: 0, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'back.out(2)' })
      .from('.loader__word span', { yPercent: 110, duration: 0.8, stagger: 0.05, ease: 'expo.out' }, 0.2)
      .to('.loader__bar i', { scaleX: 1, duration: 1.3, ease: 'power2.inOut' }, 0.2)
      .to(prog, { v: 100, duration: 1.3, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(prog.v)).padStart(3, '0'); } }, 0.2)
      .to('.loader__inner', { y: -40, opacity: 0, duration: 0.5, ease: 'power2.in' }, 1.6)
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, 1.8)
      .add(() => { startIntro(); lockScroll(false); }, 2.0)
      .add(() => loader.remove());
  } else {
    if (loader) loader.remove();
    if (motion) gsap.delayedCall(root.classList.contains('pt') ? 0.35 : 0.05, startIntro);
    else startIntro();
  }

  /* ------------------------------------------------------------------ */
  /* Scroll choreography                                                 */
  /* ------------------------------------------------------------------ */
  if (motion) {
    const once = (trigger, start = 'top 85%') => ({ trigger, start, once: true });

    // headings & text
    $$('[data-split]').forEach((el) => {
      if (el.closest('.hero')) return;
      const type = el.dataset.split;
      if (type === 'chars') {
        gsap.from($$('.char', el), { yPercent: 115, rotate: 6, duration: 1.2, stagger: 0.02, ease: 'expo.out', scrollTrigger: once(el, 'top 90%'), delay: el.closest('.phero') ? 0.35 : 0 });
      } else if (type === 'blur') {
        gsap.from($$('.word', el), { opacity: 0, filter: 'blur(12px)', y: 16, duration: 1.1, stagger: 0.035, ease: 'power3.out', clearProps: 'filter', scrollTrigger: once(el) });
      } else if (type === 'scrub') {
        gsap.to($$('.word', el), { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: 0.5 } });
      } else {
        gsap.from($$('.word', el), { yPercent: 110, rotate: 3, duration: 1.1, stagger: 0.06, ease: 'expo.out', scrollTrigger: once(el) });
      }
    });

    // generic reveals
    const enter = { up: { y: 0 }, left: { x: 0 }, right: { x: 0 }, blur: { filter: 'blur(0px)', scale: 1 } };
    $$('[data-anim]').forEach((el) => {
      const type = el.dataset.anim;
      if (enter[type]) {
        gsap.to(el, { opacity: 1, ...enter[type], duration: 1.3, ease: 'expo.out', delay: parseFloat(el.dataset.delay) || 0, scrollTrigger: once(el), onComplete: () => { el.style.filter = 'none'; } });
      } else if (type === 'stagger') {
        gsap.to(el.children, { opacity: 1, y: 0, duration: 1.1, stagger: 0.09, ease: 'expo.out', scrollTrigger: once(el) });
      } else if (type === 'clip') {
        gsap.timeline({ scrollTrigger: once(el, 'top 88%') })
          .to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.5, ease: 'expo.inOut' })
          .to($$('img', el), { scale: 1, duration: 1.8, ease: 'expo.out' }, 0.2);
      }
    });

    // parallax images inside rounded frames (image is 120% tall)
    $$('[data-parallax]').forEach((img) => {
      const amt = small() ? 8 : 16;
      gsap.fromTo(img, { yPercent: -amt }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // elements drifting at their own speed
    $$('[data-speed]').forEach((el) => {
      const s = parseFloat(el.dataset.speed) * (small() ? 0.4 : 1);
      gsap.to(el, { y: () => -s * 120, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
    });
    // scale-down reveal (image starts zoomed, settles as it scrolls)
    $$('[data-scale]').forEach((el) => {
      gsap.fromTo(el, { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'center center', scrub: true } });
    });

    // light/dark background transitions between sections
    $$('[data-theme="light"]').forEach((sec) => {
      ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 45%', onToggle: (self) => d.body.classList.toggle('is-light', self.isActive) });
    });

    // counters
    $$('[data-count]').forEach((el) => {
      const end = parseFloat(el.dataset.count), o = { v: 0 };
      el.textContent = '0';
      gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', scrollTrigger: once(el, 'top 90%'), onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-IN'); } });
    });

    // marquee: constant drift that speeds up and flips with scroll velocity
    $$('.marquee__track').forEach((track) => {
      const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 32, repeat: -1 });
      let dir = 1;
      ScrollTrigger.create({
        trigger: track.parentElement, start: 'top bottom', end: 'bottom top',
        onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
        onUpdate: (self) => {
          dir = self.direction;
          gsap.to(loop, { timeScale: dir * (1 + Math.min(Math.abs(self.getVelocity()) / 300, 5)), duration: 0.2, overwrite: true, onComplete: () => gsap.to(loop, { timeScale: dir, duration: 1.2 }) });
        },
      });
    });

    // CTA frame opens from an inset rounded window to full width
    $$('.cta__frame').forEach((f) => {
      gsap.to(f, { clipPath: 'inset(0% 0% 0% 0% round 32px)', ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'top 30%', scrub: true } });
    });

    // stacked value cards shrink back as the next one arrives
    const values = $$('.value');
    values.forEach((v, i) => {
      const next = values[i + 1];
      if (!next) return;
      gsap.to(v, { scale: 0.93, opacity: 0.55, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 20%', scrub: true } });
    });

    // horizontal project rail (pinned on larger screens)
    const mm = gsap.matchMedia();
    $$('.rail').forEach((rail) => {
      const track = $('.rail__track', rail), bar = $('.rail__progress i', rail);
      mm.add('(min-width: 900px)', () => {
        rail.classList.add('is-pinned');
        const dist = () => track.scrollWidth - innerWidth;
        gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: {
            trigger: rail, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: (self) => bar && gsap.set(bar, { scaleX: self.progress }),
          },
        });
        return () => rail.classList.remove('is-pinned');
      });
    });
  }

  /* rail progress for native (touch / small screen) horizontal scroll */
  $$('.rail__track').forEach((track) => {
    const bar = $('.rail__progress i', track.closest('.rail'));
    track.addEventListener('scroll', () => {
      if (!bar || track.closest('.is-pinned')) return;
      bar.style.transform = `scaleX(${track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth)})`;
    }, { passive: true });
  });

  /* ------------------------------------------------------------------ */
  /* Sticky sector visual swap                                           */
  /* ------------------------------------------------------------------ */
  $$('.sectors').forEach((sec) => {
    const items = $$('.sector', sec), figs = $$('.sectors__visual figure', sec), label = $('.sectors__label', sec);
    let active = 0;
    const set = (i) => {
      if (i === active) return;
      figs.forEach((f, k) => { f.classList.toggle('is-prev', k === active); f.classList.toggle('is-active', k === i); });
      items.forEach((it, k) => it.classList.toggle('is-active', k === i));
      if (label) label.textContent = items[i].dataset.label;
      active = i;
    };
    items.forEach((it, i) => {
      it.addEventListener('pointerenter', () => set(i));
      it.addEventListener('focusin', () => set(i));
      if (motion) ScrollTrigger.create({ trigger: it, start: 'top 60%', end: 'bottom 60%', onToggle: (self) => self.isActive && set(i) });
    });
  });

  /* ------------------------------------------------------------------ */
  /* Projects page: sticky category tabs                                 */
  /* ------------------------------------------------------------------ */
  const tabs = $('.tabs__inner');
  if (tabs) {
    const links = $$('a', tabs), pill = $('.tabs__pill', tabs);
    const setTab = (a) => {
      links.forEach((l) => l.classList.toggle('is-active', l === a));
      pill.style.width = a.offsetWidth + 'px';
      pill.style.transform = `translateX(${a.offsetLeft}px)`;
      if (tabs.scrollWidth > tabs.clientWidth) tabs.scrollTo({ left: a.offsetLeft - 24, behavior: reduce ? 'auto' : 'smooth' });
    };
    setTab(links[0]);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { const a = links.find((l) => l.hash === '#' + e.target.id); if (a) setTab(a); } });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((l) => { const t = d.getElementById(l.hash.slice(1)); if (t) io.observe(t); });
    addEventListener('resize', () => setTab($('.is-active', tabs) || links[0]));
  }

  /* ------------------------------------------------------------------ */
  /* Lightbox                                                            */
  /* ------------------------------------------------------------------ */
  const lb = $('.lightbox');
  if (lb && lb.showModal) {
    const img = $('img', lb), cap = $('p', lb);
    $$('.gitem').forEach((b) => b.addEventListener('click', () => {
      const src = $('img', b);
      img.src = b.dataset.full;
      img.alt = src.alt;
      cap.textContent = src.alt;
      lb.showModal();
      lockScroll(true);
    }));
    lb.addEventListener('close', () => lockScroll(false));
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.closest('.lightbox__close')) lb.close(); });
  }

  /* ------------------------------------------------------------------ */
  /* Forms → compose an email (static site, no server)                   */
  /* ------------------------------------------------------------------ */
  $$('form[data-mailto]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const f = new FormData(form);
      const body = [
        `Name: ${f.get('name')}`,
        `Email: ${f.get('email')}`,
        `Phone: ${f.get('phone') || '-'}`,
        '',
        f.get('message') || '',
      ].join('\n');
      const subject = `${form.dataset.subject} — ${f.get('name')}`;
      location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      $('.form__status', form).textContent = form.dataset.done;
    });
  });

  /* ------------------------------------------------------------------ */
  /* Layout settles once fonts are in; honour deep links after pinning   */
  /* ------------------------------------------------------------------ */
  if (motion) {
    const settle = () => {
      ScrollTrigger.refresh();
      if (location.hash) { const t = d.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) scrollToEl(t, true); }
    };
    if (d.readyState === 'complete') (d.fonts ? d.fonts.ready : Promise.resolve()).then(settle);
    else addEventListener('load', () => (d.fonts ? d.fonts.ready : Promise.resolve()).then(settle));
  }
})();

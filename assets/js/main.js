/* Ashok Constructions — interactions
   GSAP + ScrollTrigger + Lenis load from CDN (deferred). Without them, or with
   reduced motion, every page is fully visible and static. */
(() => {
  const d = document;
  const root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = !reduce && !!(window.gsap && window.ScrollTrigger);
  const desktop = () => innerWidth >= 900;

  if (!motion) root.classList.remove('js');

  let lenis = null;
  if (motion) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.12 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }
  const lockScroll = (on) => { if (lenis) on ? lenis.stop() : lenis.start(); root.style.overflow = on ? 'hidden' : ''; };
  const scrollToEl = (el, immediate) => {
    const offset = -(parseInt(getComputedStyle(root).getPropertyValue('--hdr'), 10) || 72) - 56;
    if (lenis) lenis.scrollTo(el, { offset, immediate, duration: 1.2 });
    else scrollTo({ top: el.getBoundingClientRect().top + scrollY + offset, behavior: immediate || reduce ? 'auto' : 'smooth' });
  };

  /* ---------------------------------------------------------------- header */
  const hdr = $('.hdr');
  if (hdr) {
    let lastY = scrollY, ticking = false;
    const over = hdr.classList.contains('hdr--over');
    const update = () => {
      const y = scrollY;
      const limit = over ? innerHeight - 80 : 10;
      hdr.classList.toggle('is-solid', y > limit);
      const hide = y > 400 && y > lastY && !root.classList.contains('drawer-open') && !hdr.matches(':focus-within');
      if (y > lastY + 4 || y < lastY - 4) hdr.classList.toggle('is-hidden', hide);
      root.classList.toggle('has-hdr', !hdr.classList.contains('is-hidden'));
      lastY = y;
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();

    const toggle = $('.hdr__toggle', hdr);
    const drawer = $('#drawer');
    const setDrawer = (open) => {
      root.classList.toggle('drawer-open', open);
      toggle.setAttribute('aria-expanded', open);
      toggle.textContent = open ? 'Close' : 'Menu';
      drawer.inert = !open;
      lockScroll(open);
    };
    if (toggle && drawer) {
      drawer.inert = true;
      toggle.addEventListener('click', () => setDrawer(!root.classList.contains('drawer-open')));
      d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('drawer-open')) { setDrawer(false); toggle.focus(); } });
      $$('a', drawer).forEach((a) => a.addEventListener('click', () => setDrawer(false)));
    }
  }

  /* same-page anchors go through the smooth scroller */
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = d.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    history.pushState(null, '', url.hash);
    scrollToEl(target);
  });

  /* video background */
  const vHero = $('#aboutHeroVideo');
  if (vHero && reduce) {
    vHero.pause();
  }

  /* ---------------------------------------------------------------- motion */
  if (motion) {
    // Titles: each typeset line rises out of its own mask. Used for page titles only.
    const lines = (scope, delay = 0) => gsap.to($$('.ln > span', scope), { y: 0, duration: 1.25, ease: 'expo.out', stagger: 0.09, delay });

    // Home hero: the photograph opens from a framed crop to full bleed, then the title sets.
    const hero = $('.hero');
    if (hero) {
      const img = $('.hero__img', hero);
      gsap.timeline({ delay: 0.15 })
        .to(img, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' })
        .from($('img', img), { scale: 1.25, duration: 2.2, ease: 'expo.out' }, 0.2)
        .add(lines(hero), 0.95)
        .to($$('.label, .titleblock', hero), { opacity: 1, duration: 0.8, ease: 'none', stagger: 0.15 }, 1.3);
      gsap.to($('img', img), { yPercent: -8, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    }

    // Inner page titles
    $$('.mast').forEach((m) => lines(m, 0.1));
    // Other headings set in lines reveal on arrival
    $$('.ln').forEach((ln) => {
      if (ln.closest('.hero, .mast')) return;
      gsap.to($('span', ln), { y: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: ln, start: 'top 88%', once: true } });
    });

    // About statement: words darken as the reader moves through the sentence.
    $$('[data-scrub]').forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.setAttribute('aria-label', el.textContent.trim());
      el.innerHTML = words.map((w) => `<span class="word" aria-hidden="true">${w}</span>`).join(' ');
      gsap.to($$('.word', el), { opacity: 1, stagger: 0.05, ease: 'none', scrollTrigger: { trigger: el, start: 'top 75%', end: 'bottom 40%', scrub: 0.4 } });
    });

    // Drawings unroll: images revealed top-down, tied to scroll position.
    $$('[data-mask]').forEach((el) => {
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 35%', scrub: 0.6 } })
        .to(el, { clipPath: 'inset(0% 0 0% 0)', ease: 'none' })
        .from($('img', el), { scale: 1.12, ease: 'none' }, 0);
    });

    // Service words drift slightly against the scroll; typography as structure, not decoration.
    $$('.svc__word').forEach((w, i) => {
      gsap.fromTo(w, { xPercent: i % 2 ? 4 : -4 }, { xPercent: i % 2 ? -3 : 3, ease: 'none', scrollTrigger: { trigger: w, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Plates: slow parallax inside a fixed frame.
    $$('.plate').forEach((p) => {
      gsap.fromTo($('img', p), { yPercent: -14 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Project reel: pinned horizontal travel on larger screens.
    const mm = gsap.matchMedia();
    $$('.reel').forEach((reel) => {
      const track = $('.reel__track', reel);
      mm.add('(min-width: 900px)', () => {
        reel.classList.add('is-pinned');
        const dist = () => Math.max(0, track.scrollWidth - innerWidth);
        const st = gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: {
            trigger: reel,
            start: 'top top',
            end: () => '+=' + dist(),
            pin: true,
            scrub: 0.7,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (s) => countReel(reel, s.progress)
          },
        });
        $$('img', track).forEach((img) => {
          if (!img.complete) img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
        });
        return () => reel.classList.remove('is-pinned');
      });
    });
  }

  /* reel counter (pinned progress or native swipe) */
  function countReel(reel, p) {
    const out = $('.reel__count b', reel);
    const n = $$('.shot', reel).length;
    if (out) out.textContent = String(Math.min(n, Math.floor(p * n) + 1)).padStart(2, '0');
  }
  $$('.reel__track').forEach((track) => {
    track.addEventListener('scroll', () => {
      const reel = track.closest('.reel');
      if (!reel.classList.contains('is-pinned')) countReel(reel, track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth));
    }, { passive: true });
  });

  /* ---------------------------------------------------------------- sectors: content changes with the reader */
  $$('.why').forEach((sec) => {
    const items = $$('.sector', sec), figs = $$('.why__visual figure', sec), cap = $('.why__cap span', sec);
    let active = 0;
    const set = (i) => {
      if (i === active) return;
      figs.forEach((f, k) => { f.classList.toggle('is-prev', k === active); f.classList.toggle('is-active', k === i); });
      items.forEach((it, k) => it.classList.toggle('is-active', k === i));
      if (cap) cap.textContent = items[i].dataset.caption;
      active = i;
    };
    items.forEach((it, i) => {
      it.addEventListener('pointerenter', () => set(i));
      it.addEventListener('focus', () => set(i));
    });
    // the active item is the last one whose top has passed 55% of the viewport
    let frame = 0;
    const pick = () => {
      frame = 0;
      if (!desktop()) return;
      let i = 0;
      items.forEach((it, k) => { if (it.getBoundingClientRect().top < innerHeight * 0.55) i = k; });
      set(i);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(pick); };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { addEventListener('scroll', onScroll, { passive: true }); pick(); }
      else removeEventListener('scroll', onScroll);
    }).observe(sec);
  });

  /* ---------------------------------------------------------------- projects: jump bar */
  const jump = $('.jump__in');
  if (jump) {
    const links = $$('a', jump);
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((l) => l.classList.toggle('is-active', l.hash === '#' + e.target.id));
      const a = links.find((l) => l.hash === '#' + e.target.id);
      if (a && jump.scrollWidth > jump.clientWidth) jump.scrollTo({ left: a.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' });
    }), { rootMargin: '-40% 0px -55% 0px' });
    links.forEach((l) => { const t = d.getElementById(l.hash.slice(1)); if (t) io.observe(t); });
  }

  /* ---------------------------------------------------------------- gallery filtering & interactive lightbox */
  const lb = $('.lightbox');
  let currentGalleryItems = [];
  let currentLbIndex = 0;

  const updateLbContent = (index) => {
    if (!currentGalleryItems.length) return;
    currentLbIndex = (index + currentGalleryItems.length) % currentGalleryItems.length;
    const btn = currentGalleryItems[currentLbIndex];
    const srcImg = $('img', btn);
    const fullSrc = btn.dataset.full || (srcImg ? srcImg.src : '');
    const title = btn.dataset.title || (srcImg ? srcImg.alt : '');
    const category = btn.dataset.category || '';
    const status = btn.dataset.status || '';
    const location = btn.dataset.location || '';

    const lbImg = $('img', lb);
    if (lbImg) {
      lbImg.src = fullSrc;
      lbImg.alt = title;
    }
    const titleEl = $('.lightbox__title', lb);
    if (titleEl) titleEl.textContent = title;
    const metaEl = $('.lightbox__meta', lb);
    if (metaEl) {
      const parts = [];
      if (category) parts.push(category);
      if (location) parts.push(location);
      metaEl.textContent = parts.join(' • ');
    }
    const countEl = $('.lightbox__count', lb);
    if (countEl) countEl.textContent = `${currentLbIndex + 1} / ${currentGalleryItems.length}`;
    const statusEl = $('.lightbox__status', lb);
    if (statusEl) {
      statusEl.textContent = status;
      statusEl.className = 'badge lightbox__status ' + (status.toLowerCase().includes('ongoing') ? 'badge--ongoing' : status.toLowerCase().includes('proposed') ? 'badge--proposed' : 'badge--completed');
      statusEl.style.display = status ? 'inline-block' : 'none';
    }
  };

  if (lb && lb.showModal) {
    // Collect all gallery items
    const allGitems = $$('.gitem');

    const openLightbox = (btn) => {
      // determine visible items
      currentGalleryItems = allGitems.filter((b) => !b.classList.contains('is-hidden') && b.offsetParent !== null);
      if (!currentGalleryItems.length) currentGalleryItems = allGitems;
      const idx = currentGalleryItems.indexOf(btn);
      updateLbContent(idx >= 0 ? idx : 0);
      lb.showModal();
      lockScroll(true);
    };

    allGitems.forEach((b) => b.addEventListener('click', () => openLightbox(b)));

    const prevBtn = $('.lightbox__nav--prev', lb);
    const nextBtn = $('.lightbox__nav--next', lb);
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); updateLbContent(currentLbIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); updateLbContent(currentLbIndex + 1); });

    lb.addEventListener('close', () => lockScroll(false));
    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target.closest('.lightbox__close')) lb.close();
    });

    d.addEventListener('keydown', (e) => {
      if (!lb.open) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); updateLbContent(currentLbIndex - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); updateLbContent(currentLbIndex + 1); }
      else if (e.key === 'Escape') { lb.close(); }
    });

    // Touch swipe navigation
    let touchStartX = 0;
    lb.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      if (touchEndX - touchStartX > 50) updateLbContent(currentLbIndex - 1);
      else if (touchStartX - touchEndX > 50) updateLbContent(currentLbIndex + 1);
    }, { passive: true });
  }

  // Category filter tabs
  const filterBtns = $$('.gal-filter');
  if (filterBtns.length) {
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.filter;
        filterBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        $$('.gitem').forEach((item) => {
          const itemCat = item.dataset.cat || '';
          const match = cat === 'all' || itemCat.split(' ').includes(cat);
          item.classList.toggle('is-hidden', !match);
        });
      });
    });
  }

  /* ---------------------------------------------------------------- home: key completed projects category filter */
  const worksFilters = $$('.works__filter');
  const pcards = $$('.pcard');
  if (worksFilters.length && pcards.length) {
    // Dynamically calculate and set project counts from the actual verified dataset
    worksFilters.forEach((btn) => {
      const filter = btn.dataset.filter;
      const countEl = $('.works__filter-count', btn);
      if (countEl) {
        const count = filter === 'all'
          ? pcards.length
          : pcards.filter((c) => (c.dataset.cat || '').split(' ').includes(filter)).length;
        countEl.textContent = count;
      }
    });

    worksFilters.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        worksFilters.forEach((b) => {
          const isActive = b === btn;
          b.classList.toggle('is-active', isActive);
          b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        pcards.forEach((card) => {
          const cat = card.dataset.cat || '';
          const match = filter === 'all' || cat.split(' ').includes(filter);
          card.classList.toggle('is-hidden', !match);
        });

        // Recalculate layout and ScrollTrigger markers smoothly
        if (window.ScrollTrigger) {
          ScrollTrigger.refresh();
        }
      });
    });
  }

  /* ---------------------------------------------------------------- financial capability dashboard */
  const chartPoints = $$('.fin-chart__point');
  const tableRows = $$('.fin-table tr[data-row]');
  const tooltip = $('#fin-tooltip');

  if (chartPoints.length && tooltip) {
    const defaultPoint = chartPoints[chartPoints.length - 1]; // Latest FY 2025-26
    const setPoint = (pt) => {
      chartPoints.forEach((p) => p.classList.toggle('is-active', p === pt));
      const idx = pt.dataset.idx;
      tableRows.forEach((r) => {
        const isTarget = r.dataset.row === idx;
        r.classList.toggle('is-hovered', isTarget);
      });
      const yearEl = $('.fin-tooltip__year', tooltip);
      const valEl = $('.fin-tooltip__val', tooltip);
      const exactEl = $('.fin-tooltip__exact', tooltip);
      if (yearEl) yearEl.innerHTML = pt.dataset.year;
      if (valEl) valEl.innerHTML = pt.dataset.cr;
      if (exactEl) exactEl.innerHTML = pt.dataset.exact;
    };

    const resetPoint = () => {
      setPoint(defaultPoint);
      tableRows.forEach((r) => r.classList.remove('is-hovered'));
    };

    chartPoints.forEach((pt) => {
      pt.addEventListener('pointerenter', () => setPoint(pt));
      pt.addEventListener('focus', () => setPoint(pt));
      pt.addEventListener('pointerleave', resetPoint);
      pt.addEventListener('blur', resetPoint);
    });

    tableRows.forEach((row) => {
      const idx = row.dataset.row;
      const matchingPt = chartPoints.find((p) => p.dataset.idx === idx);
      if (!matchingPt) return;
      row.addEventListener('pointerenter', () => setPoint(matchingPt));
      row.addEventListener('focus', () => setPoint(matchingPt));
      row.addEventListener('pointerleave', resetPoint);
      row.addEventListener('blur', resetPoint);
    });

    // Smooth chart line reveal on scroll arrival if motion is enabled
    const chartSvg = $('#fin-chart-svg');
    if (motion && chartSvg && window.ScrollTrigger && window.gsap) {
      ScrollTrigger.create({
        trigger: '#financials',
        start: 'top 82%',
        once: true,
        onEnter: () => {
          gsap.fromTo($('.fin-chart__line', chartSvg),
            { strokeDashoffset: 600 },
            { strokeDashoffset: 0, duration: 1.4, ease: 'power2.out' }
          );
          gsap.fromTo($('.fin-chart__area', chartSvg),
            { opacity: 0 },
            { opacity: 1, duration: 1.2, delay: 0.3, ease: 'power1.out' }
          );
          gsap.fromTo($$('.fin-chart__dot', chartSvg),
            { scale: 0, transformOrigin: 'center' },
            { scale: 1, duration: 0.5, stagger: 0.1, delay: 0.4, ease: 'back.out(2)' }
          );
        }
      });
    }
  }

  /* ---------------------------------------------------------------- forms → email (static site) */
  $$('form[data-mailto]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const f = new FormData(form);
      const body = [`Name: ${f.get('name')}`, `Email: ${f.get('email')}`, `Phone: ${f.get('phone') || '-'}`, '', f.get('message') || ''].join('\n');
      const subject = `${form.dataset.subject} — ${f.get('name')}`;
      location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      $('.form__status', form).textContent = form.dataset.done;
    });
  });

  /* ---------------------------------------------------------------- settle layout, honour deep links */
  if (motion) {
    const settle = () => {
      ScrollTrigger.refresh();
      if (location.hash) { const t = d.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) scrollToEl(t, true); }
    };
    const ready = () => (d.fonts ? d.fonts.ready : Promise.resolve()).then(settle);
    if (d.readyState === 'complete') ready(); else addEventListener('load', ready);
  }
})();

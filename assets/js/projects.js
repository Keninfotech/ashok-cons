/**
 * Ashok Construction — Projects Page Interactive Enhancements
 * Handles: View mode switcher, Sector filters, Register accordions, Lightbox integration,
 * IntersectionObserver / GSAP scroll reveals, and Fleet metrics count-up.
 */
(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    initViewSwitcher();
    initSectorFiltering();
    initRegisterAccordions();
    initEquipmentFiltering();
    initScrollAnimations();
    initMetricCountUps();
    initLightboxTriggers();
    initJumpNavSpy();
  });

  // 1. View Mode Switcher (Grid Cards vs Technical Register)
  function initViewSwitcher() {
    const viewBtns = document.querySelectorAll('.proj-view-btn');
    const gridView = document.getElementById('buildings-grid-view');
    const regView = document.getElementById('buildings-register-view');

    if (!viewBtns.length || !gridView || !regView) return;

    viewBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.view;
        viewBtns.forEach((b) => {
          const isActive = b === btn;
          b.classList.toggle('is-active', isActive);
          b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        if (mode === 'grid') {
          gridView.style.display = 'grid';
          regView.style.display = 'none';
        } else if (mode === 'register') {
          gridView.style.display = 'none';
          regView.style.display = 'flex';
        }

        if (window.ScrollTrigger) {
          ScrollTrigger.refresh();
        }
      });
    });
  }

  // 2. Sector Filter for Completed Buildings
  function initSectorFiltering() {
    const filterPills = document.querySelectorAll('[data-filter-group="buildings"] .proj-pill');
    const bldCards = document.querySelectorAll('.bld-card');
    const regRows = document.querySelectorAll('.bld-reg-row');

    if (!filterPills.length) return;

    filterPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const sector = pill.dataset.filter;

        filterPills.forEach((p) => {
          const isActive = p === pill;
          p.classList.toggle('is-active', isActive);
          p.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        // Filter Grid Cards
        bldCards.forEach((card) => {
          const cardCat = card.dataset.cat || '';
          const match = sector === 'all' || cardCat.split(' ').includes(sector);
          card.classList.toggle('is-hidden', !match);
          if (match) {
            card.style.animation = 'none';
            card.offsetHeight; // trigger reflow
            card.style.animation = 'fadeSlideUp 0.4s ease forwards';
          }
        });

        // Filter Register Rows
        regRows.forEach((row) => {
          const rowCat = row.dataset.cat || '';
          const match = sector === 'all' || rowCat.split(' ').includes(sector);
          row.style.display = match ? '' : 'none';
        });

        if (window.ScrollTrigger) {
          ScrollTrigger.refresh();
        }
      });
    });
  }

  // 3. Technical Register Accordion Drawers
  function initRegisterAccordions() {
    const summaries = document.querySelectorAll('.bld-reg-summary');
    summaries.forEach((summary) => {
      summary.addEventListener('click', () => {
        const row = summary.closest('.bld-reg-row');
        if (!row) return;
        const isOpen = row.classList.contains('is-open');

        // Close other rows for clean single-expanded view
        document.querySelectorAll('.bld-reg-row.is-open').forEach((r) => {
          if (r !== row) r.classList.remove('is-open');
        });

        row.classList.toggle('is-open', !isOpen);
      });
    });
  }

  // 4. Equipment Fleet Category Filter
  function initEquipmentFiltering() {
    const equipPills = document.querySelectorAll('[data-filter-group="equipment"] .proj-pill');
    const equipTiles = document.querySelectorAll('.equip-tile');

    if (!equipPills.length || !equipTiles.length) return;

    equipPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const cat = pill.dataset.filter;
        equipPills.forEach((p) => {
          const isActive = p === pill;
          p.classList.toggle('is-active', isActive);
          p.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        equipTiles.forEach((tile) => {
          const tileCat = tile.dataset.cat || '';
          const match = cat === 'all' || tileCat.split(' ').includes(cat);
          tile.classList.toggle('is-hidden', !match);
        });

        if (window.ScrollTrigger) {
          ScrollTrigger.refresh();
        }
      });
    });
  }

  // 5. Scroll Animations (GSAP or IntersectionObserver)
  function initScrollAnimations() {
    const revealElements = document.querySelectorAll('.scroll-reveal');
    if (!revealElements.length) return;

    if (window.gsap && window.ScrollTrigger) {
      revealElements.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 35 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              once: true,
            },
          }
        );
      });
    } else if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-in-view');
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '0px 0px -50px 0px', threshold: 0.1 }
      );
      revealElements.forEach((el) => observer.observe(el));
    } else {
      revealElements.forEach((el) => el.classList.add('is-in-view'));
    }
  }

  // 6. Project & Fleet Metric Count-Up Animations
  function initMetricCountUps() {
    const counters = document.querySelectorAll('[data-counter-target]');
    if (!counters.length) return;

    const animateCounter = (el) => {
      const target = parseInt(el.dataset.counterTarget, 10);
      const suffix = el.dataset.counterSuffix || '';
      const prefix = el.dataset.counterPrefix || '';
      const duration = 1600;
      const startTime = performance.now();

      const update = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutQuad
        const ease = 1 - (1 - progress) * (1 - progress);
        const currentVal = Math.floor(ease * target);
        el.textContent = `${prefix}${currentVal}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          el.textContent = `${prefix}${target}${suffix}`;
        }
      };
      requestAnimationFrame(update);
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 }
      );
      counters.forEach((c) => observer.observe(c));
    } else {
      counters.forEach((c) => animateCounter(c));
    }
  }

  // 7. Lightbox integration from all project cards
  function initLightboxTriggers() {
    const triggers = document.querySelectorAll('[data-lightbox-trigger]');
    const lightboxModal = document.querySelector('.lightbox');
    if (!lightboxModal || !triggers.length) return;

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const fullSrc = trigger.dataset.full;
        const title = trigger.dataset.title || '';
        const cat = trigger.dataset.category || '';
        const status = trigger.dataset.status || '';
        const loc = trigger.dataset.location || '';

        // If main.js has openLightbox handler or we can direct-open
        const lbImg = lightboxModal.querySelector('img');
        const lbTitle = lightboxModal.querySelector('.lightbox__title');
        const lbMeta = lightboxModal.querySelector('.lightbox__meta');
        const lbStatus = lightboxModal.querySelector('.lightbox__status');

        if (lbImg && fullSrc) lbImg.src = fullSrc;
        if (lbTitle) lbTitle.textContent = title;
        if (lbMeta) {
          const parts = [cat, loc].filter(Boolean);
          lbMeta.textContent = parts.join(' • ');
        }
        if (lbStatus) {
          lbStatus.textContent = status;
          lbStatus.style.display = status ? 'inline-block' : 'none';
        }

        if (lightboxModal.showModal) {
          lightboxModal.showModal();
          document.documentElement.style.overflow = 'hidden';
        }
      });
    });

    lightboxModal.addEventListener('close', () => {
      document.documentElement.style.overflow = '';
    });
  }

  // 8. Sticky Navigation Spy
  function initJumpNavSpy() {
    const jumpLinks = document.querySelectorAll('.jump a');
    const sections = Array.from(jumpLinks)
      .map((link) => {
        const id = link.getAttribute('href')?.replace('#', '');
        return id ? document.getElementById(id) : null;
      })
      .filter(Boolean);

    if (!jumpLinks.length || !sections.length) return;

    const onScroll = () => {
      const scrollPos = window.scrollY + 180;
      let currentSection = null;

      sections.forEach((sec) => {
        if (sec.offsetTop <= scrollPos) {
          currentSection = sec;
        }
      });

      if (currentSection) {
        jumpLinks.forEach((link) => {
          const match = link.getAttribute('href') === `#${currentSection.id}`;
          link.classList.toggle('is-active', match);
        });
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();

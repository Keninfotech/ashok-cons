# ashok-cons

Website for Ashok Constructions, Namakkal. A static site with no build step: plain HTML, one stylesheet and one script.

## Structure

```
index.html                  Home
about-us/                   About us (overview)
  management/               Management
  vision-mission/           Vision & Mission
our-services/               Our services
projects/                   Projects
careers/                    Careers
contact/                    Contact
assets/
  css/main.css              All styles
  js/main.js                All interactions and scroll animations
  img/                      Optimised WebP images, favicons, social share image
sitemap.xml, robots.txt
```

## Design notes

- Art direction: an architectural monograph. Concrete-paper neutrals and ink black, with cobalt blue (from the logo) as the single accent.
- Type: Cormorant Garamond for display and headings; Inter for body copy; IBM Plex Mono for labels and captions. All load from Google Fonts.
- Motion: one idea per section, never repeated site-wide. GSAP, ScrollTrigger and Lenis load from the jsDelivr CDN. If they fail to load, or the visitor prefers reduced motion, every page still shows all its content, just without animation.

## Run locally

Pages link to folders (e.g. `about-us/`), so view the site through a local server rather than by opening the files directly:

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

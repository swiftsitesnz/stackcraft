/* Purposeful motion, with visible-by-default content and no scrolling hijack. */
(() => {
  'use strict';
  const site = document.querySelector('.premium-site');
  if (!site || site.dataset.motionInitialised === 'true') return;
  site.dataset.motionInitialised = 'true';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const isStack = site.classList.contains('stack');
  const activeAnimations = new Set();
  const observers = [];
  const cleanups = [];
  const seen = new WeakSet();
  // Every content surface is a chapter, so service, case, pricing and contact pages
  // carry the same tonal rhythm as the home page instead of one flat fill.
  const chapterSelector = '.hero,.showcase-section,.stack-work,.services-section,.founder-section,.process-section,.onsite-band,.service-hero,.service-detail,.service-proof,.case-heading,.case-image,.case-story,.contact-page,.page-heading,.catalogue,.restored-work,.lifecycle-section,.restored-faq';
  const chapterColours = isStack ? {
    hero:['#143d49','#e3ecec'], 'stack-work':['#c9dedd','#e0ebea'],
    'services-section':['#143d49','#e4eeea'], 'founder-section':['#cedfd8','#dce8e2'],
    'process-section':['#e5ecee','#e9eff0'], 'onsite-band':['#c4d9c9','#dce8df'],
    'service-hero':['#e6eeee','#ecf2f2'], 'service-detail':['#dde8e8','#e6eeee'], 'service-proof':['#d3e2e0','#e0ebea'],
    'case-heading':['#e6eeee','#ecf2f2'], 'case-image':['#cfdfdf','#dde8e8'], 'case-story':['#e3ecec','#e9f0f0'],
    'contact-page':['#e3ecea','#e9f0ee'], 'page-heading':['#e6eeee','#ecf2f2'], catalogue:['#dfe9e8','#e6eeee'],
    'restored-work':['#d6e3e2','#e0ebea'], 'lifecycle-section':['#d9e6e2','#e3ece9'], 'restored-faq':['#e3ecec','#e9f0f0'],
  } : {
    hero:['#f2ebdf','#f7f2e9'], 'showcase-section':['#a8422c','#f6ece7'],
    'services-section':['#232823','#f7f5f0'], 'founder-section':['#dce3cd','#e8ecdf'],
    'process-section':['#eee7d9','#f4eee4'], 'onsite-band':['#cbd4b8','#e4e9d8'],
    'service-hero':['#f4efe4','#f8f4ec'], 'service-detail':['#ebe4d6','#f2ede2'], 'service-proof':['#e2d9c8','#ece5d8'],
    'case-heading':['#f4efe4','#f8f4ec'], 'case-image':['#dedcc9','#ebe8da'], 'case-story':['#f0ebe0','#f6f2ea'],
    'contact-page':['#f1ecdf','#f6f2e9'], 'page-heading':['#f4efe4','#f8f4ec'], catalogue:['#ece6d8','#f3eee4'],
    'restored-work':['#e4dfd0','#ede8dc'], 'lifecycle-section':['#e5e8d8','#eef0e4'], 'restored-faq':['#f1ede2','#f6f3ea'],
  };
  const listen = (target, event, fn, options) => {
    target.addEventListener(event, fn, options);
    cleanups.push(() => target.removeEventListener(event, fn, options));
  };
  const animate = (element, frames, options = {}) => {
    if (reduce.matches || !element?.animate) return;
    const animation = element.animate(frames, {
      duration:950, easing:'cubic-bezier(.22,1,.36,1)', ...options,
    });
    activeAnimations.add(animation);
    animation.finished.catch(() => {}).finally(() => activeAnimations.delete(animation));
  };
  site.classList.add('motion-ready');

  // One entry per image, not a repeating scroll loop. Text is never hidden.
  const reveal = element => {
    if (seen.has(element)) return;
    seen.add(element);
    if (reduce.matches) return;
    if (element.matches('.device-pair')) {
      animate(element.querySelector('.desktop-device'), [
        { transform:'translate3d(-22px,14px,0) rotate(-2deg)' },
        { transform:'translate3d(0,0,0) rotate(0deg)' },
      ], { duration:1000 });
      animate(element.querySelector('.phone-device'), [
        { transform:'translate3d(14px,32px,0) rotate(5deg)' },
        { transform:'translate3d(0,0,0) rotate(0deg)' },
      ], { duration:1150, delay:80 });
    } else {
      // Keep accompanying captions readable throughout the artwork reveal.
      const artwork = element.querySelector(':scope>img') || element;
      animate(artwork, [
        { clipPath:isStack?'inset(0 15% 9% 0 round 4px)':'inset(10% 0 0 0 round 4px)', transform:'translate3d(0,24px,0)' },
        { clipPath:'inset(0 0 0 0 round 4px)', transform:'translate3d(0,0,0)' },
      ], { duration:1050 });
    }
  };
  // The hero portrait is the largest contentful element on the SwiftSites home page; it paints immediately instead of waiting for a reveal.
  const revealElements = site.querySelectorAll('.product-art,.device-pair,.dashboard-frame,.design-art,.founder-grid>figure,.case-image');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        reveal(entry.target); revealObserver.unobserve(entry.target);
      }
    }, { rootMargin:'0px 0px -7% 0px', threshold:.13 });
    revealElements.forEach(element => revealObserver.observe(element));
    observers.push(revealObserver);
  }

  // The current chapter changes surface and header together; all palettes retain
  // the existing light/dark contrast. IntersectionObserver avoids scroll reads.
  const chapters = [...site.querySelectorAll(chapterSelector)];
  const chapterMap = new Map();
  for (const chapter of chapters) {
    const key = Object.keys(chapterColours).find(name => chapter.classList.contains(name));
    if (!key) continue;
    chapter.classList.add('motion-chapter');
    chapter.style.setProperty('--motion-section-colour', chapterColours[key][0]);
    chapterMap.set(chapter, chapterColours[key]);
    if (!chapter.classList.contains('hero')) {
      const line = document.createElement('span');
      line.className = 'motion-section-line';
      line.setAttribute('aria-hidden', 'true');
      chapter.prepend(line);
    }
  }
  let currentChapter = null;
  const activateChapter = chapter => {
    if (chapter === currentChapter) return;
    currentChapter?.classList.remove('motion-section-current');
    chapter.classList.add('motion-section-current');
    currentChapter = chapter;
    site.style.setProperty('--motion-header', chapterMap.get(chapter)[1]);
    const line = chapter.querySelector(':scope>.motion-section-line');
    if (line && !seen.has(line)) {
      seen.add(line);
      animate(line, [{ transform:'scaleX(0)' }, { transform:'scaleX(1)' }], { duration:1100 });
    }
  };
  if ('IntersectionObserver' in window) {
    // A band just beneath the sticky navigation selects a single content chapter.
    const chapterObserver = new IntersectionObserver(entries => {
      const entering = entries.filter(entry => entry.isIntersecting);
      if (entering.length) activateChapter(entering[entering.length - 1].target);
    }, { rootMargin:'-18% 0px -65% 0px', threshold:0 });
    chapterMap.forEach((_, chapter) => chapterObserver.observe(chapter));
    observers.push(chapterObserver);
  }

  // Pointer depth applies to the whole composition, including its caption.
  // It never changes the portrait or product's pixels and doesn't run on touch.
  for (const element of site.querySelectorAll('.hero-portrait,.hero .product-art')) {
    element.classList.add('motion-depth');
    let bounds = null, frame = 0, point = null;
    const reset = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0; point = null; bounds = null;
      element.classList.remove('motion-pointer-active');
      for (const key of ['x','y','rx','ry']) element.style.removeProperty('--motion-' + key);
    };
    const update = () => {
      frame = 0;
      if (!point || !bounds || reduce.matches || !pointer.matches) return;
      const x = Math.max(-1,Math.min(1,(point.x - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1,Math.min(1,(point.y - bounds.top) / bounds.height * 2 - 1));
      element.style.setProperty('--motion-x', (x * 5).toFixed(2) + 'px');
      element.style.setProperty('--motion-y', (y * 4).toFixed(2) + 'px');
      element.style.setProperty('--motion-rx', (-y * 1.6).toFixed(2) + 'deg');
      element.style.setProperty('--motion-ry', (x * 2).toFixed(2) + 'deg');
    };
    listen(element, 'pointerenter', () => {
      if (reduce.matches || !pointer.matches) return;
      bounds = element.getBoundingClientRect();
      element.classList.add('motion-pointer-active');
    });
    listen(element, 'pointermove', event => {
      if (reduce.matches || !pointer.matches || !bounds) return;
      point = { x:event.clientX, y:event.clientY };
      if (!frame) frame = requestAnimationFrame(update);
    });
    listen(element, 'pointerleave', reset);
    listen(element, 'pointercancel', reset);
    listen(window, 'scroll', reset, { passive:true });
    listen(window, 'resize', reset, { passive:true });
    listen(reduce, 'change', reset);
    cleanups.push(reset);
  }

  // Enhanced browsers animate the real selected work into its case-study image.
  // Modified/new-tab clicks and unsupported browsers keep ordinary navigation.
  listen(site, 'click', event => {
    if (reduce.matches || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a.project-preview,a.dashboard-frame');
    const image = link?.querySelector('.project-image,img');
    if (image) {
      site.querySelectorAll('.project-preview img,.dashboard-frame img').forEach(other => other.style.removeProperty('view-transition-name'));
      image.style.viewTransitionName = 'work-preview';
    }
  });
  listen(window, 'pageshow', () => {
    site.querySelectorAll('.project-preview img,.dashboard-frame img').forEach(image => image.style.removeProperty('view-transition-name'));
  });
  listen(reduce, 'change', () => {
    if (reduce.matches) activeAnimations.forEach(animation => animation.cancel());
  });
  listen(document, 'visibilitychange', () => {
    if (document.hidden) activeAnimations.forEach(animation => animation.finish());
  });
  // BFCache restores listeners and observer state; real page disposal frees them.
  listen(window, 'pagehide', event => {
    if (event.persisted) return;
    observers.forEach(observer => observer.disconnect());
    activeAnimations.forEach(animation => animation.cancel());
    cleanups.forEach(cleanup => cleanup());
  });
})();

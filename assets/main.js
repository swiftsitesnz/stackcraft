// Shared behavior across every page - nav scroll state, mobile nav toggle,
// scroll-reveal, and the typewriter heading effect. One file instead of six
// copies of the same script block.

document.addEventListener('DOMContentLoaded', () => {
    // Nav scroll state
    const nav = document.getElementById('nav');
    if (nav) {
        window.addEventListener('scroll', () => {
            nav.classList.toggle('scrolled', window.scrollY > 60);
        }, { passive: true });
    }

    // Mobile nav toggle
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            const isActive = navToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.style.overflow = isActive ? 'hidden' : '';
        });
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // Scroll reveal
    const revealTargets = document.querySelectorAll('.reveal');
    if (revealTargets.length) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
        revealTargets.forEach(el => revealObserver.observe(el));
    }

    // Typewriter headings - any element marked [data-typewriter] types out
    // its own text content on load instead of appearing all at once.
    // Skipped entirely under prefers-reduced-motion, per that media query -
    // the heading just renders normally.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('[data-typewriter]').forEach((el, i) => {
        const fullText = el.textContent;
        if (prefersReducedMotion) return;

        el.textContent = '';
        el.classList.add('tw-active');
        let charIdx = 0;
        const speed = 45;
        const startDelay = i === 0 ? 200 : 0;

        function type() {
            if (charIdx < fullText.length) {
                el.textContent += fullText.charAt(charIdx);
                charIdx++;
                setTimeout(type, speed);
            } else {
                el.classList.remove('tw-active');
                el.classList.add('tw-done');
                // reveal whatever follows the heading (sub-copy, CTAs) once typing finishes
                const next = el.closest('.hero-content, .page-hero .container');
                if (next) {
                    next.querySelectorAll('.tw-follow').forEach(f => f.classList.add('visible'));
                }
            }
        }
        setTimeout(type, startDelay);
    });
});

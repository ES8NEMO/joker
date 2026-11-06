
/* Saada Café — Scroll & 3D interaction */

(() => {
  'use strict';

  const reduceMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealSelector =
    '.hero-copy, .welcome-strip, .menu-intro, .menu-heading, #menus .item, .closing-note';

  function markRevealElements(root = document) {
    if (root.nodeType === 1 && root.matches?.(revealSelector)) {
      root.setAttribute('data-reveal', '');
    }

    root.querySelectorAll?.(revealSelector).forEach(el => {
      el.setAttribute('data-reveal', '');
    });
  }

  markRevealElements();

  if (reduceMotion || !('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-reveal]').forEach(el => {
      el.classList.add('is-visible');
    });
  } else {
    document.documentElement.classList.add('motion-ready');

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -35px 0px'
    });

    function observeRevealElements(root = document) {
      root.querySelectorAll?.('[data-reveal]:not(.is-visible)')
        .forEach(el => observer.observe(el));

      if (root.matches?.('[data-reveal]:not(.is-visible)')) {
        observer.observe(root);
      }
    }

    observeRevealElements();

    // Watch menu cards created dynamically by Firebase.
    const menuRoot = document.getElementById('menus');

    if (menuRoot) {
      const mutationObserver = new MutationObserver(records => {
        records.forEach(record => {
          record.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;

            markRevealElements(node);
            observeRevealElements(node);
          });
        });
      });

      mutationObserver.observe(menuRoot, {
        childList: true,
        subtree: true
      });
    }
  }

  // Subtle 3D tilt on desktop.
  const scene = document.querySelector('.coffee-scene');
  const stage = document.querySelector('.coffee-cup-stage');

  const canHover = window.matchMedia(
    '(hover: hover) and (pointer: fine)'
  ).matches;

  if (scene && stage && canHover && !reduceMotion) {
    scene.addEventListener('pointermove', event => {
      const rect = scene.getBoundingClientRect();

      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      stage.style.setProperty(
        '--tilt-y',
        `${(x * 9).toFixed(2)}deg`
      );

      stage.style.setProperty(
        '--tilt-x',
        `${(-y * 7).toFixed(2)}deg`
      );
    });

    scene.addEventListener('pointerleave', () => {
      stage.style.setProperty('--tilt-y', '0deg');
      stage.style.setProperty('--tilt-x', '0deg');
    });
  }

  // Small scroll parallax, optimized with requestAnimationFrame.
  if (scene && stage && !reduceMotion) {
    let ticking = false;

    const updateScroll = () => {
      const rect = scene.getBoundingClientRect();

      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        const center = rect.top + rect.height / 2;

        const shift = Math.max(
          -9,
          Math.min(
            9,
            (window.innerHeight / 2 - center) * 0.025
          )
        );

        stage.style.setProperty(
          '--scroll-y',
          `${shift.toFixed(2)}px`
        );
      }

      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll);
        ticking = true;
      }
    }, { passive: true });
  }
})();

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Reveal on scroll ---- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  revealEls.forEach(el => {
    const delay = el.getAttribute('data-reveal-delay');
    if (delay) el.style.setProperty('--reveal-delay', delay);
  });

  if (reduceMotion) {
    revealEls.forEach(el => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach(el => revealObserver.observe(el));
  }

  /* ---- Nav scrolled state (via sentinel, no scroll listener) ---- */
  const nav = document.getElementById('nav');
  const sentinel = document.getElementById('top-sentinel');
  if (nav && sentinel) {
    const navObserver = new IntersectionObserver(
      ([entry]) => nav.classList.toggle('is-scrolled', !entry.isIntersecting),
      { threshold: 0 }
    );
    navObserver.observe(sentinel);
  }

  /* ---- Mobile menu ---- */
  const burger = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('navMobile');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(isOpen));
      burger.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- Speed gauge: draw ring + count up when in view ---- */
  const speedCard = document.getElementById('speedCard');
  const speedRingFill = document.getElementById('speedRingFill');
  const speedValue = document.getElementById('speedValue');
  const CIRCUMFERENCE = 327;
  const TARGET = 100;

  function animateSpeed() {
    if (speedRingFill) {
      speedRingFill.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - TARGET / 100));
    }
    if (!speedValue) return;
    if (reduceMotion) {
      speedValue.textContent = String(TARGET);
      return;
    }
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      speedValue.textContent = String(Math.round(eased * TARGET));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (speedCard) {
    if (reduceMotion) {
      animateSpeed();
    } else {
      const speedObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          animateSpeed();
          speedObserver.disconnect();
        }
      }, { threshold: 0.4 });
      speedObserver.observe(speedCard);
    }
  }

  /* ---- Hero browser mockup: subtle pointer parallax ---- */
  const browserMock = document.getElementById('browserMock');
  const heroVisual = document.querySelector('.hero__visual');
  if (browserMock && heroVisual && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    let raf = null;
    heroVisual.addEventListener('mousemove', (e) => {
      const rect = heroVisual.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        browserMock.style.transform = `rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg)`;
      });
    });
    heroVisual.addEventListener('mouseleave', () => {
      browserMock.style.transform = '';
    });
  }

  /* ---- Fondo aurora: sigue al mouse por toda la sección hero ---- */
  const heroSection = document.querySelector('.hero');
  const heroBlobs = document.querySelectorAll('.hero__blob');
  if (heroSection && heroBlobs.length && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    const hasGsap = typeof gsap !== 'undefined';
    const blobMovers = hasGsap
      ? [...heroBlobs].map((blob) => ({ x: gsap.quickTo(blob, 'x', { duration: 0.9, ease: 'power3.out' }), y: gsap.quickTo(blob, 'y', { duration: 0.9, ease: 'power3.out' }) }))
      : null;
    heroSection.addEventListener('mousemove', (e) => {
      const rect = heroSection.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      heroBlobs.forEach((blob, i) => {
        const strength = i % 2 === 0 ? 26 : -22;
        if (blobMovers) {
          blobMovers[i].x(x * strength);
          blobMovers[i].y(y * strength);
        } else {
          blob.style.transform = `translate(${(x * strength).toFixed(1)}px, ${(y * strength).toFixed(1)}px)`;
        }
      });
    });
    heroSection.addEventListener('mouseleave', () => {
      heroBlobs.forEach((blob, i) => {
        if (blobMovers) {
          blobMovers[i].x(0);
          blobMovers[i].y(0);
        } else {
          blob.style.transform = '';
        }
      });
    });
  }

  /* ---- Botones magnéticos: solo los 1-2 focales para no saturar ---- */
  const magneticEls = document.querySelectorAll('[data-magnetic]');
  if (magneticEls.length && typeof gsap !== 'undefined' && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    magneticEls.forEach((el) => {
      const moveX = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
      const moveY = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        moveX((e.clientX - rect.left - rect.width / 2) * 0.25);
        moveY((e.clientY - rect.top - rect.height / 2) * 0.3);
      });
      el.addEventListener('mouseleave', () => {
        moveX(0);
        moveY(0);
      });
    });
  }

  /* ---- Form submit: abre un mail prellenado (el sitio no tiene backend propio) ---- */
  const form = document.getElementById('auditForm');
  const formStatus = document.getElementById('formStatus');
  if (form && formStatus) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Honeypot: los bots suelen completar todos los campos, incluido este,
      // que para una persona real queda oculto visualmente.
      if (form.company && form.company.value.trim() !== '') {
        return;
      }

      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const website = form.website.value.trim();
      const goal = form.goal.value.trim();

      const subject = `Auditoría digital - ${name || 'Nueva consulta'}`;
      const bodyLines = [
        `Nombre: ${name}`,
        `Email: ${email}`,
        website ? `Sitio web actual: ${website}` : null,
        '',
        'Qué necesita:',
        goal || '(sin detalle)',
      ].filter((line) => line !== null);

      const mailto = `mailto:synergysolutions@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
      window.location.href = mailto;

      formStatus.textContent = 'Se abrió tu programa de correo con los datos completos. Solo tenés que confirmar el envío.';
      form.reset();
    });
  }

  /* ---- Showcase: transformación de la web pineada al scroll ---- */
  const showcaseStage = document.getElementById('showcaseStage');
  const showcaseScenes = showcaseStage ? showcaseStage.querySelectorAll('.showcase__scene') : [];
  const showcaseDots = showcaseStage ? showcaseStage.querySelectorAll('.showcase__dot') : [];
  const showcaseCaption = document.getElementById('showcaseCaption');

  function setActiveScene(index) {
    showcaseDots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    if (showcaseCaption && showcaseScenes[index]) {
      showcaseCaption.textContent = showcaseScenes[index].dataset.caption || '';
    }
  }

  if (showcaseStage && showcaseScenes.length > 1) {
    if (reduceMotion || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      // Sin animación: se muestra la primera escena, fija.
      setActiveScene(0);
    } else {
      gsap.registerPlugin(ScrollTrigger);

      // Distancia fija en píxeles por escena (no "%", que con pin +
      // invalidateOnRefresh se recalcula sobre el propio pin-spacer y crece
      // sin control; tampoco window.innerHeight, que puede leerse en 0 antes
      // del primer paint).
      const PX_PER_SCENE = 700;
      const scrollDistance = PX_PER_SCENE * showcaseScenes.length;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: showcaseStage,
          start: 'top top',
          end: '+=' + scrollDistance,
          scrub: 0.6,
          pin: true,
          anticipatePin: 1,
        },
      });

      showcaseScenes.forEach((scene, i) => {
        if (i === 0) return;
        tl.fromTo(
          scene,
          { '--reveal': '100%' },
          {
            '--reveal': '0%',
            duration: 1,
            ease: 'none',
            onStart: () => setActiveScene(i),
            onReverseComplete: () => setActiveScene(i - 1),
          }
        );
        tl.to({}, { duration: 0.35 });
      });

      // Las fotos del carrusel (picsum) cargan después del layout inicial y
      // corren la posición real de esta sección: recalculamos cuando terminan
      // de cargar, y de nuevo cuando la tipografía web asienta las medidas.
      window.addEventListener('load', () => ScrollTrigger.refresh());
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }
    }
  }
})();

(() => {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.scroll-progress');
  const processStory = document.querySelector('.process-story');
  const processTrack = document.querySelector('.process-track');
  const contact = document.querySelector('.contact');
  const hero = document.querySelector('.hero');
  const heroMedia = document.querySelector('.hero-media');
  const heroVideo = document.querySelector('.hero-media__video');
  const heroFinalFrame = document.querySelector('.hero-media__final');
  const heroVisual = document.querySelector('.hero-visual');
  const parallaxLayers = [...document.querySelectorAll('[data-parallax]')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  if (heroMedia && heroVideo) {
    const showFallback = () => heroMedia.classList.add('is-fallback');
    const holdFinalFrame = () => {
      heroVideo.pause();
      heroMedia.classList.add('is-ended');
    };

    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    heroVideo.playsInline = true;
    heroVideo.addEventListener('ended', holdFinalFrame, { once: true });
    heroVideo.addEventListener('error', showFallback, { once: true });

    if (heroFinalFrame && typeof heroFinalFrame.decode === 'function') {
      heroFinalFrame.decode().catch(() => {});
    }

    try {
      const playback = heroVideo.play();
      if (playback && typeof playback.catch === 'function') playback.catch(showFallback);
    } catch {
      showFallback();
    }
  }

  let scrollFrame = 0;
  const updateScrollEffects = () => {
    scrollFrame = 0;
    const y = window.scrollY;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pageProgress = clamp(y / maxScroll);

    root.style.setProperty('--scroll-progress', pageProgress.toFixed(4));
    if (progress) progress.setAttribute('aria-valuenow', Math.round(pageProgress * 100));
    header?.classList.toggle('is-scrolled', y > 36);

    if (!reduceMotion && hero) {
      const heroProgress = clamp(y / Math.max(1, hero.offsetHeight));
      parallaxLayers.forEach((layer) => {
        const strength = Number(layer.dataset.parallax || 0);
        layer.style.translate = `0 ${heroProgress * strength * window.innerHeight}px`;
      });
    }

    if (!reduceMotion && processStory && processTrack) {
      const rect = processStory.getBoundingClientRect();
      const distance = Math.max(1, processStory.offsetHeight - window.innerHeight);
      const storyProgress = clamp(-rect.top / distance);
      processTrack.style.transform = `translate3d(${-75 * storyProgress}%,0,0)`;
    }

    if (!reduceMotion && contact) {
      const rect = contact.getBoundingClientRect();
      const visible = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height));
      const offset = Math.round((visible - .5) * 54);
      const grid = contact.querySelector('.contact-grid');
      if (grid) grid.style.backgroundPosition = `${offset}px ${-offset}px`;
    }
  };

  const requestScrollUpdate = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollEffects);
  };

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate, { passive: true });
  updateScrollEffects();

  const revealItems = [...document.querySelectorAll('.reveal')];
  document.querySelectorAll('.service-grid, .case-list, .founder-grid').forEach((group) => {
    [...group.querySelectorAll(':scope > .reveal')].forEach((item, index) => {
      item.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 70}ms`);
    });
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  if (finePointer && !reduceMotion) {
    const aura = document.querySelector('.cursor-aura');
    window.addEventListener('pointermove', (event) => {
      root.style.setProperty('--cursor-x', `${event.clientX}px`);
      root.style.setProperty('--cursor-y', `${event.clientY}px`);
      aura?.classList.add('is-visible');
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => aura?.classList.remove('is-visible'));

    document.querySelectorAll('.service-card, [data-tilt-card]').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = clamp((event.clientX - rect.left) / rect.width) - .5;
        const y = clamp((event.clientY - rect.top) / rect.height) - .5;
        card.style.setProperty('--card-rx', `${(-y * 5).toFixed(2)}deg`);
        card.style.setProperty('--card-ry', `${(x * 6).toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--card-rx', '0deg');
        card.style.setProperty('--card-ry', '0deg');
      });
    });

    document.querySelectorAll('[data-magnetic]').forEach((element) => {
      element.addEventListener('pointermove', (event) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - (rect.left + rect.width / 2)) * .13;
        const y = (event.clientY - (rect.top + rect.height / 2)) * .13;
        element.style.setProperty('--magnetic-x', `${x.toFixed(1)}px`);
        element.style.setProperty('--magnetic-y', `${y.toFixed(1)}px`);
      });
      element.addEventListener('pointerleave', () => {
        element.style.setProperty('--magnetic-x', '0px');
        element.style.setProperty('--magnetic-y', '0px');
      });
    });
  }

  let interactionTimer = 0;
  const activateCore = () => {
    if (!heroVisual) return;
    window.clearTimeout(interactionTimer);
    heroVisual.classList.add('is-activated');
    heroVisual.setAttribute('aria-pressed', 'true');
    terrain?.burst();
    interactionTimer = window.setTimeout(() => {
      heroVisual.classList.remove('is-activated');
      heroVisual.setAttribute('aria-pressed', 'false');
    }, 920);
  };

  if (hero && heroVisual && finePointer && !reduceMotion) {
    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      const x = clamp((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = clamp((event.clientY - rect.top) / rect.height) * 2 - 1;
      hero.style.setProperty('--pointer-x', x.toFixed(3));
      hero.style.setProperty('--pointer-y', y.toFixed(3));
      heroVisual.style.setProperty('--interaction', '.8');
      terrain?.setPointer((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height, true);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      hero.style.setProperty('--pointer-x', '0');
      hero.style.setProperty('--pointer-y', '0');
      heroVisual.style.setProperty('--interaction', '0');
      terrain?.setPointer(.72, .45, false);
    });
  }

  heroVisual?.addEventListener('click', activateCore);
  heroVisual?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    activateCore();
  });

  class DigitalTerrain {
    constructor(canvas, host) {
      this.canvas = canvas;
      this.host = host;
      this.context = canvas.getContext('2d', { alpha: true });
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.pointer = { x: .72, y: .45, tx: .72, ty: .45, active: 0, targetActive: 0 };
      this.burstPower = 0;
      this.visible = true;
      this.resize = this.resize.bind(this);
      this.draw = this.draw.bind(this);
      this.resize();

      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(this.resize);
        this.resizeObserver.observe(host);
      } else {
        window.addEventListener('resize', this.resize, { passive: true });
      }

      if ('IntersectionObserver' in window) {
        this.visibilityObserver = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; }, { rootMargin: '20%' });
        this.visibilityObserver.observe(host);
      }

      requestAnimationFrame(this.draw);
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = Math.max(1, rect.width);
      this.height = Math.max(1, rect.height);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.context?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    setPointer(x, y, active) {
      this.pointer.tx = clamp(x);
      this.pointer.ty = clamp(y);
      this.pointer.targetActive = active ? 1 : 0;
    }

    burst() {
      this.burstPower = 1;
    }

    elevation(x, z, time) {
      const mountain = Math.exp(-(((x - .68) ** 2) / .025 + ((z - .42) ** 2) / .055));
      const ridge = .56 * Math.exp(-(((x - .43) ** 2) / .075 + ((z - .64) ** 2) / .12));
      const leftRise = .34 * Math.exp(-(((x - .13) ** 2) / .035 + ((z - .57) ** 2) / .1));
      const detail = Math.sin(x * 25 + z * 7 + time) * .025 + Math.sin(x * 11 - z * 19 - time * .7) * .018;
      const pointerDistance = ((x - this.pointer.x) ** 2) / .018 + ((z - this.pointer.y) ** 2) / .04;
      const pointerLift = Math.exp(-pointerDistance) * (.16 * this.pointer.active + .12 * this.burstPower);
      return mountain * .58 + ridge * .38 + leftRise * .32 + detail + pointerLift;
    }

    project(x, z, elevation) {
      const spread = 1 + z * .42;
      return {
        x: this.width * .5 + (x - .5) * this.width * spread,
        y: this.height * (.18 + z * .78) - elevation * this.height * (.55 + z * .22),
      };
    }

    draw(timestamp) {
      if (!this.context) return;
      if (!this.visible && !reduceMotion) {
        requestAnimationFrame(this.draw);
        return;
      }

      const ctx = this.context;
      const time = reduceMotion ? 0 : timestamp * .00028;
      this.pointer.x += (this.pointer.tx - this.pointer.x) * .055;
      this.pointer.y += (this.pointer.ty - this.pointer.y) * .055;
      this.pointer.active += (this.pointer.targetActive - this.pointer.active) * .06;
      this.burstPower *= .945;

      ctx.clearRect(0, 0, this.width, this.height);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const columns = this.width < 700 ? 34 : 58;
      const rows = this.width < 700 ? 21 : 29;
      const points = [];

      for (let row = 0; row < rows; row += 1) {
        const z = row / (rows - 1);
        const line = [];
        for (let column = 0; column < columns; column += 1) {
          const x = column / (columns - 1);
          line.push(this.project(x, z, this.elevation(x, z, time)));
        }
        points.push(line);

        const alpha = .055 + z * .17;
        const hue = row % 7 === 0 ? '116,87,255' : row > rows * .66 ? '255,90,54' : '198,255,56';
        ctx.strokeStyle = `rgba(${hue},${alpha})`;
        ctx.lineWidth = row % 7 === 0 ? 1.15 : .72;
        ctx.beginPath();
        line.forEach((point, index) => {
          if (index) ctx.lineTo(point.x, point.y);
          else ctx.moveTo(point.x, point.y);
        });
        ctx.stroke();
      }

      for (let column = 0; column < columns; column += 3) {
        ctx.strokeStyle = `rgba(198,255,56,${column % 9 === 0 ? .16 : .075})`;
        ctx.lineWidth = column % 9 === 0 ? .9 : .55;
        ctx.beginPath();
        points.forEach((line, index) => {
          const point = line[column];
          if (index) ctx.lineTo(point.x, point.y);
          else ctx.moveTo(point.x, point.y);
        });
        ctx.stroke();
      }

      if (this.pointer.active > .02 || this.burstPower > .04) {
        const point = this.project(this.pointer.x, this.pointer.y, this.elevation(this.pointer.x, this.pointer.y, time));
        const radius = 4 + this.pointer.active * 5 + this.burstPower * 26;
        const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * 7);
        glow.addColorStop(0, `rgba(198,255,56,${.72 * Math.max(this.pointer.active, this.burstPower)})`);
        glow.addColorStop(1, 'rgba(198,255,56,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius * 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(242,241,235,${.5 * Math.max(this.pointer.active, this.burstPower)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
      if (!reduceMotion) requestAnimationFrame(this.draw);
    }
  }

  const terrainCanvas = document.querySelector('#terrainCanvas');
  const terrain = terrainCanvas && hero ? new DigitalTerrain(terrainCanvas, hero) : null;

  const roadProject = document.querySelector('[data-road-project]');
  const roadFrame = roadProject?.querySelector('iframe');
  const roadToggle = roadProject?.querySelector('[data-road-toggle]');
  const roadToggleLabel = roadToggle?.querySelector('span');
  const setRoadProjectActive = (active) => {
    if (!roadProject || !roadFrame || !roadToggle || !roadToggleLabel) return;
    roadProject.classList.toggle('is-active', active);
    roadToggle.setAttribute('aria-pressed', String(active));
    roadToggleLabel.textContent = active ? 'Вернуться к странице' : 'Запустить мини-игру';
    roadFrame.setAttribute('tabindex', active ? '0' : '-1');
    if (active) requestAnimationFrame(() => roadFrame.focus());
  };
  roadToggle?.addEventListener('click', () => setRoadProjectActive(!roadProject.classList.contains('is-active')));
})();

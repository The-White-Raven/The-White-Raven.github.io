(() => {
  'use strict';

  const root = document.documentElement;

  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.scroll-progress');

  const processStory = document.querySelector('.process-story');
  const processPin = document.querySelector('.process-pin');
  const processTrack = document.querySelector('.process-track');

  const contact = document.querySelector('.contact');
  const hero = document.querySelector('.hero');
  const heroMedia = document.querySelector('.hero-media');
  const heroVideo = document.querySelector('.hero-media__video');
  const heroFinalFrame = document.querySelector('.hero-media__final');
  const heroVisual = document.querySelector('.hero-visual');

  const parallaxLayers = [...document.querySelectorAll('[data-parallax]')];

  const reduceMotionQuery = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );

  const finePointerQuery = window.matchMedia(
    '(pointer: fine)'
  );

  const reduceMotion = reduceMotionQuery.matches;
  const finePointer = finePointerQuery.matches;

  const clamp = (value, min = 0, max = 1) =>
    Math.min(max, Math.max(min, value));

  /* =========================================================
     HERO VIDEO
  ========================================================= */

  if (heroMedia && heroVideo) {
    const showFallback = () => {
      heroMedia.classList.add('is-fallback');
    };

    const holdFinalFrame = () => {
      heroVideo.pause();
      heroMedia.classList.add('is-ended');
    };

    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    heroVideo.playsInline = true;

    heroVideo.addEventListener('ended', holdFinalFrame, {
      once: true
    });

    heroVideo.addEventListener('error', showFallback, {
      once: true
    });

    if (
      heroFinalFrame &&
      typeof heroFinalFrame.decode === 'function'
    ) {
      heroFinalFrame.decode().catch(() => {});
    }

    try {
      const playback = heroVideo.play();

      if (
        playback &&
        typeof playback.catch === 'function'
      ) {
        playback.catch(showFallback);
      }
    } catch {
      showFallback();
    }
  }

  /* =========================================================
     HORIZONTAL PROCESS STORY
     
     ВАЖНО:
     Вертикальный скролл страницы двигает track
     горизонтально от 0% до -75%.

     4 карточки = 400% ширины.
     Чтобы показать 4-ю карточку, нужно сместить track
     на 75% его собственной ширины.
  ========================================================= */

  const setupProcessStory = () => {
    if (!processStory || !processTrack || !processPin) {
      return;
    }

    if (reduceMotion) {
      processStory.style.height = 'auto';
      processStory.style.overflow = 'visible';

      processPin.style.position = 'relative';
      processPin.style.height = 'auto';

      processTrack.style.position = 'relative';
      processTrack.style.width = '100%';
      processTrack.style.height = 'auto';
      processTrack.style.display = 'block';
      processTrack.style.transform = 'none';

      processTrack
        .querySelectorAll('.process-card')
        .forEach((card) => {
          card.style.width = '100%';
          card.style.minHeight = '72vh';
          card.style.height = 'auto';
          card.style.flex = 'none';
        });

      return;
    }

    /*
      Сбрасываем старую механику horizontal overflow.
      Теперь горизонтальное движение полностью контролируется
      вертикальным scroll progress.
    */

    processStory.style.position = 'relative';

    /*
      4 экрана высоты:
      1 экран — первая карточка
      2 экран — вторая
      3 экран — третья
      4 экран — четвертая

      Фактическая зона движения sticky:
      400vh - 100vh = 300vh.
    */
    processStory.style.height = '400vh';

    /*
      Не даём самому story создавать отдельный горизонтальный
      scrollbar и не позволяем ему обрезать вертикальный поток.
    */
    processStory.style.overflow = 'visible';
    processStory.style.overflowX = 'visible';
    processStory.style.overflowY = 'visible';

    /*
      Чёрный фон на всю высоту story.
      Это убирает белую область перед .proof.
    */
    processStory.style.background = 'var(--ink)';

    /*
      Sticky viewport.
    */
    processPin.style.position = 'sticky';
    processPin.style.top = '0';
    processPin.style.height = '100vh';
    processPin.style.minHeight = '100svh';
    processPin.style.overflow = 'hidden';
    processPin.style.background = 'var(--ink)';

    /*
      Track должен быть шириной ровно 400%.
    */
    processTrack.style.position = 'absolute';
    processTrack.style.top = '0';
    processTrack.style.left = '0';
    processTrack.style.width = '400%';
    processTrack.style.height = '100%';
    processTrack.style.display = 'flex';
    processTrack.style.flexWrap = 'nowrap';
    processTrack.style.willChange = 'transform';
    processTrack.style.transform = 'translate3d(0, 0, 0)';

    /*
      Четыре карточки.
    */
    processTrack
      .querySelectorAll('.process-card')
      .forEach((card) => {
        card.style.width = '25%';
        card.style.flex = '0 0 25%';
        card.style.height = '100%';
        card.style.minWidth = '0';
      });
  };

  setupProcessStory();

  /* =========================================================
     PROCESS SCROLL UPDATE
  ========================================================= */

  const updateProcessStory = () => {
    if (
      reduceMotion ||
      !processStory ||
      !processTrack ||
      !processPin
    ) {
      return;
    }

    const rect = processStory.getBoundingClientRect();

    /*
      Когда верх story находится в верхней части viewport:
      progress = 0

      Когда нижняя часть story доходит до нижней границы viewport:
      progress = 1
    */

    const scrollDistance =
      processStory.offsetHeight - window.innerHeight;

    if (scrollDistance <= 0) {
      processTrack.style.transform =
        'translate3d(0, 0, 0)';

      return;
    }

    const passed =
      -rect.top;

    const storyProgress = clamp(
      passed / scrollDistance
    );

    /*
      Track = 400%.
      Четыре карточки по 25%.
      Нужно пройти:
      0 → 25 → 50 → 75

      Поэтому конечная позиция = -75%.
    */

    const translateX =
      -(storyProgress * 75);

    processTrack.style.transform =
      `translate3d(${translateX}%, 0, 0)`;
  };

  /* =========================================================
     GLOBAL SCROLL EFFECTS
  ========================================================= */

  let scrollFrame = 0;

  const updateScrollEffects = () => {
    scrollFrame = 0;

    const y = window.scrollY;

    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight -
        window.innerHeight
    );

    const pageProgress = clamp(
      y / maxScroll
    );

    root.style.setProperty(
      '--scroll-progress',
      pageProgress.toFixed(4)
    );

    if (progress) {
      progress.setAttribute(
        'aria-valuenow',
        Math.round(pageProgress * 100)
      );
    }

    header?.classList.toggle(
      'is-scrolled',
      y > 36
    );

    /*
      HERO PARALLAX
    */

    if (!reduceMotion && hero) {
      const heroProgress = clamp(
        y / Math.max(1, hero.offsetHeight)
      );

      parallaxLayers.forEach((layer) => {
        const strength = Number(
          layer.dataset.parallax || 0
        );

        layer.style.translate =
          `0 ${
            heroProgress *
            strength *
            window.innerHeight
          }px`;
      });
    }

    /*
      HORIZONTAL PROCESS
    */

    updateProcessStory();

    /*
      CONTACT GRID
    */

    if (!reduceMotion && contact) {
      const rect =
        contact.getBoundingClientRect();

      const visible = clamp(
        (window.innerHeight - rect.top) /
          (window.innerHeight + rect.height)
      );

      const offset =
        Math.round((visible - 0.5) * 54);

      const grid =
        contact.querySelector('.contact-grid');

      if (grid) {
        grid.style.backgroundPosition =
          `${offset}px ${-offset}px`;
      }
    }
  };

  const requestScrollUpdate = () => {
    if (!scrollFrame) {
      scrollFrame =
        requestAnimationFrame(
          updateScrollEffects
        );
    }
  };

  window.addEventListener(
    'scroll',
    requestScrollUpdate,
    {
      passive: true
    }
  );

  window.addEventListener(
    'resize',
    () => {
      setupProcessStory();
      requestScrollUpdate();
    },
    {
      passive: true
    }
  );

  updateScrollEffects();

  /* =========================================================
     REVEAL ANIMATIONS
  ========================================================= */

  const revealItems = [
    ...document.querySelectorAll('.reveal')
  ];

  document
    .querySelectorAll(
      '.service-grid, .case-list, .founder-grid'
    )
    .forEach((group) => {
      [
        ...group.querySelectorAll(
          ':scope > .reveal'
        )
      ].forEach((item, index) => {
        item.style.setProperty(
          '--reveal-delay',
          `${Math.min(index, 5) * 70}ms`
        );
      });
    });

  if (
    reduceMotion ||
    !('IntersectionObserver' in window)
  ) {
    revealItems.forEach((item) => {
      item.classList.add('is-visible');
    });
  } else {
    const revealObserver =
      new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add(
              'is-visible'
            );

            observer.unobserve(
              entry.target
            );
          });
        },
        {
          rootMargin:
            '0px 0px -8% 0px',
          threshold: 0.12
        }
      );

    revealItems.forEach((item) => {
      revealObserver.observe(item);
    });
  }

  /* =========================================================
     CURSOR AURA + TILT
  ========================================================= */

  if (finePointer && !reduceMotion) {
    const aura =
      document.querySelector('.cursor-aura');

    window.addEventListener(
      'pointermove',
      (event) => {
        root.style.setProperty(
          '--cursor-x',
          `${event.clientX}px`
        );

        root.style.setProperty(
          '--cursor-y',
          `${event.clientY}px`
        );

        aura?.classList.add(
          'is-visible'
        );
      },
      {
        passive: true
      }
    );

    document.documentElement.addEventListener(
      'mouseleave',
      () => {
        aura?.classList.remove(
          'is-visible'
        );
      }
    );

    document
      .querySelectorAll(
        '.service-card, [data-tilt-card]'
      )
      .forEach((card) => {
        card.addEventListener(
          'pointermove',
          (event) => {
            const rect =
              card.getBoundingClientRect();

            const x =
              clamp(
                (event.clientX -
                  rect.left) /
                  rect.width
              ) - 0.5;

            const y =
              clamp(
                (event.clientY -
                  rect.top) /
                  rect.height
              ) - 0.5;

            card.style.setProperty(
              '--card-rx',
              `${(-y * 5).toFixed(2)}deg`
            );

            card.style.setProperty(
              '--card-ry',
              `${(x * 6).toFixed(2)}deg`
            );
          }
        );

        card.addEventListener(
          'pointerleave',
          () => {
            card.style.setProperty(
              '--card-rx',
              '0deg'
            );

            card.style.setProperty(
              '--card-ry',
              '0deg'
            );
          }
        );
      });

    document
      .querySelectorAll(
        '[data-magnetic]'
      )
      .forEach((element) => {
        element.addEventListener(
          'pointermove',
          (event) => {
            const rect =
              element.getBoundingClientRect();

            const x =
              (event.clientX -
                (rect.left +
                  rect.width / 2)) *
              0.13;

            const y =
              (event.clientY -
                (rect.top +
                  rect.height / 2)) *
              0.13;

            element.style.setProperty(
              '--magnetic-x',
              `${x.toFixed(1)}px`
            );

            element.style.setProperty(
              '--magnetic-y',
              `${y.toFixed(1)}px`
            );
          }
        );

        element.addEventListener(
          'pointerleave',
          () => {
            element.style.setProperty(
              '--magnetic-x',
              '0px'
            );

            element.style.setProperty(
              '--magnetic-y',
              '0px'
            );
          }
        );
      });
  }

  /* =========================================================
     HERO CORE INTERACTION
  ========================================================= */

  let interactionTimer = 0;

  const activateCore = () => {
    if (!heroVisual) {
      return;
    }

    window.clearTimeout(
      interactionTimer
    );

    heroVisual.classList.add(
      'is-activated'
    );

    heroVisual.setAttribute(
      'aria-pressed',
      'true'
    );

    terrain?.burst();

    interactionTimer =
      window.setTimeout(() => {
        heroVisual.classList.remove(
          'is-activated'
        );

        heroVisual.setAttribute(
          'aria-pressed',
          'false'
        );
      }, 920);
  };

  if (
    hero &&
    heroVisual &&
    finePointer &&
    !reduceMotion
  ) {
    hero.addEventListener(
      'pointermove',
      (event) => {
        const rect =
          hero.getBoundingClientRect();

        const x =
          clamp(
            (event.clientX -
              rect.left) /
              rect.width
          ) * 2 - 1;

        const y =
          clamp(
            (event.clientY -
              rect.top) /
              rect.height
          ) * 2 - 1;

        hero.style.setProperty(
          '--pointer-x',
          x.toFixed(3)
        );

        hero.style.setProperty(
          '--pointer-y',
          y.toFixed(3)
        );

        heroVisual.style.setProperty(
          '--interaction',
          '.8'
        );

        terrain?.setPointer(
          (event.clientX -
            rect.left) /
            rect.width,
          (event.clientY -
            rect.top) /
            rect.height,
          true
        );
      },
      {
        passive: true
      }
    );

    hero.addEventListener(
      'pointerleave',
      () => {
        hero.style.setProperty(
          '--pointer-x',
          '0'
        );

        hero.style.setProperty(
          '--pointer-y',
          '0'
        );

        heroVisual.style.setProperty(
          '--interaction',
          '0'
        );

        terrain?.setPointer(
          0.72,
          0.45,
          false
        );
      }
    );
  }

  heroVisual?.addEventListener(
    'click',
    activateCore
  );

  heroVisual?.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key !== 'Enter' &&
        event.key !== ' '
      ) {
        return;
      }

      event.preventDefault();
      activateCore();
    }
  );

  /* =========================================================
     DIGITAL TERRAIN
  ========================================================= */

  class DigitalTerrain {
    constructor(canvas, host) {
      this.canvas = canvas;
      this.host = host;

      this.context =
        canvas.getContext(
          '2d',
          {
            alpha: true
          }
        );

      this.width = 0;
      this.height = 0;
      this.dpr = 1;

      this.pointer = {
        x: 0.72,
        y: 0.45,
        tx: 0.72,
        ty: 0.45,
        active: 0,
        targetActive: 0
      };

      this.burstPower = 0;
      this.visible = true;

      this.resize =
        this.resize.bind(this);

      this.draw =
        this.draw.bind(this);

      this.resize();

      if (
        'ResizeObserver' in window
      ) {
        this.resizeObserver =
          new ResizeObserver(
            this.resize
          );

        this.resizeObserver.observe(
          host
        );
      } else {
        window.addEventListener(
          'resize',
          this.resize,
          {
            passive: true
          }
        );
      }

      if (
        'IntersectionObserver' in
        window
      ) {
        this.visibilityObserver =
          new IntersectionObserver(
            ([entry]) => {
              this.visible =
                entry.isIntersecting;
            },
            {
              rootMargin: '20%'
            }
          );

        this.visibilityObserver.observe(
          host
        );
      }

      requestAnimationFrame(
        this.draw
      );
    }

    resize() {
      const rect =
        this.canvas.getBoundingClientRect();

      this.dpr = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      this.width =
        Math.max(
          1,
          rect.width
        );

      this.height =
        Math.max(
          1,
          rect.height
        );

      this.canvas.width =
        Math.round(
          this.width * this.dpr
        );

      this.canvas.height =
        Math.round(
          this.height * this.dpr
        );

      this.context?.setTransform(
        this.dpr,
        0,
        0,
        this.dpr,
        0,
        0
      );
    }

    setPointer(x, y, active) {
      this.pointer.tx =
        clamp(x);

      this.pointer.ty =
        clamp(y);

      this.pointer.targetActive =
        active ? 1 : 0;
    }

    burst() {
      this.burstPower = 1;
    }

    elevation(x, z, time) {
      const mountain =
        Math.exp(
          -(
            ((x - 0.68) ** 2) /
              0.025 +
            ((z - 0.42) ** 2) /
              0.055
          )
        );

      const ridge =
        0.56 *
        Math.exp(
          -(
            ((x - 0.43) ** 2) /
              0.075 +
            ((z - 0.64) ** 2) /
              0.12
          )
        );

      const leftRise =
        0.34 *
        Math.exp(
          -(
            ((x - 0.13) ** 2) /
              0.035 +
            ((z - 0.57) ** 2) /
              0.1
          )
        );

      const detail =
        Math.sin(
          x * 25 +
            z * 7 +
            time
        ) *
          0.025 +
        Math.sin(
          x * 11 -
            z * 19 -
            time * 0.7
        ) *
          0.018;

      const pointerDistance =
        ((x -
          this.pointer.x) **
          2) /
          0.018 +
        ((z -
          this.pointer.y) **
          2) /
          0.04;

      const pointerLift =
        Math.exp(
          -pointerDistance
        ) *
        (
          0.16 *
            this.pointer.active +
          0.12 *
            this.burstPower
        );

      return (
        mountain * 0.58 +
        ridge * 0.38 +
        leftRise * 0.32 +
        detail +
        pointerLift
      );
    }

    project(x, z, elevation) {
      const spread =
        1 + z * 0.42;

      return {
        x:
          this.width * 0.5 +
          (x - 0.5) *
            this.width *
            spread,

        y:
          this.height *
            (0.18 + z * 0.78) -
          elevation *
            this.height *
            (0.55 + z * 0.22)
      };
    }

    draw(timestamp) {
      if (!this.context) {
        return;
      }

      if (
        !this.visible &&
        !reduceMotion
      ) {
        requestAnimationFrame(
          this.draw
        );

        return;
      }

      const ctx =
        this.context;

      const time =
        reduceMotion
          ? 0
          : timestamp * 0.00028;

      this.pointer.x +=
        (this.pointer.tx -
          this.pointer.x) *
        0.055;

      this.pointer.y +=
        (this.pointer.ty -
          this.pointer.y) *
        0.055;

      this.pointer.active +=
        (this.pointer.targetActive -
          this.pointer.active) *
        0.06;

      this.burstPower *=
        0.945;

      ctx.clearRect(
        0,
        0,
        this.width,
        this.height
      );

      ctx.save();

      ctx.globalCompositeOperation =
        'lighter';

      ctx.lineCap =
        'round';

      ctx.lineJoin =
        'round';

      const columns =
        this.width < 700
          ? 34
          : 58;

      const rows =
        this.width < 700
          ? 21
          : 29;

      const points = [];

      for (
        let row = 0;
        row < rows;
        row += 1
      ) {
        const z =
          row /
          (rows - 1);

        const line = [];

        for (
          let column = 0;
          column < columns;
          column += 1
        ) {
          const x =
            column /
            (columns - 1);

          line.push(
            this.project(
              x,
              z,
              this.elevation(
                x,
                z,
                time
              )
            )
          );
        }

        points.push(line);

        const alpha =
          0.055 +
          z * 0.17;

        const hue =
          row % 7 === 0
            ? '116,87,255'
            : row >
              rows * 0.66
            ? '255,90,54'
            : '198,255,56';

        ctx.strokeStyle =
          `rgba(${hue},${alpha})`;

        ctx.lineWidth =
          row % 7 === 0
            ? 1.15
            : 0.72;

        ctx.beginPath();

        line.forEach(
          (point, index) => {
            if (index) {
              ctx.lineTo(
                point.x,
                point.y
              );
            } else {
              ctx.moveTo(
                point.x,
                point.y
              );
            }
          }
        );

        ctx.stroke();
      }

      for (
        let column = 0;
        column < columns;
        column += 3
      ) {
        ctx.strokeStyle =
          `rgba(198,255,56,${
            column % 9 === 0
              ? 0.16
              : 0.075
          })`;

        ctx.lineWidth =
          column % 9 === 0
            ? 0.9
            : 0.55;

        ctx.beginPath();

        points.forEach(
          (line, index) => {
            const point =
              line[column];

            if (index) {
              ctx.lineTo(
                point.x,
                point.y
              );
            } else {
              ctx.moveTo(
                point.x,
                point.y
              );
            }
          }
        );

        ctx.stroke();
      }

      if (
        this.pointer.active > 0.02 ||
        this.burstPower > 0.04
      ) {
        const point =
          this.project(
            this.pointer.x,
            this.pointer.y,
            this.elevation(
              this.pointer.x,
              this.pointer.y,
              time
            )
          );

        const radius =
          4 +
          this.pointer.active * 5 +
          this.burstPower * 26;

        const glow =
          ctx.createRadialGradient(
            point.x,
            point.y,
            0,
            point.x,
            point.y,
            radius * 7
          );

        glow.addColorStop(
          0,
          `rgba(198,255,56,${
            0.72 *
            Math.max(
              this.pointer.active,
              this.burstPower
            )
          })`
        );

        glow.addColorStop(
          1,
          'rgba(198,255,56,0)'
        );

        ctx.fillStyle = glow;

        ctx.beginPath();

        ctx.arc(
          point.x,
          point.y,
          radius * 7,
          0,
          Math.PI * 2
        );

        ctx.fill();

        ctx.strokeStyle =
          `rgba(242,241,235,${
            0.5 *
            Math.max(
              this.pointer.active,
              this.burstPower
            )
          })`;

        ctx.lineWidth = 1;

        ctx.beginPath();

        ctx.arc(
          point.x,
          point.y,
          radius,
          0,
          Math.PI * 2
        );

        ctx.stroke();
      }

      ctx.restore();

      if (!reduceMotion) {
        requestAnimationFrame(
          this.draw
        );
      }
    }
  }

  /* =========================================================
     TERRAIN INIT
  ========================================================= */

  const terrainCanvas =
    document.querySelector(
      '#terrainCanvas'
    );

  const terrain =
    terrainCanvas && hero
      ? new DigitalTerrain(
          terrainCanvas,
          hero
        )
      : null;

  /* =========================================================
     ROAD PROJECT / MINI GAME
  ========================================================= */

  const roadProject =
    document.querySelector(
      '[data-road-project]'
    );

  const roadFrame =
    roadProject?.querySelector(
      'iframe'
    );

  const roadToggle =
    roadProject?.querySelector(
      '[data-road-toggle]'
    );

  const roadToggleLabel =
    roadToggle?.querySelector(
      'span'
    );

  const setRoadProjectActive =
    (active) => {
      if (
        !roadProject ||
        !roadFrame ||
        !roadToggle ||
        !roadToggleLabel
      ) {
        return;
      }

      roadProject.classList.toggle(
        'is-active',
        active
      );

      roadToggle.setAttribute(
        'aria-pressed',
        String(active)
      );

      roadToggleLabel.textContent =
        active
          ? 'Вернуться к странице'
          : 'Запустить мини-игру';

      roadFrame.setAttribute(
        'tabindex',
        active ? '0' : '-1'
      );

      if (active) {
        requestAnimationFrame(
          () => {
            roadFrame.focus();
          }
        );
      }
    };

  roadToggle?.addEventListener(
    'click',
    () => {
      setRoadProjectActive(
        !roadProject.classList.contains(
          'is-active'
        )
      );
    }
  );
})();

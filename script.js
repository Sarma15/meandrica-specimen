/* ============ MEANDRICA — scrollytelling engine ============ */
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wdth = (el, v) => { el.style.fontVariationSettings = "'wght' 500,'wdth' " + Math.round(v); };

  /* ---- character set grid ---- */
  // Croatian abeceda — only the glyphs Meandrica actually draws (no Q/W/X/Y, no lowercase/digits)
  const GLYPHS = "ABCČĆDĐEFGHIJKLMNOPRSŠTUVZŽ".split("");
  const CSET_STYLES = [500, 1000, 10];   // REGULAR · LOW · BLACK
  const grid = document.getElementById("glyphGrid");
  if (grid) {
    const frag = document.createDocumentFragment();
    CSET_STYLES.forEach(w => {
      const row = document.createElement("div");
      row.className = "glyph-row";
      GLYPHS.forEach(g => {
        const cell = document.createElement("div");
        cell.className = "glyph-cell";
        const gly = document.createElement("span");
        gly.className = "gly";
        gly.textContent = g;
        gly.style.fontVariationSettings = "'wght' 500,'wdth' " + w;
        const lab = document.createElement("span");
        lab.className = "lab";
        lab.textContent = g;
        cell.appendChild(gly);
        cell.appendChild(lab);
        row.appendChild(cell);
      });
      frag.appendChild(row);
    });
    grid.appendChild(frag);

    // hover → big letter preview that follows the cursor, over everything
    const preview = document.getElementById("glyphPreview");
    const gpGlyph = document.getElementById("gpGlyph");
    const gpLab = document.getElementById("gpLab");
    if (preview && gpGlyph) {
      grid.addEventListener("mouseover", (e) => {
        const g = e.target.closest(".glyph-cell") && e.target.closest(".glyph-cell").querySelector(".gly");
        if (!g) return;
        gpGlyph.textContent = g.textContent;
        gpGlyph.style.fontVariationSettings = g.style.fontVariationSettings || "'wght' 500,'wdth' 500";
        if (gpLab) gpLab.textContent = g.textContent;
        preview.classList.add("on");
      });
      grid.addEventListener("mousemove", (e) => {
        const w = preview.offsetWidth, h = preview.offsetHeight;
        let x = e.clientX + 26, y = e.clientY - h / 2;
        x = Math.min(x, window.innerWidth - w - 12);
        y = Math.max(12, Math.min(y, window.innerHeight - h - 12));
        preview.style.left = x + "px";
        preview.style.top = y + "px";
      });
      grid.addEventListener("mouseleave", () => preview.classList.remove("on"));
    }
  }

  /* ---- reveal on scroll ---- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  /* ---- scroll-spy side nav ---- */
  const sideLinks = [...document.querySelectorAll(".sidenav a")];
  const spyTargets = sideLinks.map(a => document.getElementById(a.dataset.target)).filter(Boolean);
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        sideLinks.forEach(l => l.classList.toggle("active", l.dataset.target === e.target.id));
      }
    });
  }, { rootMargin: "-45% 0px -45% 0px" });
  spyTargets.forEach(t => spy.observe(t));

  /* ---- elements driven by scroll ---- */
  const progress = document.getElementById("progress");
  const hero = document.getElementById("hero");
  const heroWord = document.getElementById("heroWord");
  const trailLine = document.getElementById("trailLine");
  const trail = document.getElementById("trail");
  const stupReveal = document.getElementById("stupReveal");
  const stupAction = stupReveal && stupReveal.querySelector(".stup-action");
  const mapScroll = document.getElementById("mapScroll");
  const mapImg = document.getElementById("mapImg");
  const morphGlyphs = [...document.querySelectorAll(".morph-glyph")];
  const trailLen = trailLine ? trailLine.getTotalLength() : 0;
  if (trailLine) { trailLine.style.strokeDasharray = trailLen; trailLine.style.strokeDashoffset = trailLen; }

  let ticking = false;
  function onScroll() {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    const scrollY = window.scrollY;
    const docH = document.documentElement.scrollHeight - vh;

    // progress bar
    if (progress) progress.style.width = (clamp(scrollY / docH, 0, 1) * 100) + "%";

    // hero word stays REGULAR & fixed-size; only a gentle fade as you scroll away
    if (hero && heroWord) {
      const hp = clamp(scrollY / (hero.offsetHeight * 0.9), 0, 1);
      heroWord.style.opacity = String(1 - hp * 0.5);
    }

    // trail line draw-in tied to its scroll position
    if (trail && trailLine) {
      const r = trail.getBoundingClientRect();
      const p = clamp((vh * 0.7 - r.top) / (r.height + vh * 0.5), 0, 1);
      trailLine.style.strokeDashoffset = String(trailLen * (1 - p));
    }

    // MAP: travel through the tall map as its window passes through the viewport
    if (mapScroll && mapImg) {
      const r = mapScroll.getBoundingClientRect();
      const travel = mapImg.offsetHeight - mapScroll.offsetHeight;   // overflow to scroll through
      if (travel > 0) {
        const p = clamp((vh - r.top) / (vh + r.height), 0, 1);
        mapImg.style.transform = "translateY(" + (-travel * p).toFixed(1) + "px)";
      }
    }

    // STUP reveal: action (yellow + S) wipes in top->down as the photo scrolls up
    if (stupReveal && stupAction) {
      const r = stupReveal.getBoundingClientRect();
      const center = r.top + r.height / 2;        // reveal plays in the lower third of the screen
      const p = clamp(0.5 + (vh * 0.72 - center) / (vh * 0.4), 0, 1);  // half-revealed at ~72% down
      stupAction.style.clipPath = "inset(0 0 " + ((1 - p) * 100).toFixed(1) + "% 0)";
    }

    // each .morph-glyph reacts to its own viewport position (parallax width)
    for (const el of morphGlyphs) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const p = clamp((vh - r.top) / (vh + r.height), 0, 1); // 0 entering bottom -> 1 leaving top
      const base = parseFloat(el.dataset.base || "60");
      const span = parseFloat(el.dataset.span || "300");
      wdth(el, base + span * p);
    }
  }

  // per-element morph ranges
  document.querySelector(".display-word") && Object.assign(document.querySelector(".display-word").dataset, { base: "15", span: "260" });
  document.querySelector(".azbuka") && Object.assign(document.querySelector(".azbuka").dataset, { base: "120", span: "500" });
  document.querySelector(".kupi") && Object.assign(document.querySelector(".kupi").dataset, { base: "80", span: "400" });
  document.querySelectorAll(".station-noimg").forEach(el => Object.assign(el.dataset, { base: "15", span: "200" }));

  // ---- hero title: split into letters, fit to screen, animate LOW -> REGULAR per letter ----
  let heroLetters = [];
  if (heroWord) {
    heroWord.innerHTML = heroWord.textContent.trim().split("")
      .map(c => '<span class="hl">' + c + '</span>').join("");
    heroLetters = [...heroWord.querySelectorAll(".hl")];
  }
  const setLetters = (w) => heroLetters.forEach(s => { s.style.fontVariationSettings = "'wght' 500,'wdth' " + Math.round(w); });
  function fitHero() {
    if (!heroWord) return;
    const prev = heroLetters.map(s => s.style.fontVariationSettings);  // measure at REGULAR so
    setLetters(500);                                                   // the reserved height (and
    heroWord.style.fontSize = "100px";                                 // the Latin title's spot) is
    const r = heroWord.getBoundingClientRect();                        // stable regardless of the wave
    heroLetters.forEach((s, i) => { s.style.fontVariationSettings = prev[i]; });
    if (!r.width || !r.height) return;
    const targetH = window.innerHeight * 0.639;  // Figma 0.71, −10%
    const targetW = window.innerWidth * 0.864;   // cap so it never overflows on narrow screens, −10%
    const scale = Math.min(targetW / r.width, targetH / r.height);
    heroWord.style.fontSize = (100 * scale) + "px";
  }
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function entrance() {
    if (!heroLetters.length || reduceMotion) { setLetters(500); return; }
    const dur = 440, stagger = 80, start = performance.now();
    const N = heroLetters.length;
    setLetters(1000); // begin on LOW (widest)
    (function frame(now) {
      let done = true;
      heroLetters.forEach((s, i) => {
        const t = clamp((now - start - i * stagger) / dur, 0, 1); // left -> right
        if (t < 1) done = false;
        const e = 1 - Math.pow(1 - t, 3);              // easeOutCubic
        s.style.fontVariationSettings = "'wght' 500,'wdth' " + Math.round(lerp(1000, 500, e));
      });
      if (!done) requestAnimationFrame(frame);
    })(performance.now());
  }
  function initHero() { fitHero(); entrance(); }
  fitHero();                                            // size immediately (font is preloaded)
  if (document.fonts && document.fonts.load) document.fonts.load('1em "Meandrica"').then(initHero, initHero);
  else initHero();
  window.addEventListener("resize", fitHero);

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  /* ---- marquees ---- */
  function marquee(el, speed) {
    if (!el) return;
    el.innerHTML = el.innerHTML + el.innerHTML;
    let x = 0;
    (function loop() {
      x -= speed;
      if (Math.abs(x) >= el.scrollWidth / 2) x = 0;
      el.style.transform = "translateX(" + x + "px)";
      requestAnimationFrame(loop);
    })();
  }
  marquee(document.getElementById("axesMarquee"), 0.7);
  marquee(document.getElementById("odmMarquee"), 0.6);

  /* ---- TYPE TESTER ---- */
  const T = {
    style: document.getElementById("styleSel"),
    varR: document.getElementById("varRange"), varV: document.getElementById("varVal"),
    sizeR: document.getElementById("sizeRange"), sizeV: document.getElementById("sizeVal"),
    leadR: document.getElementById("leadRange"), leadV: document.getElementById("leadVal"),
    text: document.getElementById("testerText"),
  };
  function applyTester() {
    if (!T.text) return;
    const w = +T.varR.value, s = +T.sizeR.value, l = +T.leadR.value / 100;
    T.text.style.fontVariationSettings = "'wght' 500,'wdth' " + w;
    T.text.style.fontSize = s + "px";
    T.text.style.lineHeight = l;
    T.varV.textContent = w;
    T.sizeV.textContent = s;
    T.leadV.textContent = l.toFixed(2);
  }
  const testerTag = document.getElementById("testerTag");
  function mirrorTester() {
    if (testerTag && T.text) testerTag.textContent = "/ " + (T.text.textContent || "").toUpperCase();
  }
  if (T.text) {
    T.style.addEventListener("change", () => { T.varR.value = T.style.value; applyTester(); });
    [T.varR, T.sizeR, T.leadR].forEach(r => r.addEventListener("input", applyTester));
    T.text.addEventListener("input", mirrorTester);   // live Latin mirror of what you type
    applyTester();
    mirrorTester();
  }

  /* ---- KATEDRA: loop through 3 photos, 0.5s each ---- */
  const katedraImg = document.getElementById("katedraImg");
  if (katedraImg) {
    const kFrames = ["assets/katedra-1.png", "assets/katedra-2.png", "assets/katedra-3.png"];
    kFrames.forEach(src => { const im = new Image(); im.src = src; });   // preload
    let ki = 0;
    setInterval(() => {
      ki = (ki + 1) % kFrames.length;
      katedraImg.src = kFrames[ki];
    }, 500);
  }

  /* ---- ZID: loop the 6 frames every 0.5s ---- */
  const zidImg = document.getElementById("zidImg");
  if (zidImg) {
    const zFrames = [1, 2, 3, 4, 5, 6].map(n => `assets/zid-${n}.png`);
    zFrames.forEach(src => { const im = new Image(); im.src = src; });   // preload
    let zi = 0;
    setInterval(() => {
      zi = (zi + 1) % zFrames.length;
      zidImg.src = zFrames[zi];
    }, 500);
  }

  /* ---- KLANAC: OLINFOS fills the photo width (LOW); 1s after entering, widths vary ---- */
  const olinfos = document.querySelector(".olinfos");
  const klanacStage = document.querySelector(".klanac-stage");
  if (olinfos && klanacStage) {
    function fitOlinfos() {
      const wasJumped = olinfos.classList.contains("jumped");
      olinfos.classList.remove("jumped");          // measure at LOW (widest)
      olinfos.style.fontSize = "100px";
      const w = olinfos.getBoundingClientRect().width;
      if (w) olinfos.style.fontSize = (100 * klanacStage.clientWidth * 0.98 / w) + "px";
      if (wasJumped) olinfos.classList.add("jumped");
    }
    olinfos.querySelectorAll(".olg").forEach(g => g.style.fontSize = "inherit");
    fitOlinfos();
    if (document.fonts && document.fonts.load) document.fonts.load('1em "Meandrica"').then(fitOlinfos);
    window.addEventListener("resize", fitOlinfos);

    let kt;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio > 0.3) {
          clearTimeout(kt);
          kt = setTimeout(() => olinfos.classList.add("jumped"), 500);   // 0.5s after entering
        } else {
          clearTimeout(kt);
          olinfos.classList.remove("jumped");
        }
      });
    }, { threshold: [0, 0.3, 0.6] });
    obs.observe(klanacStage);
  }

  /* ---- USPON: fit the LLLLLLL gradient to fill the photo width ---- */
  const usponWord = document.querySelector(".uspon-word");
  const usponStage = document.querySelector(".uspon-mon .ov-stage");
  if (usponWord && usponStage) {
    function fitUspon() {
      usponWord.style.fontSize = "100px";
      let wordW = 0;
      usponWord.querySelectorAll("span").forEach(s => wordW += s.getBoundingClientRect().width);
      if (wordW) usponWord.style.fontSize = (100 * usponStage.clientWidth * 0.95 / wordW) + "px";
    }
    fitUspon();
    if (document.fonts && document.fonts.load) document.fonts.load('1em "Meandrica"').then(fitUspon);
    window.addEventListener("resize", fitUspon);
  }

  /* ---- HUMSKA: fit the poem to fill the picture (width AND height), tracking 0 ---- */
  const humskaPoem = document.getElementById("humskaPoem");
  if (humskaPoem) {
    const hStage = humskaPoem.closest(".ov-stage");
    const hLines = humskaPoem.querySelectorAll(".hl");
    function fitHumska() {
      humskaPoem.style.fontSize = "100px";
      let maxW = 0;
      hLines.forEach(l => maxW = Math.max(maxW, l.getBoundingClientRect().width));
      const byWidth = 100 * hStage.clientWidth * 0.82 / maxW;
      const byHeight = hStage.clientHeight * 0.58 / (hLines.length * 0.95);
      if (maxW) humskaPoem.style.fontSize = Math.min(byWidth, byHeight) + "px";
    }
    fitHumska();
    if (document.fonts && document.fonts.load) document.fonts.load('1em "Meandrica"').then(fitHumska);
    window.addEventListener("resize", fitHumska);
  }

  /* ---- AXES: REGULAR / LOW / BLACK change the GLAGOLJATI style ---- */
  const glagWord = document.getElementById("glagWord");
  if (glagWord) {
    const btns = document.querySelectorAll(".lap-ctrl button");
    btns.forEach(btn => {
      const apply = () => {
        btns.forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        glagWord.style.fontVariationSettings = "'wght' 500,'wdth' " + btn.dataset.w;
      };
      btn.addEventListener("mouseenter", apply);   // change on hover, not click
      btn.addEventListener("focus", apply);
    });
  }

  /* ---- language toggle (visual state only for now) ---- */
  document.querySelectorAll(".lang-btn").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".lang-btn").forEach(x => x.classList.remove("is-active"));
      b.classList.add("is-active");
    });
  });

  /* ---- Latin-translation tooltip on every Meandrica display word ---- */
  const meTip = document.createElement("div");
  meTip.className = "me-tip";
  document.body.appendChild(meTip);
  const meTargets = [
    [".hero-word", "MEANDRICA"],
    [".big-glyph", "AMRA"],
    [".knifer-word", "KNIFER"],
    [".stup-ss", "SS"],
    [".olinfos", "OLINFOS"],
    [".vid-istra", "ISTRA"],
    [".uspon-word", "LLLLLLL"],
    [".odm-marquee-track", "VITA VITA · ŠTAMPA NAŠA · GORI GRE"],
    [".sfsn-word", "SMRT FAŠIZMU SLOBODA NARODU"],
  ];
  meTargets.forEach(([sel, latin]) => {
    document.querySelectorAll(sel).forEach(el => {
      el.style.cursor = "help";
      el.style.pointerEvents = "auto";
      el.addEventListener("mouseenter", () => { meTip.textContent = latin; meTip.classList.add("on"); });
      el.addEventListener("mousemove", (e) => {
        meTip.style.left = e.clientX + "px";
        meTip.style.top = (e.clientY - 18) + "px";
      });
      el.addEventListener("mouseleave", () => meTip.classList.remove("on"));
    });
  });
})();

/* ═══════════════════════════════════════════════════════════
   حِتّة ليك — app.js
   كل حاجة بتشتغل في المتصفح. مفيش سيرفر، مفيش حسابات.
   الحِتّة بتتشفّر بـ AES-GCM والمفتاح بيتولّد من باسوردك (PBKDF2).
   ═══════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  /* ───────── أدوات صغيرة ───────── */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const esc = (s = "") =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const store = {
    get(k, fb) {
      try {
        const raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : fb;
      } catch { return fb; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; }
      catch { toast("المتصفح مش مسموحله يحفظ. جرّب من غير وضع التصفح المتخفي."); return false; }
    },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };

  const KEY = {
    vault: "hetet.vault.v1",
    names: "hetet.names.v1",
    tasks: "hetet.tasks.v1",
    intro: "hetet.intro.seen",
  };

  /* ───────── توست ───────── */
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3400);
  }

  /* ───────── مودال ───────── */
  const modal = $("#modal");
  const modalBody = $("#modalBody");
  let lastFocus = null;

  function openModal(html) {
    lastFocus = document.activeElement;
    modalBody.innerHTML = html;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    const focusable = modal.querySelector("input, button:not(.modal-x), a, textarea");
    setTimeout(() => focusable && focusable.focus({ preventScroll: true }), 80);
  }
  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  });

  function confirmModal({ title, text, confirmLabel = "أيوه", danger = false, onConfirm }) {
    openModal(`
      <p class="modal-kicker">${danger ? "خطوة أخيرة" : "تأكيد"}</p>
      <h3>${esc(title)}</h3>
      <p>${text}</p>
      <div class="modal-actions">
        <button class="btn ${danger ? "btn-ghost" : "btn-primary"}" id="cfmYes" ${danger ? 'style="border-color:rgba(226,115,111,.45);color:#f0b4b0"' : ""}>${esc(confirmLabel)}</button>
        <button class="btn btn-ghost" data-close>لأ، خلاص</button>
      </div>
    `);
    $("#cfmYes").addEventListener("click", () => {
      closeModal();
      onConfirm && onConfirm();
    });
  }

  /* ───────── كونفيتي ───────── */
  function confetti(n = 26) {
    const box = $("#confetti");
    const colors = ["#f3bd88", "#e79d9d", "#f7e9db", "#d9a760", "#e5a378"];
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "conf";
      p.style.left = Math.random() * 96 + 2 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 2.4 + Math.random() * 2 + "s";
      p.style.animationDelay = Math.random() * 0.5 + "s";
      p.style.opacity = 0.5 + Math.random() * 0.5;
      p.style.width = p.style.height = 5 + Math.random() * 5 + "px";
      box.appendChild(p);
      setTimeout(() => p.remove(), 5200);
    }
  }

  /* ───────── الأسماء ───────── */
  const defaultNames = { me: "صاحبك", him: "" };
  function getNames() { return { ...defaultNames, ...store.get(KEY.names, {}) }; }
  function paintNames() {
    const { me, him } = getNames();
    $$("[data-me]").forEach((el) => (el.textContent = me || defaultNames.me));
    $$("[data-him]").forEach((el) => (el.textContent = him ? him : ""));
    $$("[data-him-line]").forEach((el) => (el.textContent = him ? `لـ ${him}،` : "ليك انت،"));
    $$("[data-him-inline]").forEach((el) => (el.textContent = him || "انت"));
  }
  paintNames();

  function namesModal() {
    const { me, him } = getNames();
    openModal(`
      <p class="modal-kicker">تخصيص صغير</p>
      <h3>الأسماء</h3>
      <p>اكتب الاسمين، والكلام هنا هيبقى بيهم. البيانات على جهازك بس.</p>
      <form class="modal-form" id="namesForm">
        <label class="field">
          <span class="field-label">اسمك</span>
          <input type="text" id="myName" maxlength="24" placeholder="مثال: أحمد" value="${esc(me === "صاحبك" ? "" : me)}" />
        </label>
        <label class="field">
          <span class="field-label">اسمه</span>
          <input type="text" id="hisName" maxlength="24" placeholder="مثال: محمد" value="${esc(him)}" />
        </label>
        <p class="modal-note">لو سيبتهم فاضيين، الكلام هيبقى من غير أسماء.</p>
        <button class="btn btn-primary" type="submit">احفظ الأسماء</button>
      </form>
    `);
    $("#namesForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const meV = $("#myName").value.trim();
      const himV = $("#hisName").value.trim();
      store.set(KEY.names, { me: meV || defaultNames.me, him: himV });
      paintNames();
      closeModal();
      toast("اتحفظت الأسماء.");
    });
  }
  ["#namesBtn", "#namesBtn2", "#namesBtnTop", "#namesBtnMob"].forEach((sel) => {
    const el = $(sel);
    if (el) el.addEventListener("click", namesModal);
  });

  /* ───────── الدخول ───────── */
  const intro = $("#intro");
  function closeIntro() {
    intro.classList.add("gone");
    try { sessionStorage.setItem(KEY.intro, "1"); } catch {}
  }
  $("#introBtn").addEventListener("click", closeIntro);
  try { if (sessionStorage.getItem(KEY.intro)) intro.classList.add("gone"); } catch {}
  $("#replayIntro").addEventListener("click", () => {
    intro.classList.remove("gone");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  });

  /* ───────── ناف + تقدّم + كشاف السكشن ───────── */
  const nav = $("#nav");
  const onScroll = () => {
    nav.classList.toggle("scrolled", window.scrollY > 24);
    const h = document.documentElement.scrollHeight - window.innerHeight;
    $("#progressBar").style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const navLinks = $$(".nav-links a");
  const sections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  if ("IntersectionObserver" in window) {
    const navObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => navObs.observe(s));
  }

  /* ضوء بيتبع المؤشر */
  const light = $("#cursorLight");
  if (window.matchMedia("(hover:hover)").matches) {
    window.addEventListener("pointermove", (e) => {
      light.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
      light.classList.add("on");
    }, { passive: true });
  }

  /* نجوم الهيرو */
  (() => {
    const box = $("#stars");
    if (!box) return;
    let html = "";
    for (let i = 0; i < 22; i++) {
      html += `<span class="star" style="top:${Math.random() * 100}%;left:${Math.random() * 100}%;animation-delay:${(
        Math.random() * 5
      ).toFixed(1)}s;opacity:${(0.08 + Math.random() * 0.3).toFixed(2)}"></span>`;
    }
    box.innerHTML = html;
  })();

  /* ───────── ظهور تدريجي ───────── */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }),
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else revealEls.forEach((el) => el.classList.add("in"));

  /* ───────── جرعة النهاردة ───────── */
  const quotes = [
    "اللي انت فيه مش هويتك. هو مرحلة، وكل مرحلة بتعدّي.",
    "اليوم اللي مافيهوش إنجاز، لسه يوم عشته.",
    "مش كل حاجة ليها حل. فيه حاجات ليها وقت.",
    "مش لازم تقول كل حاجة عشان حد يفهمك.",
    "الأيام التقيلة بتحصل. مش كل يوم هيبقى زي التاني.",
    "متقارنش طريقك كله بأحسن لحظة عند حد تاني.",
    "اليوم الصعب ما بيخلصش غير لما تكمّل فيه.",
    "مفيش عيب إنك تحتاج حد.",
    "خد الأمور على قد ما هي، والباقي سيبه لبكرة.",
    "كل حاجة بتحس إنها كبيرة، بتبان أصغر لما تلاقي حد يسمعك.",
    "مش مطلوب منك تحل كل حاجة النهاردة.",
    "لو مقدرتش تعمل حاجة، يبقى ريح. ده اختيار مش فشل.",
  ];
  const dailyText = $("#dailyText");
  function setQuote(q) {
    dailyText.style.opacity = 0;
    setTimeout(() => { dailyText.textContent = q; dailyText.style.opacity = 1; }, 220);
  }
  const dayIndex = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5) % quotes.length;
  dailyText.textContent = quotes[dayIndex];
  $("#dailyNew").addEventListener("click", () => {
    let i = Math.floor(Math.random() * quotes.length);
    if (quotes[i] === dailyText.textContent) i = (i + 1) % quotes.length;
    setQuote(quotes[i]);
  });

  /* ───────── التنفس ───────── */
  const ball = $("#breatheBall");
  const phaseEl = $("#breathePhase");
  const countEl = $("#breatheCount");
  const breatheBtn = $("#breatheStart");
  let breatheTimer = null, breatheRunning = false;

  const phases = [
    { name: "شهيق", secs: 4, scale: 1 },
    { name: "خُد… وقفة", secs: 4, scale: 1 },
    { name: "زفير", secs: 6, scale: 0.62 },
  ];

  function stopBreathe(msg = "جاهز؟") {
    clearTimeout(breatheTimer);
    breatheRunning = false;
    ball.style.transition = "transform 1s ease";
    ball.style.transform = "scale(.62)";
    phaseEl.textContent = msg;
    countEl.textContent = "جاهز";
    breatheBtn.textContent = "ابدأ التمرين";
  }

  function runPhase(round) {
    if (round >= 4) {
      stopBreathe("خلّصت ٤ دورات");
      toast("خلصت ٤ دورات.");
      return;
    }
    const p = phases[round % 3];
    ball.style.transition = `transform ${p.secs}s cubic-bezier(.4,0,.2,1), box-shadow 1s ease`;
    ball.style.transform = `scale(${p.scale})`;
    phaseEl.textContent = p.name;
    let left = p.secs;
    countEl.textContent = left;
    clearInterval(window.__breatheInt);
    window.__breatheInt = setInterval(() => {
      left -= 1;
      if (left <= 0) { clearInterval(window.__breatheInt); return; }
      countEl.textContent = left;
    }, 1000);
    breatheTimer = setTimeout(() => runPhase(round + 1), p.secs * 1000);
  }

  breatheBtn.addEventListener("click", () => {
    if (breatheRunning) { stopBreathe(); clearInterval(window.__breatheInt); return; }
    breatheRunning = true;
    breatheBtn.textContent = "وقّف";
    runPhase(0);
  });

  /* ───────── تمرين ٥·٤·٣·٢·١ ───────── */
  const groundSteps = [
    { n: "٥", t: "حاجات بتشوفها", d: "بصّ حوالينك وشوف ٥ حاجات موجودة دلوقتي. قول أسماءهم في سرك." },
    { n: "٤", t: "حاجات بتسمعها", d: "اسمع ٤ أصوات. مروحة، عربية، نفسك، أي حاجة. حتى السكوت ليه صوت." },
    { n: "٣", t: "حاجات بتلمسها", d: "لمس ٣ حاجات: هدومك، الكرسي، الحيطة. حسّ بالخام بتاعهم." },
    { n: "٢", t: "حاجات بتشمّها", d: "شمّ حاجتين. هواء، عطر، قهوة. لو مش شامم حاجة، افتكر ريحة بتحبها." },
    { n: "١", t: "حاجة بتتذوقها", d: "خد رشفة ميّة أو أي حاجة. ركّز في الطعم. ده آخر خطوة — انت رجعت للحاضر." },
  ];
  let gi = 0;
  const gNum = $("#groundNum"), gTitle = $("#groundTitle"), gText = $("#groundText"), gBars = $("#groundBars"), gNext = $("#groundNext");
  gBars.innerHTML = groundSteps.map(() => "<span></span>").join("");
  function paintGround() {
    const s = groundSteps[gi];
    gNum.textContent = s.n;
    gTitle.textContent = s.t;
    gText.textContent = s.d;
    $$("span", gBars).forEach((b, i) => b.classList.toggle("done", i <= gi));
    gNext.textContent = gi === groundSteps.length - 1 ? "خلصت. ارجع هنا" : "اللي بعده";
  }
  paintGround();
  gNext.addEventListener("click", () => {
    if (gi < groundSteps.length - 1) { gi++; paintGround(); }
    else { gi = 0; paintGround(); toast("خلصت التمرين."); }
  });

  /* التابات */
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((t) => { t.classList.remove("is-active"); t.setAttribute("aria-selected", "false"); });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      $$(".tab-panel").forEach((p) => p.classList.toggle("is-active", p.dataset.panel === tab.dataset.tab));
    });
  });

  /* ───────── الرسايل ───────── */
  const letters = {
    wake: {
      kicker: "لما تصحى ومش قادر تقوم",
      title: "الصبح مش امتحان",
      body: [
        "أول حاجة: انت صحيت. مش عشان انت قوي، ولا عشان الدنيا اتظبطت — بس انت صحيت. وده لوحده حاجة، خصوصًا لو اليوم اللي قبله كان تقيل.",
        "مش مطلوب منك النهاردة تبقى نسخة أحسن من نفسك. مطلوب منك بس تسمح لنفسك تبدأ من غير ما تحاسب نفسك على كل دقيقة.",
        "ابدأ بأصغر حاجة: اشرب ميّة. افتح الشباك. اقعد على السرير خمس دقايق وخلاص. مش لازم كل حاجة تحصل دلوقتي.",
        "واللي حاسس بيه مش «كسل»، ومش «تقصير». ده جسم بيدافع عن نفسه لما يبقى مرهق زيادة. علاجه مش ضغط أكتر — علاجه راحة وحِتّة أمان. والحِتّة دي حِتّة أمان.",
      ],
      sig: "اليوم مش مسابقة. اعمله على قد طاقتك.",
    },
    alone: {
      kicker: "لما تحس إنك لوحدك",
      title: "الوحدة مش حكم عليك",
      body: [
        "الوحدة بتيجي وسط ناس كتير. مش شرط تكون لوحدك في المكان عشان تحس إنك لوحدك.",
        "مش هقولك «روح اتكلم معاهم» كأنها سهلة. بس انت مش أول واحد يحس كده. في ناس كتير حاسة زيك في نفس اللحظة.",
        "ولو مفيش حد في دماغك — اكتبلي. ومتخافش تكون تقيل.",
      ],
      sig: "انت مش عبء. وطلبك مش تقل.",
    },
    enough: {
      kicker: "لما تفتكر إنك مش كفاية",
      title: "الكفاية مش شهادة",
      body: [
        "فكرة «أنا مش كفاية» بتيجي بصوت واثق كأنها حقيقة. هي صوت جواك بيعدّ الناقص وبينسى الباقي.",
        "الكفاية مش جايزة بتاخدها بعد إنجاز. انت بتكمّل وانت تعبان، وده مش سهل.",
        "مش مطلوب منك تكون كامل عشان حد يهتم بيك. الاهتمام مش مربوط بالإنجاز.",
        "ولو حد قالك غير كده، فده كلامه هو عنه، مش عنك.",
      ],
      sig: "قيمتك مش مربوطة بإنتاجك.",
    },
    tight: {
      kicker: "لما الدنيا تضيّق",
      title: "الضيق مش آخر الطريق",
      body: [
        "لما الضيق يجي، الدماغ بتحس إن الحالة دي هي كل حاجة. ده اسمه «تفكير النفق» — بتبصّ ساعة بس قدامك.",
        "الأزمة دي فترة، مش عمر. ولها آخر، حتى لو مش باين من هنا.",
        "مش مطلوب تتحمل كل حاجة مرة واحدة. الخطوة اللي جاية بس.",
        "ولو مش قادر تستحملها لوحدك، طلب المساعدة اختيار عملي.",
      ],
      sig: "الوقت اللي انت فيه مش آخر المشهد.",
    },
    hurt: {
      kicker: "لما حد يزعّلك",
      title: "زعلك حق",
      body: [
        "لو حد جرحك، جرحك حقيقي. مش لازم تبرر، ولا تقلّل منه، ولا تقول «أنا أبالغ». زعلك مشروع.",
        "ومش مطلوب منك تسامح دلوقتي، ولا تفهمه، ولا ترد. انت ليك حق تقف وتاخد وقتك.",
        "ولو كلامه دخل جواك: فرّق بين اللي هو قاله، وبين اللي انت قلت لنفسك عنه. هو قال حاجة، وانت قلت لنفسك «أنا مش كفاية».",
        "لما تهدى، اسأل نفسك: «هل ده حقيقي عني، ولا حقيقي عن حالته هو وقت ما قاله؟»",
      ],
      sig: "زعلك حق. خده، وبعدها كمّل.",
    },
    heavy: {
      kicker: "لما تحس إنك تقيل على الناس",
      title: "انت مش تقل",
      body: [
        "إنك تحس إنك تقيل مش دليل إنك تقيل. غالبًا لأنك متعوّد تدّي ومش متعوّد تاخد.",
        "الناس اللي بتحبك بتحبك وانت تقيل وخفيف. الحب مش صفقة.",
        "اطلب لو محتاج. وإذا حد زهق، ده شغله هو، مش شغلك إنك تبقى أقل.",
      ],
      sig: "انت مش تقل. اطلب لما تحتاج، من غير اعتذار.",
    },
    good: {
      kicker: "لما تعمل حاجة كويسة",
      title: "خلّي الفرحة تعيش",
      body: [
        "عملت حاجة كويسة؟ متصغّرهاش، ومتقولش «حاجة عادية».",
        "انت عملتها، وانت الوحيد اللي عارف كام كنت تعبان عشان توصلها.",
        "سجّلها هنا. في يوم تقيل هتفيدك.",
      ],
      sig: "سجّلها. في يوم تقيل هتفيدك.",
    },
    nothing: {
      kicker: "لو اليوم عدّى ومحصلش حاجة",
      title: "المرور بيوم كامل مش خسارة",
      body: [
        "اليوم عدّى ومحصلش حاجة؟ مفيش مقياس بيقول إن اليوم لازم يبقى فيه حدث عشان يبقى محسوب.",
        "ولو جسمك ارتاح، أو نفسك هدت، أو حتى قعدت ومتأذيتش — يبقى اليوم ادّى حاجة.",
        "طاقتك مش دراجة تدوس عليها كل يوم.",
      ],
      sig: "بكرة قائمة جديدة. متجبرش نفسك تكمل النهاردة.",
    },
  };

  function openLetter(key) {
    const L = letters[key];
    if (!L) return;
    openModal(`
      <p class="modal-kicker">${esc(L.kicker)}</p>
      <h3>${esc(L.title)}</h3>
      ${L.body.map((p) => `<p>${esc(p)}</p>`).join("")}
      <p class="sig">${esc(L.sig)}<br><br>— <span data-me>${esc(getNames().me)}</span></p>
    `);
  }
  $$(".letter").forEach((btn) => btn.addEventListener("click", () => openLetter(btn.dataset.letter)));
  $("#randomLetter").addEventListener("click", () => {
    const keys = Object.keys(letters);
    openLetter(keys[Math.floor(Math.random() * keys.length)]);
  });

  /* ───────── الرسالة الطويلة ───────── */
  const envelope = $("#envelope");
  if (envelope) {
    const openEnvelope = () => {
      if (envelope.classList.contains("open")) return;
      envelope.classList.add("open");
      envelope.setAttribute("aria-expanded", "true");
      setTimeout(() => envelope.scrollIntoView({ behavior: "smooth", block: "start" }), 260);
      setTimeout(() => confetti(18), 800);
    };
    envelope.addEventListener("click", openEnvelope);
    envelope.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEnvelope(); }
    });
  }
  // التوقيع في الرسالة الطويلة
  const longSig = $("#longSig");
  if (longSig) longSig.innerHTML = `— <span data-me>${esc(getNames().me)}</span>`;

  /* ───────── صغيّرات ───────── */
  const tasksBox = $("#smallGrid");
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };
  const taskDate = todayKey();
  let taskState = store.get(KEY.tasks, { date: taskDate, done: [] });
  if (taskState.date !== taskDate) taskState = { date: taskDate, done: [] };
  const taskInputs = $$("input[data-task]", tasksBox);
  taskInputs.forEach((inp) => {
    inp.checked = taskState.done.includes(inp.dataset.task);
    inp.addEventListener("change", () => {
      taskState.done = taskInputs.filter((i) => i.checked).map((i) => i.dataset.task);
      store.set(KEY.tasks, taskState);
      paintTasks();
      if (taskState.done.length === taskInputs.length) {
        confetti(34);
        toast("خلصت القائمة النهاردة.");
      }
    });
  });
  function paintTasks() {
    const done = taskInputs.filter((i) => i.checked).length;
    const total = taskInputs.length;
    $("#taskBar").style.width = (done / total) * 100 + "%";
    const ar = (n) => n.toLocaleString("ar-EG");
    const msgs = ["النهاردة لسه في أولها.", "أول خطوة عدّت.", "ماشي بالراحة.", "نص الطريق.", "أكتر من النص.", "قربت.", "آخر واحدة تقريبًا.", "كمّل واحدة وخلاص.", "خلصت الثمانية."];
    $("#taskCount").textContent = `${ar(done)} من ${ar(total)} — ${msgs[Math.min(done, 8)]}`;
  }
  paintTasks();

  /* ───────── دليل ───────── */
  $$(".acc-item").forEach((item) => {
    const head = $(".acc-head", item);
    head.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      $$(".acc-item").forEach((i) => {
        i.classList.remove("open");
        $(".acc-head", i).setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("open");
        head.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ───────── الأغاني ───────── */
  const songsGrid = $("#songsGrid");
  let playerBox = null;
  $$(".song", songsGrid).forEach((song) => {
    const playBtn = $("[data-play]", song);
    playBtn.addEventListener("click", () => {
      const id = song.dataset.video;
      if (!playerBox) {
        playerBox = document.createElement("div");
        playerBox.className = "song-player on";
        songsGrid.prepend(playerBox);
      }
      const title = ($(".song-title", song) || {}).textContent || "جورج وسوف";
      playerBox.innerHTML = `
        <div class="player-bar">
          <span class="player-title">${esc(title)} — جورج وسوف</span>
          <a class="player-out" href="https://www.youtube.com/watch?v=${encodeURIComponent(id)}" target="_blank" rel="noopener">افتح على يوتيوب ↗</a>
        </div>
        <div class="player-frame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(
          id
        )}?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="جورج وسوف" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
      playerBox.classList.add("on");
      playerBox.scrollIntoView({ behavior: "smooth", block: "center" });
      toast("لو الأغنية مش راضية تشتغل، دوس «يوتيوب» في الكارت.");
    });
  });

  /* ═══════════════════════════════════════════
     الحِتّة — التشفير
     ═══════════════════════════════════════════ */
  const vault = $("#vaultApp");
  let sessionKey = null;
  let entries = [];
  let draftMood = "";
  const CHECK_TEXT = "hetet-ok";

  const b64 = (buf) => {
    const bytes = new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const unb64 = (str) => {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };

  const hasCrypto = !!(window.crypto && window.crypto.subtle);

  async function deriveKey(pass, saltBytes) {
    const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: saltBytes, iterations: 160000, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }
  async function encryptJSON(key, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
    return { iv: b64(iv), ct: b64(ct) };
  }
  async function decryptJSON(key, box) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, key, unb64(box.ct));
    return JSON.parse(dec.decode(pt));
  }

  const getVault = () => store.get(KEY.vault, null);
  const setVault = (v) => store.set(KEY.vault, v);

  async function persistEntries() {
    const rec = getVault();
    if (!rec || !sessionKey) return;
    rec.entries = await encryptJSON(sessionKey, entries);
    setVault(rec);
  }
  async function persistDraft() {
    const rec = getVault();
    if (!rec || !sessionKey) return;
    const body = $("#entryBody").value;
    const title = $("#entryTitle").value;
    if (!body.trim() && !title.trim()) { rec.draft = null; setVault(rec); return; }
    rec.draft = await encryptJSON(sessionKey, { title, body, mood: draftMood });
    setVault(rec);
  }

  function setState(state) {
    vault.dataset.state = state;
    const hintEl = $("#hintLine");
    if (hintEl) {
      const rec = getVault();
      if (state === "locked" && rec && rec.hint) {
        hintEl.hidden = false;
        hintEl.innerHTML = `تلميحك: <b>${esc(rec.hint)}</b>`;
      } else {
        hintEl.hidden = true;
      }
    }
    if (state !== "open") {
      $("#entryBody").value = "";
      $("#entryBody").style.height = "";
      $("#entryTitle").value = "";
      $("#unlockPass").value = "";
      draftMood = "";
      $$(".mood").forEach((m) => { m.classList.remove("on"); m.setAttribute("aria-pressed", "false"); });
    }
  }

  /* إظهار/إخفاء الباسورد */
  $$("[data-eye]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const inp = document.getElementById(btn.dataset.eye);
      inp.type = inp.type === "password" ? "text" : "password";
    });
  });

  /* ───────── إعداد ───────── */
  $("#setupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#setupMsg");
    msg.classList.remove("ok");
    const p1 = $("#setupPass").value;
    const p2 = $("#setupPass2").value;
    const hint = $("#setupHint").value.trim();
    if (!hasCrypto) { msg.textContent = "المتصفح ده مش بيدعم التشفير. جرّب متصفح أحدث (Chrome / Safari / Firefox)."; return; }
    if (p1.length < 4) { msg.textContent = "الباسورد لازم ٤ حروف على الأقل."; return; }
    if (p1 !== p2) { msg.textContent = "الباسورد مش متطابق. جرّب تاني."; return; }

    msg.textContent = "بجهّز الحِتّة…";
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveKey(p1, salt);
      const rec = {
        v: 1,
        salt: b64(salt),
        hint: hint || "",
        check: await encryptJSON(key, CHECK_TEXT),
        entries: await encryptJSON(key, []),
        draft: null,
        createdAt: Date.now(),
      };
      setVault(rec);
      sessionKey = key;
      entries = [];
      setState("open");
      $("#setupForm").reset();
      msg.textContent = "";
      renderEntries();
      renderStats();
      startAutoLock();
      confetti(20);
      toast("الحِتّة اتقفلت بالباسورد.");
    } catch {
      msg.textContent = "حصلت مشكلة. جرّب تاني.";
    }
  });

  /* ───────── فتح ───────── */
  $("#unlockForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#unlockMsg");
    const pass = $("#unlockPass").value;
    const rec = getVault();
    msg.classList.remove("ok");
    if (!rec) { setState("setup"); return; }
    if (!hasCrypto) { msg.textContent = "المتصفح مش بيدعم التشفير."; return; }
    msg.textContent = "بفتح…";
    try {
      const key = await deriveKey(pass, unb64(rec.salt));
      const check = await decryptJSON(key, rec.check);
      if (check !== CHECK_TEXT) throw new Error("bad");
      sessionKey = key;
      entries = await decryptJSON(key, rec.entries).catch(() => []);
      if (!Array.isArray(entries)) entries = [];
      setState("open");
      msg.textContent = "";
      renderEntries();
      renderStats();
      await restoreDraft();
      autoGrow();
      startAutoLock();
    } catch {
      msg.textContent = "الباسورد مش صح. جرّب تاني، خد وقتك.";
      $("#lockIcon").classList.remove("shake");
      void $("#lockIcon").offsetWidth;
      $("#lockIcon").classList.add("shake");
      $("#unlockPass").select();
    }
  });

  async function restoreDraft() {
    const rec = getVault();
    if (!rec || !rec.draft || !sessionKey) return;
    try {
      const d = await decryptJSON(sessionKey, rec.draft);
      $("#entryTitle").value = d.title || "";
      $("#entryBody").value = d.body || "";
      draftMood = d.mood || "";
      $$(".mood").forEach((m) => m.classList.toggle("on", m.dataset.mood === draftMood));
      $("#composerMeta").textContent = "رجّعتلك المسودة.";
      lockMeta();
    } catch {}
  }

  /* ───────── قفل ───────── */
  let lockTimer = null;
  let lastLockReset = 0;
  function startAutoLock() {
    clearTimeout(lockTimer);
    lockTimer = setTimeout(() => {
      if (vault.dataset.state === "open") { lockVault(true); }
    }, 10 * 60 * 1000);
  }
  function nudgeAutoLock() {
    const now = Date.now();
    if (now - lastLockReset < 5000) return;
    lastLockReset = now;
    startAutoLock();
  }
  function lockVault(auto = false) {
    if (vault.dataset.state !== "open") return;
    persistDraft().catch(() => {});
    sessionKey = null;
    entries = [];
    setState("locked");
    // مهم: نشيل النص المفكوك من الصفحة نفسها، مش نخفيه بس
    const list = $("#entries");
    if (list) list.innerHTML = "";
    const search = $("#searchEntries");
    if (search) search.value = "";
    const stats = $("#stats");
    if (stats) stats.innerHTML = "";
    const title = $("#entryTitle");
    const body = $("#entryBody");
    if (title) title.value = "";
    if (body) { body.value = ""; body.style.height = ""; }
    draftMood = "";
    $$(".mood").forEach((m) => { m.classList.remove("on"); m.setAttribute("aria-pressed", "false"); });
    const metaEl = $("#composerMeta");
    if (metaEl) { delete metaEl.dataset.locked; metaEl.textContent = "مفيش حاجة مستعجلة."; }
    $("#unlockMsg").textContent = "";
    $("#unlockPass").value = "";
    clearTimeout(lockTimer);
    if (auto) toast("قفلت الحِتّة لوحدها بعد فترة. باسوردك هيفتحها.");
    const card = $("#vault");
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  $("#lockBtn").addEventListener("click", () => { lockVault(); toast("اتقفلت."); });
  ["click", "keydown", "pointermove"].forEach((ev) =>
    document.addEventListener(ev, () => { if (vault.dataset.state === "open") nudgeAutoLock(); }, { passive: true })
  );

  /* ───────── نسيت الباسورد ───────── */
  $("#forgotBtn").addEventListener("click", () => {
    openModal(`
      <p class="modal-kicker">حاجة لازم تعرفها</p>
      <h3>مفيش طريقة ترجّع الباسورد</h3>
      <p>مفيش نسخة من كلامك عندي ولا على أي سيرفر. المفتاح بيتولّد من باسوردك، فلو ضاع مفيش طريقة ترجّعه.</p>
      <p>لو فاكر تقريبًا، جرّب. ولو مش فاكر خالص، تقدر تمسح الحِتّة وتبدأ واحدة جديدة.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="forgotWipe" style="border-color:rgba(226,115,111,.4);color:#f0b4b0">امسح الحِتّة وابدأ من جديد</button>
        <button class="btn btn-primary" data-close>لسه هحاول أفتكر</button>
      </div>
      <p class="modal-note">نصيحة: خزّن الباسورد في تطبيق باسوردات أو مكان آمن.</p>
    `);
    $("#forgotWipe").addEventListener("click", () => {
      closeModal();
      confirmModal({
        title: "متأكد إنك عايز تمسح الحِتّة؟",
        text: "كل اللي مكتوب جواها هيتمسح نهائيًا. مفيش رجوع.",
        confirmLabel: "امسح نهائيًا",
        danger: true,
        onConfirm: () => {
          store.del(KEY.vault);
          setState("setup");
          sessionKey = null;
          entries = [];
          toast("اتمسحت. ابدأ من جديد.");
        },
      });
    });
  });

  /* ───────── الكتابة والحفظ ───────── */
  $$(".mood").forEach((m) =>
    m.addEventListener("click", () => {
      draftMood = draftMood === m.dataset.mood ? "" : m.dataset.mood;
      $$(".mood").forEach((x) => {
        const on = x.dataset.mood === draftMood;
        x.classList.toggle("on", on);
        x.setAttribute("aria-pressed", String(on));
      });
      queueDraft();
    })
  );

  let draftTimer = null;
  function queueDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => persistDraft().catch(() => {}), 900);
  }
  const autoGrow = () => {
    const ta = $("#entryBody");
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 340) + "px";
  };
  $("#entryBody").addEventListener("input", () => { autoGrow(); queueDraft(); });
  $("#entryTitle").addEventListener("input", queueDraft);

  $("#clearDraft").addEventListener("click", () => {
    $("#entryBody").value = "";
    $("#entryBody").style.height = "";
    $("#entryTitle").value = "";
    draftMood = "";
    $$(".mood").forEach((m) => { m.classList.remove("on"); m.setAttribute("aria-pressed", "false"); });
    persistDraft().catch(() => {});
    $("#composerMeta").textContent = "فضّينا.";
    lockMeta();
  });

  function ar(n) { return Number(n).toLocaleString("ar-EG"); }
  function fmtDate(ts) {
    const d = new Date(ts);
    const today = new Date();
    const y = new Date(Date.now() - 864e5);
    const same = (a, b) => a.toDateString() === b.toDateString();
    const time = d.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
    if (same(d, today)) return `النهاردة · ${time}`;
    if (same(d, y)) return `امبارح · ${time}`;
    return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long" }) + ` · ${time}`;
  }

  function renderEntries(filter = "") {
    const box = $("#entries");
    const q = filter.trim().toLowerCase();
    const list = entries
      .slice()
      .sort((a, b) => b.ts - a.ts)
      .filter((en) => !q || (en.title || "").toLowerCase().includes(q) || (en.body || "").toLowerCase().includes(q) || (en.mood || "").includes(q));

    if (!list.length) {
      box.innerHTML = q
        ? `<div class="empty"><b>مفيش حاجة بالكلمة دي</b>جرّب كلمة تانية، أو امسح البحث.</div>`
        : `<div class="empty"><b>الحِتّة فاضية، وده حلو</b>أول حاجة تكتبها مش لازم تبقى كلام كبير.<br>حرف واحد كفاية تبدأ.</div>`;
      return;
    }
    box.innerHTML = list
      .map(
        (en) => `
      <article class="entry" data-id="${en.id}">
        <div class="entry-head">
          <span class="entry-date">${esc(fmtDate(en.ts))}</span>
          ${en.mood ? `<span class="entry-mood">${esc(en.mood)}</span>` : ""}
        </div>
        ${en.title ? `<h4 class="entry-title">${esc(en.title)}</h4>` : ""}
        <div class="entry-text">${esc(en.body)}</div>
        <div class="entry-acts">
          <button data-copy title="انسخ" aria-label="انسخ">
            <svg viewBox="0 0 24 24" class="ico"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
          </button>
          <button data-del class="del" title="امسح" aria-label="امسح">
            <svg viewBox="0 0 24 24" class="ico"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"/></svg>
          </button>
        </div>
      </article>`
      )
      .join("");

    $$("[data-copy]", box).forEach((b) =>
      b.addEventListener("click", async () => {
        const en = entries.find((x) => x.id === b.closest(".entry").dataset.id);
        if (!en) return;
        try {
          await navigator.clipboard.writeText(`${en.title ? en.title + "\n\n" : ""}${en.body}`);
          toast("اتنسخ.");
        } catch { toast("مش قادر أنسخ من المتصفح ده."); }
      })
    );
    $$("[data-del]", box).forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.closest(".entry").dataset.id;
        confirmModal({
          title: "تمسح الكتابة دي؟",
          text: "هتتمسح نهائيًا من الحِتّة. مفيش رجوع.",
          confirmLabel: "امسح",
          danger: true,
          onConfirm: async () => {
            entries = entries.filter((x) => x.id !== id);
            await persistEntries();
            renderEntries($("#searchEntries").value);
            renderStats();
            toast("اتمسحت.");
          },
        });
      })
    );
  }

  function renderStats() {
    const box = $("#stats");
    if (!box) return;
    if (!entries.length) {
      box.innerHTML = `<span>لسه مفيش كتابة — وده عادي خالص.</span>`;
      return;
    }
    const last = Math.max(...entries.map((e) => e.ts));
    const days = new Set(entries.map((e) => new Date(e.ts).toDateString())).size;
    box.innerHTML = [
      `<span><b>${ar(entries.length)}</b> كتابة</span>`,
      `<span>آخر مرة: <b>${esc(fmtDate(last))}</b></span>`,
      `<span><b>${ar(days)}</b> ${days === 1 ? "يوم" : "أيام"} كتبت فيهم</span>`,
    ].join('<i class="stat-sep" aria-hidden="true"></i>');
  }

  $("#saveEntry").addEventListener("click", async () => {
    const body = $("#entryBody").value.trim();
    const title = $("#entryTitle").value.trim();
    if (!body && !title) {
      $("#composerMeta").textContent = "اكتب حاجة الأول — حتى كلمة واحدة.";
      $("#entryBody").focus();
      return;
    }
    const en = {
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
      ts: Date.now(),
      title,
      body: body || title,
      mood: draftMood,
    };
    entries.push(en);
    try {
      await persistEntries();
      const rec = getVault();
      if (rec) { rec.draft = null; setVault(rec); }
      $("#entryBody").value = "";
      $("#entryBody").style.height = "";
      $("#entryTitle").value = "";
      draftMood = "";
      $$(".mood").forEach((m) => { m.classList.remove("on"); m.setAttribute("aria-pressed", "false"); });
      $("#composerMeta").textContent = "اتحفظت.";
      lockMeta();
      renderEntries($("#searchEntries").value);
      renderStats();
      const firstEntry = $("#entries .entry");
      if (firstEntry) firstEntry.classList.add("fresh");
      if ([1, 5, 10, 25, 50].includes(entries.length)) confetti(22);
      toast("اتحفظت. محدش شافها غيرك.");
    } catch {
      toast("حصلت مشكلة في الحفظ. جرّب تاني.");
    }
  });

  $("#searchEntries").addEventListener("input", (e) => renderEntries(e.target.value));

  /* تصدير */
  $("#exportBtn").addEventListener("click", () => {
    if (!entries.length) { toast("مفيش حاجة تتصدّر لسه."); return; }
    const sorted = entries.slice().sort((a, b) => a.ts - b.ts);
    const lines = ["# حِتّة ليك — اللي كتبته", ""];
    sorted.forEach((e) => {
      lines.push(`**${new Date(e.ts).toLocaleString("ar-EG")}**`);
      if (e.mood) lines.push(`- المزاج: ${e.mood}`);
      if (e.title) lines.push(`### ${e.title}`);
      lines.push("", e.body, "", "---", "");
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hetet-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast("اتصدّرت. احتفظ بالملف في مكان آمن.");
  });

  /* تغيير الباسورد */
  $("#changePassBtn").addEventListener("click", () => {
    openModal(`
      <p class="modal-kicker">أمان</p>
      <h3>تغيير الباسورد</h3>
      <p>الكلام هيتشفّر من جديد بالباسورد الجديد. مفيش حاجة هتضيع.</p>
      <form class="modal-form" id="cpForm">
        <label class="field"><span class="field-label">الباسورد الحالي</span><input type="password" id="cpOld" required /></label>
        <label class="field"><span class="field-label">الباسورد الجديد</span><input type="password" id="cpNew" minlength="4" required /></label>
        <label class="field"><span class="field-label">تأكيد الجديد</span><input type="password" id="cpNew2" required /></label>
        <p class="form-msg" id="cpMsg"></p>
        <button class="btn btn-primary" type="submit">غيّره</button>
      </form>
    `);
    $("#cpForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = $("#cpMsg");
      const oldP = $("#cpOld").value, n1 = $("#cpNew").value, n2 = $("#cpNew2").value;
      if (n1.length < 4) { msg.textContent = "الباسورد الجديد لازم ٤ حروف على الأقل."; return; }
      if (n1 !== n2) { msg.textContent = "الباسوردين مش متطابقين."; return; }
      const rec = getVault();
      try {
        const oldKey = await deriveKey(oldP, unb64(rec.salt));
        const check = await decryptJSON(oldKey, rec.check);
        if (check !== CHECK_TEXT) throw new Error("bad");
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const newKey = await deriveKey(n1, salt);
        rec.salt = b64(salt);
        rec.check = await encryptJSON(newKey, CHECK_TEXT);
        rec.entries = await encryptJSON(newKey, entries);
        rec.draft = null;
        setVault(rec);
        sessionKey = newKey;
        closeModal();
        toast("الباسورد اتغير. افتكره كويس — مفيش استرجاع.");
      } catch {
        msg.textContent = "الباسورد الحالي مش صح.";
      }
    });
  });

  /* مسح الحِتّة */
  $("#wipeBtn").addEventListener("click", () => {
    confirmModal({
      title: "تمسح كل اللي كتبته؟",
      text: "كل الكتابات هتتمسح نهائيًا من الجهاز ده. مفيش رجوع، ومفيش نسخة تانية عند حد.",
      confirmLabel: "امسح كل حاجة",
      danger: true,
      onConfirm: () => {
        store.del(KEY.vault);
        sessionKey = null;
        entries = [];
        $("#searchEntries").value = "";
        setState("setup");
        toast("اتمسح. تقدر تبدأ حِتّة جديدة وقت ما تحب.");
      },
    });
  });

  /* مسح كل بيانات الموقع */
  $("#resetAll").addEventListener("click", () => {
    confirmModal({
      title: "تمسح كل بيانات الموقع من الجهاز ده؟",
      text: "الحِتّة، الأسماء، والقائمة اليومية — كله هيتمسح. مفيش رجوع.",
      confirmLabel: "امسح كل حاجة",
      danger: true,
      onConfirm: () => {
        Object.values(KEY).forEach((k) => store.del(k));
        toast("اتمسح كله. الموقع هيرجع من الأول.");
        setTimeout(() => location.reload(), 900);
      },
    });
  });

  /* ───────── زر الطوارئ ───────── */
  $("#panicBtn").addEventListener("click", () => {
    openModal(`
      <p class="modal-kicker">لو الحالة تقيلة دلوقتي</p>
      <h3>خدها خطوة خطوة</h3>
      <p>مش مطلوب منك تبقى كويس دلوقتي. محتاج بس تتعدّى الدقايق اللي جاية:</p>
      <div class="calm-list">
        <div class="calm-item"><span class="num">١</span><span>اقعد، وحط إيدك على صدرك. خد نفس بطيء: شهيق ٤، وقفة ٤، زفير ٦. كرّر ٤ مرات.</span></div>
        <div class="calm-item"><span class="num">٢</span><span>بصّ حوالينك وسمّي ٣ حاجات بتشوفها، بصوت واطي أو في سرك.</span></div>
        <div class="calm-item"><span class="num">٣</span><span>اغسل وشك بميّة ساقعة، أو حط ميّة ساقعة على رسغك دقيقة.</span></div>
        <div class="calm-item"><span class="num">٤</span><span>لو حسّيت إنك في خطر، اتصل دلوقتي: <a class="calm-num" href="tel:08008880700">0800 888 0700</a> — مجاني، أو <a class="calm-num" href="tel:123">123</a> للإسعاف.</span></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="panicBreathe">ابدأ تنفس دقيقة</button>
        <button class="btn btn-ghost" id="panicLetter">افتح رسالة</button>
      </div>
      <p class="modal-note">ولو حسّيت إنك لوحدك، ابعتلي.</p>
    `);
    $("#panicBreathe").addEventListener("click", () => {
      closeModal();
      document.querySelector("#breathe").scrollIntoView({ behavior: "smooth", block: "center" });
      if (!breatheRunning) setTimeout(() => breatheBtn.click(), 700);
    });
    $("#panicLetter").addEventListener("click", () => {
      const keys = Object.keys(letters);
      openLetter(keys[Math.floor(Math.random() * keys.length)]);
    });
  });

  /* قفل احتياطي: لو ساب الموبايل والتاب في الخلفية دقيقة ونص، الحِتّة تقفل لوحدها */
  let hiddenTimer = null;
  document.addEventListener("visibilitychange", () => {
    if (vault.dataset.state !== "open") return;
    if (document.visibilityState === "hidden") {
      persistDraft().catch(() => {});
      clearTimeout(hiddenTimer);
      hiddenTimer = setTimeout(() => {
        if (document.visibilityState === "hidden" && vault.dataset.state === "open") lockVault(true);
      }, 90000);
    } else {
      clearTimeout(hiddenTimer);
    }
  });
  window.addEventListener("pagehide", () => {
    if (vault.dataset.state === "open") {
      const list = $("#entries");
      if (list) list.innerHTML = "";
    }
  });

  /* ───────── تشغيل مبدئي للحِتّة ───────── */
  function boot() {
    const rec = getVault();
    if (!rec) { setState("setup"); }
    else {
      setState("locked");
    }
    renderStats();
  }
  boot();

  /* عدد الحروف في المسودة */
  const meta = $("#composerMeta");
  const baseMeta = "مفيش حاجة مستعجلة.";
  $("#entryBody").addEventListener("input", () => {
    const n = $("#entryBody").value.trim().length;
    if (n > 0 && !meta.dataset.locked) meta.textContent = `${ar(n)} حرف. مفيش حد بيقرا غيرك.`;
    else if (!meta.dataset.locked) meta.textContent = baseMeta;
  });
  // أي رسالة مهمة (زي «رجّعتلك مسودتك») مش بتتغطى على طول
  const lockMeta = () => { meta.dataset.locked = "1"; setTimeout(() => { delete meta.dataset.locked; }, 8000); };
})();

// إجبار المتصفح على البدء من أعلى الصفحة لمنع اختفاء قسم About
window.history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const root = document.documentElement;
const body = document.body;
const screenEl = document.querySelector(".screen");
const glitchLayer = document.querySelector(".glitch-layer");
const toggle = document.getElementById("crtToggle");
const plate = document.querySelector(".tv-plate");
const osdEl = document.getElementById("tvOsd");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- TV state ----------
const CHANNELS = [
  { name: "green", rgb: "109, 255, 138" },
  { name: "amber", rgb: "255, 176, 0" },
  { name: "cyan", rgb: "90, 220, 255" },
  { name: "white", rgb: "230, 230, 230" },
  { name: "red", rgb: "255, 90, 90" },
];
let channel = 0;
let dim = 0;
const DIM_STEP = 0.12;
const DIM_MAX = 0.6;
let osdTimeout;

// Load settings
try {
  const saved = JSON.parse(localStorage.getItem("tv-settings") || "{}");
  if (Number.isInteger(saved.channel) && CHANNELS[saved.channel]) channel = saved.channel;
  if (typeof saved.dim === "number") dim = Math.min(DIM_MAX, Math.max(0, saved.dim));
} catch (e) {}

function save() {
  try {
    localStorage.setItem("tv-settings", JSON.stringify({ channel, dim }));
  } catch (e) {}
}

function applyChannel() {
  const current = CHANNELS[channel];
  root.style.setProperty("--rgb", current.rgb);
  
  if (osdEl) {
    osdEl.textContent = `CH-0${channel + 1} ${current.name.toUpperCase()}`;
    osdEl.classList.add("show");
    
    clearTimeout(osdTimeout);
    osdTimeout = setTimeout(() => {
      osdEl.classList.remove("show");
    }, 2000);
  }
}

function applyDim() {
  root.style.setProperty("--dim", dim.toFixed(2));
}

applyChannel();
applyDim();

// ---------- Skills Expanding Cards ----------
const skillCards = document.querySelectorAll(".skills_carts .card");
skillCards.forEach((card) => {
  card.addEventListener("click", () => {
    skillCards.forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
  });
});

// ---------- Hamburger Menu Toggle ----------
const hamburgerBtn = document.getElementById("hamburgerBtn");
const navMenu = document.getElementById("navMenu");

if (hamburgerBtn && navMenu) {
  hamburgerBtn.addEventListener("click", () => {
    hamburgerBtn.classList.toggle("open");
    navMenu.classList.toggle("active");
  });

  document.querySelectorAll("#navMenu a").forEach((link) => {
    link.addEventListener("click", () => {
      hamburgerBtn.classList.remove("open");
      navMenu.classList.remove("active");
    });
  });
}

// ---------- Glitches ----------
function isActive() {
  return (
    body.classList.contains("crt-on") &&
    !body.classList.contains("booting") &&
    !body.classList.contains("tv-off") &&
    !body.classList.contains("no-glitch") &&
    !reduceMotion
  );
}

function spawnGlitchBar() {
  if (!isActive()) return;
  const bar = document.createElement("div");
  bar.className = "glitch-bar";
  const height = 3 + Math.random() * 26;
  const width = 30 + Math.random() * 110;
  const top = Math.random() * 100;
  const side = Math.random() < 0.5 ? "left" : "right";

  bar.style.height = height + "px";
  bar.style.width = width + "px";
  bar.style.top = top + "%";
  bar.style[side] = "0";

  glitchLayer.appendChild(bar);
  bar.addEventListener("animationend", () => bar.remove());
}

function tearScreen() {
  if (!isActive()) return;
  screenEl.classList.add("tear");
  setTimeout(() => screenEl.classList.remove("tear"), 200);
}

setInterval(() => {
  const count = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) spawnGlitchBar();
}, 450);

function channelBurst() {
  if (!isActive()) return;
  for (let i = 0; i < 14; i++) setTimeout(spawnGlitchBar, i * 15);
  tearScreen();
}

// ---------- Bottom panel buttons ----------
const actions = {
  "ch-up"() {
    channel = (channel + 1) % CHANNELS.length;
    applyChannel();
    channelBurst();
    save();
  },
  "ch-down"() {
    channel = (channel - 1 + CHANNELS.length) % CHANNELS.length;
    applyChannel();
    channelBurst();
    save();
  },
  "dim-up"() {
    dim = Math.max(0, +(dim - DIM_STEP).toFixed(2));
    applyDim();
    save();
  },
  "dim-down"() {
    dim = Math.min(DIM_MAX, +(dim + DIM_STEP).toFixed(2));
    applyDim();
    save();
  },
  glitch(btn) {
    const off = body.classList.toggle("no-glitch");
    btn.setAttribute("aria-pressed", String(!off));
  },
  power() {
    body.classList.toggle("crt-on");
  },
};

plate.addEventListener("click", (e) => {
  if (body.classList.contains("booting")) finishBoot();
  const btn = e.target.closest("[data-act]");
  if (btn && actions[btn.dataset.act]) actions[btn.dataset.act](btn);
});

toggle.addEventListener("click", () => {
  body.classList.toggle("crt-on");
});

// ---------- Section Reveal Observer (أنيشن الأقسام) ----------
const sections = document.querySelectorAll("section");
const observerOptions = {
  root: null,
  threshold: 0.25,
};

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("section-visible");
    }
  });
}, observerOptions);

sections.forEach((section) => {
  sectionObserver.observe(section);
});

// ---------- Boot-up intro ----------
const BOOT_DURATION_MS = 4000;
const bootEl = document.querySelector(".boot-screen");
const bootText = bootEl.querySelector(".boot-lines");
const bootBar = bootEl.querySelector(".boot-bar span");

const BOOT_LINES = [
  "AUTODRIVE BIOS v1.0",
  "CHECKING MEMORY ........ OK",
  "LOADING TUBE DRIVER .... OK",
  "WARMING UP PHOSPHOR ..... OK",
  "TUNING SIGNAL ...",
];

let bootFinished = false;

function runBoot() {
  const fullText = BOOT_LINES.join("\n") + "\n";
  const TYPING_SHARE = 0.8;
  const BAR_SHARE = 0.9;
  const startTime = performance.now();

  function frame(now) {
    if (bootFinished) return;
    const t = (now - startTime) / BOOT_DURATION_MS;

    const typed = Math.min(fullText.length, Math.floor((t / TYPING_SHARE) * fullText.length));
    bootText.textContent = fullText.slice(0, typed);
    bootBar.style.width = Math.min(100, Math.round((t / BAR_SHARE) * 100)) + "%";

    if (t >= 1) {
      finishBoot();
      return;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function finishBoot() {
  if (bootFinished) return;
  bootFinished = true;
  bootEl.classList.add("boot-out");
  body.classList.remove("booting");
  const remove = () => bootEl.remove();
  bootEl.addEventListener("animationend", remove, { once: true });
  setTimeout(remove, 600);
}

if (reduceMotion) {
  bootFinished = true;
  bootEl.remove();
  body.classList.remove("booting");
} else {
  bootEl.addEventListener("click", finishBoot);
  document.addEventListener("keydown", finishBoot);
  runBoot();
}
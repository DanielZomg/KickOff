// Point d'entrée : chargement des données, onboarding, navigation, installation.
// Version 1 — jeux du jour uniquement (les pronostics arriveront plus tard).
import { el, clear, crest } from "./util.js";
import {
  getState, setProfile, update, dayKey, formatForDay, pickItem,
  recordPuzzleResult, liveStreak,
} from "./state.js";
import { FORMAT_TITLES, renderPuzzle } from "./puzzles.js";

const TODAY = dayKey();
let DATA = { clubs: [], puzzles: {} };

const $ = (sel) => document.querySelector(sel);

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

async function boot() {
  registerSW();
  try {
    const [clubs, puzzles] = await Promise.all([
      loadJSON("data/clubs.json"),
      loadJSON("data/puzzles.json"),
    ]);
    DATA = { clubs, puzzles };
  } catch (e) {
    document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;color:#14241d">
      <h2>Oups…</h2><p>Impossible de charger les données du jeu.</p>
      <p style="color:#888;font-size:13px">${e.message}</p></div>`;
    return;
  }

  if (!getState().profile) showOnboarding();
  else showApp();
}

/* ---------------- Onboarding ---------------- */
function showOnboarding() {
  const grid = $("#clubGrid");
  clear(grid);
  for (const c of DATA.clubs) {
    grid.appendChild(el("button", { class: "club-btn", onClick: () => { setProfile(c.id); showApp(); } }, [
      crest(c.crest, c.color, "club-crest"),
      el("span", { text: c.name }),
    ]));
  }
  $("#onboarding").hidden = false;
  $("#app").hidden = true;
}

/* ---------------- App principale ---------------- */
function currentClub() {
  const id = getState().profile?.clubId;
  return DATA.clubs.find((c) => c.id === id) || DATA.clubs[0];
}

function showApp() {
  $("#onboarding").hidden = true;
  $("#app").hidden = false;

  const club = currentClub();
  const logo = $("#appLogo");
  logo.textContent = club.crest;
  logo.style.cssText = `background:${club.color};color:#fff;border-radius:7px;width:26px;height:26px;display:inline-grid;place-items:center;font-size:11px;font-weight:800`;

  setupTabs();
  refreshStreak();
  renderToday();
  maybeInstallPrompt();
}

function refreshStreak() {
  $("#streakCount").textContent = String(liveStreak(TODAY));
}

function setupTabs() {
  const labels = { today: "Aujourd'hui", stats: "Mes stats" };
  document.querySelectorAll(".tabbtn").forEach((btn) => {
    btn.onclick = () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll(".tabbtn").forEach((b) => b.classList.toggle("is-active", b === btn));
      ["today", "stats"].forEach((t) => { $(`#tab-${t}`).hidden = t !== tab; });
      $("#headerLabel").textContent = labels[tab];
      if (tab === "stats") renderStats($("#statsHost"));
      window.scrollTo(0, 0);
    };
  });
}

function renderToday() {
  const format = formatForDay(TODAY);
  const item = pickItem(DATA.puzzles[format], TODAY);
  $("#puzzleTitle").textContent = FORMAT_TITLES[format];
  const saved = getState().puzzles[TODAY];
  const savedRecord = saved && saved.format === format && saved.itemId === item?.id ? saved : null;

  renderPuzzle($("#puzzleHost"), {
    key: TODAY, format, item, saved: savedRecord,
    onComplete: (record, solved) => {
      update((s) => { s.puzzles[TODAY] = { format, itemId: item.id, ...record }; });
      recordPuzzleResult(TODAY, solved);
      refreshStreak();
    },
  });
}

/* ---------------- Mes stats (jeux du jour) ---------------- */
function renderStats(host) {
  clear(host);
  const s = getState();
  const streak = liveStreak(TODAY);
  const accuracy = s.puzzlePlayed ? Math.round((s.puzzleSolved / s.puzzlePlayed) * 100) : 0;

  const box = (num, cap) => el("div", { class: "stat-box" }, [
    el("div", { class: "stat-num", text: String(num) }),
    el("div", { class: "stat-cap", text: cap }),
  ]);

  host.appendChild(el("div", { class: "section-label", text: "Le jeu du jour" }));
  host.appendChild(el("div", { class: "stat-grid" }, [
    box(`${streak}🔥`, "Série en cours"),
    box(s.puzzleSolved, "Jeux réussis"),
    box(`${accuracy}%`, "Taux de réussite"),
    box(s.puzzlePlayed, "Jeux joués"),
  ]));

  host.appendChild(el("div", { class: "card" }, [
    el("div", { class: "card-eyebrow", text: "Partager" }),
    el("p", { class: "stat-cap", style: "text-align:left;margin-bottom:12px", text: "Montre tes scores à tes amis." }),
    el("button", { class: "btn-ghost share-btn", onClick: () => {
      const txt = `⚽ Coup d'Envoi\n🔥 Série : ${streak}\n🧠 Jeux réussis : ${s.puzzleSolved} (${accuracy}% de réussite)`;
      if (navigator.share) navigator.share({ text: txt }).catch(() => {});
      else { navigator.clipboard?.writeText(txt); alert("Score copié !\n\n" + txt); }
    } }, ["Partager mes scores"]),
  ]));
}

/* ---------------- Service worker ---------------- */
function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
}

/* ---------------- Invite d'installation ---------------- */
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!getState().profile) return;
  showInstall("android");
});

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function maybeInstallPrompt() {
  if (isStandalone() || localStorage.getItem("coupdenvoi.install.dismissed")) return;
  const ua = navigator.userAgent;
  const iOS = /iphone|ipad|ipod/i.test(ua);
  if (iOS) setTimeout(() => showInstall("ios"), 2500);
  else if (deferredPrompt) showInstall("android");
}

function showInstall(kind) {
  const box = $("#installPrompt");
  const steps = $("#installSteps");
  const btn = $("#installBtn");
  clear(steps);
  if (kind === "ios") {
    btn.hidden = true;
    steps.innerHTML = "Appuie sur le bouton <b>Partager</b> ⬆️, puis choisis <b>« Sur l'écran d'accueil »</b>.";
  } else {
    btn.hidden = false;
    steps.textContent = "";
    btn.onclick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      box.hidden = true;
    };
  }
  box.hidden = false;
}

$("#installClose").onclick = () => {
  $("#installPrompt").hidden = true;
  localStorage.setItem("coupdenvoi.install.dismissed", "1");
};

boot();

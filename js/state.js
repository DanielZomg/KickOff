// Stockage local + helpers de dates et de score.
const KEY = "coupdenvoi.v1";

const DEFAULT = {
  profile: null,        // { clubId, createdAt }
  puzzles: {},          // { 'YYYY-MM-DD': { format, itemId, status, ... } }
  puzzleStreak: 0,
  puzzleLastDay: null,  // dernier jour résolu (clé)
  puzzleSolved: 0,
  puzzlePlayed: 0,
  predictions: {},      // { matchId: { home, away, at } }
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    return Object.assign(structuredClone(DEFAULT), JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT);
  }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function getState() { return state; }

export function update(fn) {
  fn(state);
  persist();
  return state;
}

export function setProfile(clubId) {
  update((s) => { s.profile = { clubId, createdAt: new Date().toISOString() }; });
}

// ---------- Dates ----------
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function epochDay(key) {
  const d = new Date(`${key}T00:00:00`);
  return Math.floor(d.getTime() / 86400000);
}

export function yesterdayKey(key) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

// Quel format de jeu pour ce jour (rythme hebdomadaire fixe).
export function formatForDay(key) {
  const dow = new Date(`${key}T00:00:00`).getDay(); // 0=dim .. 6=sam
  const map = { 1: "motdujour", 4: "motdujour", 2: "parcours", 5: "parcours", 3: "vraifaux", 6: "vraifaux", 0: "vraifaux" };
  return map[dow];
}

export function pickItem(bank, key) {
  if (!bank || !bank.length) return null;
  return bank[Math.abs(epochDay(key)) % bank.length];
}

// ---------- Streak du jeu du jour ----------
export function recordPuzzleResult(key, solved) {
  update((s) => {
    s.puzzlePlayed += 1;
    if (solved) {
      s.puzzleSolved += 1;
      if (s.puzzleLastDay === yesterdayKey(key)) s.puzzleStreak += 1;
      else if (s.puzzleLastDay !== key) s.puzzleStreak = 1;
      s.puzzleLastDay = key;
    } else if (s.puzzleLastDay !== yesterdayKey(key) && s.puzzleLastDay !== key) {
      s.puzzleStreak = 0;
    }
  });
}

// Une série n'est « vivante » que si elle a été alimentée aujourd'hui ou hier.
export function liveStreak(key) {
  if (state.puzzleLastDay === key || state.puzzleLastDay === yesterdayKey(key)) return state.puzzleStreak;
  return 0;
}

// ---------- Score des pronostics ----------
export function scorePrediction(pred, actual) {
  if (pred.home === actual.home && pred.away === actual.away) return 3;
  const pdiff = Math.sign(pred.home - pred.away);
  const adiff = Math.sign(actual.home - actual.away);
  if (pdiff !== adiff) return 0;
  if (pred.home - pred.away === actual.home - actual.away) return 2;
  return 1;
}

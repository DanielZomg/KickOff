// Récupère les matchs (Coupe du monde, Ligue des champions, Ligue 1) depuis
// football-data.org et écrit data/fixtures.json. Lancé par GitHub Actions.
import { writeFile } from "node:fs/promises";

const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
if (!TOKEN) {
  console.error("FOOTBALL_DATA_TOKEN manquant. Ajoute-le dans les secrets du dépôt.");
  process.exit(1);
}

const COMPS = [
  { code: "WC", short: "WC", name: "Coupe du monde" },
  { code: "CL", short: "CL", name: "Ligue des champions" },
  { code: "FL1", short: "FL1", name: "Ligue 1" },
];

const API = "https://api.football-data.org/v4";
const headers = { "X-Auth-Token": TOKEN };

function iso(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

// Couleur déterministe à partir du nom de l'équipe (faute de couleur via l'API).
function colorFor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 42%)`;
}

async function fetchRange(code, from, to) {
  const url = `${API}/competitions/${code}/matches?dateFrom=${iso(from)}&dateTo=${iso(to)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${code} ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.matches || [];
}

async function fetchComp(comp) {
  const start = addDays(new Date(), -3);
  const end = addDays(new Date(), 24);
  const out = [];
  // Fenêtres de 9 jours (limite du palier gratuit).
  for (let from = start; from < end; from = addDays(from, 9)) {
    const to = addDays(from, 9) < end ? addDays(from, 9) : end;
    try {
      const matches = await fetchRange(comp.code, from, to);
      out.push(...matches);
      await new Promise((r) => setTimeout(r, 6500)); // respect du quota (10 req/min)
    } catch (e) {
      console.warn(`  ${comp.name}: ${e.message}`);
    }
  }
  return out.map((m) => ({
    id: m.id,
    competition: comp.short,
    competitionName: comp.name,
    utcDate: m.utcDate,
    status: m.status,
    homeTeam: m.homeTeam?.shortName || m.homeTeam?.name || "À déterminer",
    awayTeam: m.awayTeam?.shortName || m.awayTeam?.name || "À déterminer",
    homeCrest: m.homeTeam?.tla || (m.homeTeam?.name || "?").slice(0, 3).toUpperCase(),
    awayCrest: m.awayTeam?.tla || (m.awayTeam?.name || "?").slice(0, 3).toUpperCase(),
    homeColor: colorFor(m.homeTeam?.name || "x"),
    awayColor: colorFor(m.awayTeam?.name || "y"),
    score: { home: m.score?.fullTime?.home ?? null, away: m.score?.fullTime?.away ?? null },
  }));
}

async function main() {
  const all = [];
  for (const comp of COMPS) {
    console.log(`→ ${comp.name}`);
    all.push(...(await fetchComp(comp)));
  }
  // Dédoublonnage + tri chronologique.
  const seen = new Set();
  const matches = all.filter((m) => (seen.has(m.id) ? false : seen.add(m.id)))
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

  const payload = { updatedAt: new Date().toISOString(), matches };
  await writeFile(new URL("../data/fixtures.json", import.meta.url), JSON.stringify(payload, null, 2) + "\n");
  console.log(`✓ ${matches.length} matchs écrits dans data/fixtures.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });

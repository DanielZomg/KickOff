// Pronostics : liste des matchs, saisie du score, règlement et stats.
import { el, clear, frDateTime, crest } from "./util.js";
import { getState, update, scorePrediction } from "./state.js";

function aliasMatch(name, club) {
  if (!club) return false;
  return club.aliases.some((a) => name.toLowerCase().includes(a.toLowerCase()));
}
function isClubMatch(m, club) { return aliasMatch(m.homeTeam, club) || aliasMatch(m.awayTeam, club); }
function isMarquee(m) { return m.competition === "WC" || m.competition === "CL"; }
function isRelevant(m, club) { return isClubMatch(m, club) || isMarquee(m); }

function isUpcoming(m) {
  if (m.status === "FINISHED" || m.score?.home != null) return false;
  return new Date(m.utcDate).getTime() > Date.now();
}
function isLocked(m) { return new Date(m.utcDate).getTime() <= Date.now(); }
function isSettled(m) { return m.status === "FINISHED" && m.score?.home != null; }

function compName(m) {
  return m.competition === "WC" ? "Coupe du monde" : m.competition === "CL" ? "Ligue des champions" : m.competitionName || "Ligue 1";
}

function teamNode(name, c, color, side) {
  return el("div", { class: `match-team ${side}` }, side === "away"
    ? [el("span", { text: name }), crest(c, color)]
    : [crest(c, color), el("span", { text: name })]);
}

// Règle les pronostics dont le match est terminé (idempotent).
export function settleAll(fixtures) {
  const s = getState();
  update((st) => {
    for (const m of fixtures.matches) {
      const p = st.predictions[m.id];
      if (!p || p.points != null) continue;
      if (isSettled(m)) p.points = scorePrediction(p, { home: m.score.home, away: m.score.away });
    }
  });
  return s;
}

function stepper(label, init, onChange) {
  let val = init;
  const valEl = el("div", { class: "stepper-val", text: String(val) });
  const set = (v) => { val = Math.max(0, Math.min(19, v)); valEl.textContent = String(val); onChange(val); };
  return el("div", { class: "stepper" }, [
    valEl,
    el("div", { class: "stepper-btns" }, [
      el("button", { class: "stepper-btn", "aria-label": `moins ${label}`, onClick: () => set(val - 1) }, ["−"]),
      el("button", { class: "stepper-btn", "aria-label": `plus ${label}`, onClick: () => set(val + 1) }, ["+"]),
    ]),
  ]);
}

export function matchCard(m, club) {
  const s = getState();
  const pred = s.predictions[m.id];
  const card = el("div", { class: "match-card" });
  card.appendChild(el("div", { class: `match-comp ${m.competition === "WC" ? "wc" : ""}`, text: compName(m) }));
  card.appendChild(el("div", { class: "match-date", text: frDateTime(m.utcDate) }));

  if (isSettled(m)) {
    card.appendChild(el("div", { class: "match-row" }, [
      teamNode(m.homeTeam, m.homeCrest, m.homeColor, "home"),
      el("div", { class: "final", text: `${m.score.home} – ${m.score.away}` }),
      teamNode(m.awayTeam, m.awayCrest, m.awayColor, "away"),
    ]));
    const pts = pred?.points;
    if (pred) {
      card.appendChild(el("div", { class: "match-result" }, [
        el("div", { text: `Ton prono : ${pred.home} – ${pred.away}` }),
        el("div", { class: `result-points p${pts ?? 0}`, text: pts === 3 ? "Score exact ! +3 ★" : pts === 2 ? "Bon écart +2 ★" : pts === 1 ? "Bon résultat +1 ★" : "0 point" }),
      ]));
    } else {
      card.appendChild(el("div", { class: "match-result", text: "Pas de pronostic sur ce match." }));
    }
    return card;
  }

  let draft = { home: pred?.home ?? 0, away: pred?.away ?? 0 };
  const locked = isLocked(m);

  card.appendChild(el("div", { class: "match-row" }, [
    teamNode(m.homeTeam, m.homeCrest, m.homeColor, "home"),
    locked
      ? el("div", { class: "final", text: pred ? `${pred.home} – ${pred.away}` : "—" })
      : el("div", { class: "score-input" }, [
          stepper("domicile", draft.home, (v) => (draft.home = v)),
          el("span", { class: "score-sep", text: "–" }),
          stepper("extérieur", draft.away, (v) => (draft.away = v)),
        ]),
    teamNode(m.awayTeam, m.awayCrest, m.awayColor, "away"),
  ]));

  if (locked) {
    card.appendChild(el("div", { class: "match-locked", text: pred ? "Pronostic verrouillé. Bonne chance ! 🤞" : "Match commencé — trop tard pour pronostiquer." }));
    return card;
  }

  const note = el("div", { class: "match-locked", hidden: !pred, text: "✓ Pronostic enregistré. Tu peux le modifier jusqu'au coup d'envoi." });
  const btn = el("button", { class: "btn-primary", onClick: () => {
    update((st) => { st.predictions[m.id] = { home: draft.home, away: draft.away, at: new Date().toISOString(), points: null }; });
    note.hidden = false;
    btn.textContent = "Pronostic mis à jour ✓";
    setTimeout(() => (btn.textContent = "Valider mon pronostic"), 1400);
  } }, [pred ? "Modifier mon pronostic" : "Valider mon pronostic"]);

  card.appendChild(el("div", { class: "match-actions" }, [btn, note]));
  return card;
}

export function renderPronos(host, { fixtures, club }) {
  clear(host);
  const all = fixtures.matches.filter((m) => isRelevant(m, club));
  const upcoming = all.filter(isUpcoming).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  const settled = all.filter(isSettled).sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));

  if (!upcoming.length && !settled.length) {
    host.appendChild(emptyState("🗓️", "Aucun match pour le moment", "Les prochaines affiches s'afficheront ici dès qu'elles seront connues."));
    return;
  }
  if (upcoming.length) {
    host.appendChild(el("div", { class: "section-label", text: "À pronostiquer" }));
    upcoming.forEach((m) => host.appendChild(matchCard(m, club)));
  }
  if (settled.length) {
    host.appendChild(el("div", { class: "section-label", text: "Résultats" }));
    settled.slice(0, 12).forEach((m) => host.appendChild(matchCard(m, club)));
  }
}

export function nextMatch(fixtures, club) {
  return fixtures.matches
    .filter((m) => isRelevant(m, club) && isUpcoming(m))
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))[0] || null;
}

function emptyState(em, title, sub) {
  return el("div", { class: "empty-state" }, [
    el("span", { class: "em", text: em }),
    el("div", { html: `<strong>${title}</strong>` }),
    el("p", { text: sub }),
  ]);
}

export function renderStats(host, { liveStreakValue }) {
  clear(host);
  const s = getState();
  const settled = Object.values(s.predictions).filter((p) => p.points != null);
  const points = settled.reduce((a, p) => a + p.points, 0);
  const exact = settled.filter((p) => p.points === 3).length;
  const success = settled.length ? Math.round((settled.filter((p) => p.points >= 1).length / settled.length) * 100) : 0;
  const accuracy = s.puzzlePlayed ? Math.round((s.puzzleSolved / s.puzzlePlayed) * 100) : 0;

  const box = (num, cap) => el("div", { class: "stat-box" }, [
    el("div", { class: "stat-num", text: String(num) }),
    el("div", { class: "stat-cap", text: cap }),
  ]);

  host.appendChild(el("div", { class: "section-label", text: "Le jeu du jour" }));
  host.appendChild(el("div", { class: "stat-grid" }, [
    box(`${liveStreakValue}🔥`, "Série en cours"),
    box(s.puzzleSolved, "Jeux réussis"),
    box(`${accuracy}%`, "Taux de réussite"),
    box(s.puzzlePlayed, "Jeux joués"),
  ]));

  host.appendChild(el("div", { class: "section-label", text: "Tes pronostics" }));
  host.appendChild(el("div", { class: "stat-grid" }, [
    box(points, "Points cumulés"),
    box(exact, "Scores exacts"),
    box(`${success}%`, "Pronos réussis"),
    box(settled.length, "Matchs réglés"),
  ]));

  const card = el("div", { class: "card" }, [
    el("div", { class: "card-eyebrow", text: "Partager" }),
    el("p", { class: "stat-cap", style: "text-align:left;margin-bottom:12px", text: "Montre tes scores à tes amis." }),
    el("button", { class: "btn-ghost share-btn", onClick: () => {
      const txt = `⚽ Coup d'Envoi\n🔥 Série : ${liveStreakValue}\n🎯 Pronos : ${points} pts (${exact} scores exacts)\n🧠 Jeux réussis : ${s.puzzleSolved}`;
      if (navigator.share) navigator.share({ text: txt }).catch(() => {});
      else { navigator.clipboard?.writeText(txt); alert("Score copié !\n\n" + txt); }
    } }, ["Partager mes scores"]),
  ]);
  host.appendChild(card);
}

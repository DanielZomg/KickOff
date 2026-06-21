// Les trois moteurs de jeu : Vrai ou Faux, Le Mot du jour, Le Parcours.
import { el, clear } from "./util.js";

export const FORMAT_TITLES = {
  vraifaux: "Vrai ou Faux",
  motdujour: "Le Mot du jour",
  parcours: "Le Parcours",
  cineemoji: "Ciné-Émoji",
  quiztennis: "Quiz Tennis",
  quizsport: "Quiz Sport",
  quisuisje: "Qui suis-je ?",
};

// ctx = { key, format, item, saved, onComplete(record, solved) }
export function renderPuzzle(host, ctx) {
  clear(host);
  if (!ctx.item) {
    host.appendChild(el("p", { class: "vf-explain", text: "Aucun jeu disponible aujourd'hui. Reviens demain !" }));
    return;
  }
  if (ctx.format === "vraifaux") renderVraiFaux(host, ctx);
  else if (ctx.format === "parcours") renderParcours(host, ctx);
  else if (ctx.format === "motdujour") renderWordle(host, ctx);
  else if (ctx.format === "cineemoji") renderCineEmoji(host, ctx);
  else if (ctx.format === "quiztennis" || ctx.format === "quizsport") renderQuiz(host, ctx);
  else if (ctx.format === "quisuisje") renderQuiSuisJe(host, ctx);
}

// Bloc de réponses à choix multiple, partagé par plusieurs jeux.
function makeChoices(host, options, answer, saved, onComplete) {
  const buttons = [];
  const finish = (idx) => {
    const correct = options[idx] === answer;
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (options[i] === answer) b.classList.add("correct");
      else if (i === idx) b.classList.add("wrong");
    });
    if (!saved) onComplete({ status: correct ? "solved" : "failed", chosenIndex: idx }, correct);
  };
  host.appendChild(el("div", { class: "parcours-options" }, options.map((name, i) => {
    const b = el("button", { class: "opt-btn", onClick: () => finish(i) }, [name]);
    buttons.push(b);
    return b;
  })));
  if (saved) finish(saved.chosenIndex);
}

/* ---------------- Ciné-Émoji ---------------- */
function renderCineEmoji(host, ctx) {
  host.appendChild(el("div", { class: "card-eyebrow", text: "Quel film ou quelle série ?" }));
  host.appendChild(el("div", { class: "emoji-prompt", text: ctx.item.emojis }));
  makeChoices(host, ctx.item.options, ctx.item.answer, ctx.saved, ctx.onComplete);
}

/* ---------------- Quiz (tennis / sport) ---------------- */
function renderQuiz(host, ctx) {
  host.appendChild(el("p", { class: "quiz-question", text: ctx.item.question }));
  makeChoices(host, ctx.item.options, ctx.item.answer, ctx.saved, ctx.onComplete);
}

/* ---------------- Qui suis-je ? ---------------- */
function renderQuiSuisJe(host, ctx) {
  const { item, saved } = ctx;
  host.appendChild(el("div", { class: "card-eyebrow", text: "Devine le joueur" }));
  const cluesBox = el("div", { class: "clues" });
  host.appendChild(cluesBox);
  let revealed = saved ? item.clues.length : 1;
  const moreBtn = el("button", { class: "btn-ghost clue-btn", onClick: () => { revealed = Math.min(item.clues.length, revealed + 1); paint(); } }, ["Indice suivant"]);

  function paint() {
    clear(cluesBox);
    item.clues.slice(0, revealed).forEach((c, i) => cluesBox.appendChild(
      el("div", { class: "clue" }, [el("span", { class: "clue-n", text: String(i + 1) }), el("span", { text: c })])
    ));
    moreBtn.hidden = revealed >= item.clues.length;
  }
  paint();
  host.appendChild(moreBtn);
  makeChoices(host, item.options, item.answer, saved, ctx.onComplete);
}

function solvedBanner(text, points) {
  return el("div", { class: "solved-banner" }, [
    el("div", { class: "big", text }),
    points != null ? el("span", { class: "points-pill", text: `+${points} ★` }) : null,
  ]);
}

/* ---------------- Vrai ou Faux ---------------- */
function renderVraiFaux(host, ctx) {
  const { item, saved } = ctx;
  host.appendChild(el("p", { class: "vf-statement", text: item.statement }));

  const explainBox = el("div", { class: "vf-explain", hidden: true });
  const finish = (chosen) => {
    const solved = chosen === item.answer;
    vrai.disabled = faux.disabled = true;
    (chosen ? vrai : faux).style.opacity = "1";
    (chosen ? faux : vrai).style.opacity = "0.45";
    explainBox.hidden = false;
    clear(explainBox);
    explainBox.appendChild(el("div", { class: `vf-verdict ${solved ? "win" : "lose"}`, text: solved ? "Bravo, c'est juste ! 🎉" : "Raté…" }));
    explainBox.appendChild(el("div", { text: item.explain }));
    if (!saved) ctx.onComplete({ status: solved ? "solved" : "failed", chosen }, solved);
  };

  const vrai = el("button", { class: "vf-btn vrai", onClick: () => finish(true) }, ["VRAI"]);
  const faux = el("button", { class: "vf-btn faux", onClick: () => finish(false) }, ["FAUX"]);
  host.appendChild(el("div", { class: "vf-buttons" }, [vrai, faux]));
  host.appendChild(explainBox);

  if (saved) finishFromSaved(() => finish(saved.chosen));
}

/* ---------------- Le Parcours ---------------- */
function renderParcours(host, ctx) {
  const { item, saved } = ctx;
  const path = el("div", { class: "parcours-path" },
    item.path.map((s) => el("div", { class: "parcours-step" }, [
      el("span", { class: "parcours-yrs", text: s.years || "" }),
      el("span", { text: s.club }),
    ]))
  );
  host.appendChild(el("div", { class: "card-eyebrow", text: "Quel joueur a connu ce parcours ?" }));
  host.appendChild(path);

  const buttons = [];
  const finish = (idx) => {
    const correct = item.options[idx] === item.player;
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (item.options[i] === item.player) b.classList.add("correct");
      else if (i === idx) b.classList.add("wrong");
    });
    if (!saved) ctx.onComplete({ status: correct ? "solved" : "failed", chosenIndex: idx }, correct);
  };

  const opts = el("div", { class: "parcours-options" },
    item.options.map((name, i) => {
      const b = el("button", { class: "opt-btn", onClick: () => finish(i) }, [name]);
      buttons.push(b);
      return b;
    })
  );
  host.appendChild(opts);

  if (saved) finish(saved.chosenIndex);
}

/* ---------------- Le Mot du jour (Wordle) ---------------- */
const ROWS = ["AZERTYUIOP", "QSDFGHJKLM", "↵WXCVBN⌫"];
const MAX_TRIES = 6;

function scoreGuess(guess, answer) {
  const res = new Array(guess.length).fill("bad");
  const counts = {};
  for (const ch of answer) counts[ch] = (counts[ch] || 0) + 1;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) { res[i] = "good"; counts[guess[i]]--; }
  }
  for (let i = 0; i < guess.length; i++) {
    if (res[i] === "good") continue;
    if (counts[guess[i]] > 0) { res[i] = "close"; counts[guess[i]]--; }
  }
  return res;
}

function renderWordle(host, ctx) {
  const { item, saved } = ctx;
  const answer = item.answer.toUpperCase();
  const len = answer.length;
  const guesses = saved ? [...(saved.guesses || [])] : [];
  let current = "";
  let done = !!saved;

  host.appendChild(el("p", { class: "card-eyebrow", text: `Devine ce nom de joueur · ${len} lettres` }));
  host.appendChild(el("p", { class: "vf-explain", text: `Indice : ${item.hint}` }));

  const grid = el("div", { class: "wordle-grid", style: `grid-template-rows: repeat(${MAX_TRIES}, 1fr)` });
  host.appendChild(grid);
  const keyState = {};
  const kb = el("div", { class: "wordle-keyboard" });
  host.appendChild(kb);
  const msg = el("div", { class: "vf-explain", hidden: true });
  host.appendChild(msg);

  function paintGrid() {
    clear(grid);
    for (let r = 0; r < MAX_TRIES; r++) {
      const row = el("div", { class: "wordle-row", style: `grid-template-columns: repeat(${len}, 1fr)` });
      const guess = guesses[r];
      for (let c = 0; c < len; c++) {
        let cls = "wordle-cell";
        let ch = "";
        if (guess) {
          ch = guess[c];
          const res = scoreGuess(guess, answer)[c];
          cls += ` ${res}`;
          keyState[ch] = bestKey(keyState[ch], res);
        } else if (r === guesses.length) {
          ch = current[c] || "";
          if (ch) cls += " filled";
        }
        row.appendChild(el("div", { class: cls, text: ch }));
      }
      grid.appendChild(row);
    }
  }

  function paintKb() {
    clear(kb);
    for (const rowStr of ROWS) {
      const krow = el("div", { class: "wordle-krow" });
      for (const ch of rowStr) {
        const wide = ch === "↵" || ch === "⌫";
        const st = keyState[ch];
        const b = el("button", { class: `key ${wide ? "wide" : ""} ${st || ""}`.trim(), onClick: () => onKey(ch) }, [ch]);
        krow.appendChild(b);
      }
      kb.appendChild(krow);
    }
  }

  function endGame(solved) {
    done = true;
    msg.hidden = false;
    clear(msg);
    msg.appendChild(el("div", { class: `vf-verdict ${solved ? "win" : "lose"}`, text: solved ? "Trouvé ! 🎉" : `Dommage… c'était ${answer}` }));
    if (!ctx._restoring) ctx.onComplete({ status: solved ? "solved" : "failed", guesses }, solved);
  }

  function submit() {
    if (current.length !== len) { flash("Il manque des lettres."); return; }
    guesses.push(current);
    const solved = current === answer;
    current = "";
    paintGrid(); paintKb();
    if (solved) endGame(true);
    else if (guesses.length >= MAX_TRIES) endGame(false);
  }

  function flash(t) { msg.hidden = false; clear(msg); msg.appendChild(el("div", { text: t })); setTimeout(() => { if (!done) msg.hidden = true; }, 1200); }

  function onKey(ch) {
    if (done) return;
    if (ch === "⌫") { current = current.slice(0, -1); paintGrid(); }
    else if (ch === "↵") submit();
    else if (current.length < len) { current += ch; paintGrid(); }
  }

  document.addEventListener("keydown", (e) => {
    if (done || !host.isConnected) return;
    const k = e.key.toUpperCase();
    if (k === "ENTER") onKey("↵");
    else if (k === "BACKSPACE") onKey("⌫");
    else if (/^[A-Z]$/.test(k)) onKey(k);
  });

  // Rendu initial / restauration
  if (saved) {
    ctx._restoring = true;
    paintGrid(); paintKb();
    endGame(saved.status === "solved");
  } else {
    paintGrid(); paintKb();
  }
}

function bestKey(prev, next) {
  const rank = { good: 3, close: 2, bad: 1 };
  if (!prev) return next;
  return rank[next] > rank[prev] ? next : prev;
}

// micro-helper pour rejouer un état sauvegardé sans relancer onComplete
function finishFromSaved(fn) { fn(); }

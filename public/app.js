/*
 * Calculatrice — JS natif, sans framework.
 * Le calcul (= et enchaînements d'opérateurs) est délégué à l'API GET /calculate.
 * La logique est isolée dans des fonctions pures (testables hors navigateur) ;
 * le câblage du clavier et l'horloge vivent dans la couche DOM, en dessous.
 */

// Symbole affiché → nom d'opération attendu par l'API.
const OPERATORS = {
  "+": "add",
  "−": "subtract",
  "×": "multiply",
  "÷": "divide",
};

function operationFor(symbol) {
  return OPERATORS[symbol] || null;
}

function buildCalcUrl(operation, a, b) {
  const params = new URLSearchParams({ operation, a, b });
  return `/calculate?${params.toString()}`;
}

function interpret(status, body) {
  if (status === 200 && body && Object.prototype.hasOwnProperty.call(body, "result")) {
    return { ok: true, value: body.result };
  }
  return { ok: false, message: (body && body.error) || `Erreur (HTTP ${status})` };
}

// L'API renvoie 400 pour toute division par zéro (contrat strict).
// Côté front, on préfère afficher ±∞ comme une vraie calculatrice :
//   1 / 0  → +∞     -1 / 0 → −∞     0 / 0 → Erreur (indéfini)
function resolveDivideByZero(prev, symbol, current) {
  if (symbol !== "÷" || Number(current) !== 0) return null;
  const p = Number(prev);
  if (p === 0 || Number.isNaN(p)) return { ok: false, message: "Erreur" };
  return { ok: true, value: p > 0 ? Infinity : -Infinity };
}

function appendDigit(entry, digit) {
  return entry === "0" ? digit : entry + digit;
}

function appendDecimal(entry) {
  return entry.includes(".") ? entry : entry + ".";
}

function toggleSign(entry) {
  if (entry === "0") return entry;
  return entry.startsWith("-") ? entry.slice(1) : "-" + entry;
}

function applyPercent(entry) {
  const n = Number(entry);
  return Number.isNaN(n) ? entry : String(n / 100);
}

function backspace(entry) {
  const next = entry.slice(0, -1);
  return next === "" || next === "-" ? "0" : next;
}

// Nombre → chaîne d'affichage (arrondi raisonnable).
// ±Infinity affichés "∞" / "−∞" ; NaN, null, valeurs non numériques → "Erreur".
function formatNumber(value) {
  if (value === Infinity) return "∞";
  if (value === -Infinity) return "−∞";
  if (value === null || typeof value !== "number" || Number.isNaN(value)) {
    return "Erreur";
  }
  return String(parseFloat(value.toPrecision(12)));
}

// Affichage français : le point décimal interne devient une virgule.
function toDisplay(entry) {
  return entry.replace(".", ",");
}

// Ligne d'historique lisible : "a op b = résultat" (format FR, virgule décimale).
function formatHistoryEntry(a, operator, b, result) {
  return `${toDisplay(String(a))} ${operator} ${toDisplay(b)} = ${toDisplay(formatNumber(result))}`;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    OPERATORS,
    operationFor,
    buildCalcUrl,
    interpret,
    resolveDivideByZero,
    appendDigit,
    appendDecimal,
    toggleSign,
    applyPercent,
    backspace,
    formatNumber,
    toDisplay,
    formatHistoryEntry,
  };
}

/* istanbul ignore next : couche DOM (clavier + horloge), validée manuellement */
function initDom() {
  const display = document.getElementById("display");
  const keys = document.querySelector(".keys");
  if (!display || !keys) return;

  const state = { current: "0", previous: null, operator: null, overwrite: true, error: false };

  // ---- Historique des calculs (panneau latéral) ----
  const historyList = document.getElementById("history-list");
  const historyEmpty = document.getElementById("history-empty");
  const historyPanel = document.getElementById("history-panel");
  const historyToggle = document.getElementById("history-toggle");
  const historyClose = document.getElementById("history-close");
  const historyClear = document.getElementById("history-clear");
  const history = [];

  function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = "";
    if (historyEmpty) historyEmpty.style.display = history.length ? "none" : "block";
    for (const entry of history) {
      const li = document.createElement("li");
      li.className = "history__item";
      li.textContent = entry;
      historyList.appendChild(li);
    }
  }

  function recordCalc(a, symbol, b, value) {
    if (value === null) return;
    history.unshift(formatHistoryEntry(a, symbol, b, value));
    if (history.length > 50) history.pop();
    renderHistory();
  }

  function setHistoryOpen(open) {
    if (!historyPanel) return;
    historyPanel.classList.toggle("is-open", open);
    historyPanel.setAttribute("aria-hidden", String(!open));
    if (historyToggle) historyToggle.setAttribute("aria-expanded", String(open));
  }

  if (historyToggle) historyToggle.addEventListener("click", () => setHistoryOpen(true));
  if (historyClose) historyClose.addEventListener("click", () => setHistoryOpen(false));
  if (historyClear)
    historyClear.addEventListener("click", () => {
      history.length = 0;
      renderHistory();
    });
  renderHistory();

  function render() {
    display.value = state.error ? "Erreur" : toDisplay(state.current);
    display.classList.toggle("is-error", state.error);
  }

  function resetAll() {
    state.current = "0";
    state.previous = null;
    state.operator = null;
    state.overwrite = true;
    state.error = false;
  }

  function showError() {
    resetAll();
    state.error = true;
    render();
  }

  // Appelle l'API pour calculer `prev (operator) current`.
  // Si l'API renvoie l'erreur "division par zéro", on tente d'afficher ±∞ côté front.
  async function evaluate(prev, symbol, current) {
    const response = await fetch(buildCalcUrl(operationFor(symbol), prev, current));
    const body = await response.json();
    const result = interpret(response.status, body);
    if (!result.ok) {
      const override = resolveDivideByZero(prev, symbol, current);
      if (override) return override;
    }
    return result;
  }

  function inputDigit(digit) {
    if (state.error) resetAll();
    state.current = state.overwrite ? digit : appendDigit(state.current, digit);
    state.overwrite = false;
    render();
  }

  function inputDecimal() {
    if (state.error) resetAll();
    state.current = state.overwrite ? "0." : appendDecimal(state.current);
    state.overwrite = false;
    render();
  }

  async function chooseOperator(symbol) {
    if (state.error) return;
    // Enchaînement : un opérateur en attente + un 2e opérande saisi → on calcule d'abord.
    if (state.operator && !state.overwrite) {
      const result = await evaluate(state.previous, state.operator, state.current);
      if (!result.ok || result.value === null) return showError();
      recordCalc(state.previous, state.operator, state.current, result.value);
      state.previous = result.value;
      state.current = formatNumber(result.value);
    } else {
      state.previous = Number(state.current);
    }
    state.operator = symbol;
    state.overwrite = true;
    render();
  }

  async function equals() {
    if (state.operator === null || state.overwrite) return;
    const result = await evaluate(state.previous, state.operator, state.current);
    if (!result.ok || result.value === null) return showError();
    recordCalc(state.previous, state.operator, state.current, result.value);
    state.current = formatNumber(result.value);
    state.previous = null;
    state.operator = null;
    state.overwrite = true;
    render();
  }

  keys.addEventListener("click", async (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;

    if (btn.dataset.digit !== undefined) return inputDigit(btn.dataset.digit);
    if (btn.dataset.op !== undefined) return chooseOperator(btn.dataset.op);

    try {
      switch (btn.dataset.action) {
        case "equals":
          await equals();
          break;
        case "decimal":
          inputDecimal();
          break;
        case "clear":
          resetAll();
          render();
          break;
        case "back":
          if (!state.error) state.current = backspace(state.current);
          render();
          break;
        case "percent":
          if (!state.error) state.current = applyPercent(state.current);
          render();
          break;
        case "negate":
          if (!state.error) state.current = toggleSign(state.current);
          render();
          break;
      }
    } catch {
      showError();
    }
  });

  render();
}

/* istanbul ignore next : horloge d'en-tête */
function initClock() {
  const dateEl = document.getElementById("date");
  const timeEl = document.getElementById("time");
  if (!dateEl || !timeEl) return;
  function tick() {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    timeEl.textContent = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  tick();
  setInterval(tick, 1000);
}

if (typeof document !== "undefined") {
  initDom();
  initClock();
}

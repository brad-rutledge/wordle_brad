
const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

// Multiple puzzles per day:
const SLOTS_PER_DAY = 3; // morning, afternoon, evening
const EPOCH = new Date("2026-01-01T00:00:00Z"); // schedule start date
const SALT = "brad-fixed-salt-123"; // seed for deterministic shuffle

let solution = "";
let allowedWords = [];
let currentRow = 0, currentCol = 0;
const grid = Array.from({ length: MAX_GUESSES }, () => Array(WORD_LENGTH).fill(""));

init();

async function init() {
  renderBoard();

  // Load the combined SCOWL+ENABLE list built by GitHub Actions
  const resp = await fetch("words.json");
  allowedWords = await resp.json();

  const answers = allowedWords.filter(w => w.length === 5);
  const shuffled = stableShuffle(answers, SALT);

  const now = new Date();
  const index = dailySlotIndex(now, EPOCH, SLOTS_PER_DAY) % shuffled.length;
  solution = shuffled[index].toLowerCase();

  renderKeyboard();
  wireInputHandlers();
  setMessage(slotLabel(now) + " puzzle");
}

function dailySlotIndex(now, epoch, slotsPerDay) {
  const days = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
     Date.UTC(epoch.getUTCFullYear(), epoch.getUTCMonth(), epoch.getUTCDate())) / (1000 * 60 * 60 * 24)
  );
  const hour = now.getHours(); // local time
  const slot = hour < 12 ? 0 : hour < 18 ? 1 : 2;
  return days * slotsPerDay + slot;
}
function slotLabel(now) { const h = now.getHours(); return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening"; }

function renderBoard() {
  const boardEl = document.getElementById("board"); boardEl.innerHTML = "";
  for (let r = 0; r < MAX_GUESSES; r++) for (let c = 0; c < WORD_LENGTH; c++) {
    const cell = document.createElement("div");
    cell.className = "cell"; cell.id = `cell-${r}-${c}`;
    boardEl.appendChild(cell);
  }
}
function renderKeyboard() {
  const keyboardEl = document.getElementById("keyboard"); keyboardEl.innerHTML = "";
  const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  for (const row of rows) for (const k of row) {
    const b = document.createElement("button");
    b.className = "key"; b.textContent = k;
    b.onclick = () => onKey(k);
    keyboardEl.appendChild(b);
  }
  const enter = document.createElement("button"); enter.className = "key"; enter.textContent = "Enter"; enter.onclick = onEnter; keyboardEl.appendChild(enter);
  const back = document.createElement("button"); back.className = "key"; back.textContent = "⌫"; back.onclick = onBackspace; keyboardEl.appendChild(back);
}
function wireInputHandlers() {
  document.addEventListener("keydown", e => {
    if (/^[a-z]$/i.test(e.key)) onKey(e.key.toUpperCase());
    else if (e.key === "Backspace") onBackspace();
    else if (e.key === "Enter") onEnter();
  });
}
function onKey(k) {
  if (currentRow >= MAX_GUESSES) return;
  if (currentCol < WORD_LENGTH) {
    grid[currentRow][currentCol] = k.toLowerCase();
    document.getElementById(`cell-${currentRow}-${currentCol}`).textContent = k;
    currentCol++;
  }
}
function onBackspace() {
  if (currentCol > 0) {
    currentCol--;
    grid[currentRow][currentCol] = "";
    document.getElementById(`cell-${currentRow}-${currentCol}`).textContent = "";
  }
}
function onEnter() {
  if (currentCol !== WORD_LENGTH) { setMessage("Need 5 letters"); return; }
  const guess = grid[currentRow].join("");
  if (allowedWords.length && !allowedWords.includes(guess)) { setMessage("Not in word list"); return; }
  const fb = scoreGuess(guess, solution);
  paintFeedback(currentRow, fb);
  if (guess === solution) { setMessage(`Nice! You got it in ${currentRow + 1}`); currentRow = MAX_GUESSES; return; }
  currentRow++; currentCol = 0;
  if (currentRow === MAX_GUESSES) setMessage(`Out of guesses. Solution: ${solution.toUpperCase()}`);
}
function paintFeedback(row, feedback) {
  for (let c = 0; c < WORD_LENGTH; c++) {
    const cell = document.getElementById(`cell-${row}-${c}`);
    cell.classList.remove("tile-green", "tile-yellow", "tile-gray");
    cell.classList.add(feedback[c] === "green" ? "tile-green" : feedback[c] === "yellow" ? "tile-yellow" : "tile-gray");
  }
}
function scoreGuess(guess, solution) {
  const res = Array(WORD_LENGTH).fill("gray"), freq = {};
  for (let i = 0; i < WORD_LENGTH; i++) freq[solution[i]] = (freq[solution[i]] || 0) + 1;
  for (let i = 0; i < WORD_LENGTH; i++) if (guess[i] === solution[i]) { res[i] = "green"; freq[guess[i]]--; }
  for (let i = 0; i < WORD_LENGTH; i++) if (res[i] === "green") continue;
    else if (freq[guess[i]] > 0) { res[i] = "yellow"; freq[guess[i]]--; }
  return res;
}
// Seeded deterministic shuffle
function stableShuffle(arr, salt) {
  const out = arr.slice(); let seed = xmur3(salt); let rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
function xmur3(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
function mulberry32(a) { return function() { let t = a += 0x6D2B79F5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function setMessage(t) { document.getElementById("message").textContent = t; }
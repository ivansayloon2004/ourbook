const storageKey = "storybook-memories";
const sessionKey = "storybook-unlocked";
const passphraseHash = "b9dfe142c20b69fc2867d923e82955b8eda47556d46268ab252aff52f7b5a4f0";

const starterMemories = [
  {
    title: "The day we became us",
    date: "2025-02-14",
    category: "Milestone",
    description: "The beginning of the timeline you will keep rewriting together.",
  },
  {
    title: "Our coziest night in",
    date: "2025-06-21",
    category: "Everyday Magic",
    description: "Blankets, favorite snacks, one playlist on repeat, and zero desire to be anywhere else.",
  },
];

const gate = document.getElementById("privacy-gate");
const appShell = document.getElementById("app-shell");
const gateForm = document.getElementById("gate-form");
const gateError = document.getElementById("gate-error");
const passphraseInput = document.getElementById("passphrase");
const lockButton = document.getElementById("lock-site");
const form = document.getElementById("memory-form");
const memoryList = document.getElementById("memory-list");
const template = document.getElementById("memory-template");
const clearButton = document.getElementById("clear-memories");
const stats = document.querySelectorAll(".stat-number");
let statsAnimated = false;

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function setUnlockedState(unlocked) {
  gate.classList.toggle("hidden", unlocked);
  appShell.classList.toggle("locked", !unlocked);
  appShell.setAttribute("aria-hidden", String(!unlocked));
  document.body.classList.toggle("gate-open", !unlocked);

  if (unlocked && !statsAnimated) {
    animateStats();
    statsAnimated = true;
  }
}

function getMemories() {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) {
    window.localStorage.setItem(storageKey, JSON.stringify(starterMemories));
    return starterMemories;
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : starterMemories;
  } catch {
    return starterMemories;
  }
}

function saveMemories(memories) {
  window.localStorage.setItem(storageKey, JSON.stringify(memories));
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function renderEmptyState() {
  memoryList.innerHTML =
    '<div class="memory-empty">No saved memories yet. Add your first one and start your archive.</div>';
}

function renderMemories() {
  const memories = getMemories().sort((a, b) => new Date(b.date) - new Date(a.date));
  memoryList.innerHTML = "";

  if (!memories.length) {
    renderEmptyState();
    return;
  }

  memories.forEach((memory) => {
    const node = template.content.cloneNode(true);
    node.querySelector(".memory-category").textContent = memory.category;
    node.querySelector(".memory-date").textContent = formatDate(memory.date);
    node.querySelector(".memory-date").dateTime = memory.date;
    node.querySelector(".memory-title").textContent = memory.title;
    node.querySelector(".memory-description").textContent = memory.description;
    memoryList.appendChild(node);
  });
}

function animateStats() {
  stats.forEach((stat) => {
    if (stat.dataset.animated === "true") {
      return;
    }

    const target = Number(stat.dataset.count || 0);
    let current = 0;
    const step = Math.max(1, Math.round(target / 36));

    const tick = () => {
      current += step;
      if (current >= target) {
        stat.textContent = target;
        return;
      }

      stat.textContent = current;
      window.requestAnimationFrame(tick);
    };

    tick();
    stat.dataset.animated = "true";
  });
}

async function handleUnlock(event) {
  event.preventDefault();
  gateError.textContent = "";

  const guess = passphraseInput.value.trim();
  if (!guess) {
    gateError.textContent = "Enter your shared passphrase first.";
    return;
  }

  const hash = await sha256(guess);
  if (hash !== passphraseHash) {
    gateError.textContent = "That passphrase is not right.";
    return;
  }

  window.sessionStorage.setItem(sessionKey, "true");
  gateForm.reset();
  setUnlockedState(true);
}

function lockSite() {
  window.sessionStorage.removeItem(sessionKey);
  setUnlockedState(false);
  passphraseInput.focus();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const memory = {
    title: formData.get("title").toString().trim(),
    date: formData.get("date").toString(),
    category: formData.get("category").toString(),
    description: formData.get("description").toString().trim(),
  };

  if (!memory.title || !memory.date || !memory.description) {
    return;
  }

  const memories = getMemories();
  memories.push(memory);
  saveMemories(memories);
  renderMemories();
  form.reset();
});

clearButton.addEventListener("click", () => {
  saveMemories([]);
  renderMemories();
});

renderMemories();
gateForm.addEventListener("submit", handleUnlock);
lockButton.addEventListener("click", lockSite);

const isUnlocked = window.sessionStorage.getItem(sessionKey) === "true";
setUnlockedState(isUnlocked);

if (!isUnlocked) {
  passphraseInput.focus();
}

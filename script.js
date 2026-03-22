const storageKey = "storybook-memories";
const sessionKey = "storybook-unlocked";
const authKey = "storybook-passphrase-hash";

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
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const registerPassphraseInput = document.getElementById("register-passphrase");
const confirmPassphraseInput = document.getElementById("confirm-passphrase");
const loginPassphraseInput = document.getElementById("login-passphrase");
const registerStatus = document.getElementById("register-status");
const gateError = document.getElementById("gate-error");
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

function getStoredPassphraseHash() {
  return window.localStorage.getItem(authKey);
}

function setStoredPassphraseHash(hash) {
  window.localStorage.setItem(authKey, hash);
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
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
    const image = node.querySelector(".memory-image");
    if (memory.photo) {
      image.src = memory.photo;
      image.classList.remove("hidden");
    }
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

async function handleRegister(event) {
  event.preventDefault();
  registerStatus.textContent = "";
  gateError.textContent = "";

  const passphrase = registerPassphraseInput.value.trim();
  const confirmation = confirmPassphraseInput.value.trim();

  if (!passphrase || !confirmation) {
    registerStatus.textContent = "Enter the passphrase in both fields.";
    return;
  }

  if (passphrase.length < 6) {
    registerStatus.textContent = "Choose a passphrase with at least 6 characters.";
    return;
  }

  if (passphrase !== confirmation) {
    registerStatus.textContent = "Those passphrases do not match yet.";
    return;
  }

  const hash = await sha256(passphrase);
  setStoredPassphraseHash(hash);
  window.sessionStorage.setItem(sessionKey, "true");
  registerForm.reset();
  loginForm.reset();
  registerStatus.textContent = "Shared passphrase saved for this browser.";
  setUnlockedState(true);
}

async function handleUnlock(event) {
  event.preventDefault();
  gateError.textContent = "";
  registerStatus.textContent = "";

  const storedHash = getStoredPassphraseHash();
  if (!storedHash) {
    gateError.textContent = "Register a shared passphrase first.";
    return;
  }

  const guess = loginPassphraseInput.value.trim();
  if (!guess) {
    gateError.textContent = "Enter your shared passphrase first.";
    return;
  }

  const hash = await sha256(guess);
  if (hash !== storedHash) {
    gateError.textContent = "That passphrase is not right.";
    return;
  }

  window.sessionStorage.setItem(sessionKey, "true");
  loginForm.reset();
  setUnlockedState(true);
}

function lockSite() {
  window.sessionStorage.removeItem(sessionKey);
  setUnlockedState(false);
  loginPassphraseInput.focus();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const photoFile = formData.get("photo");
  let photo = "";

  if (photoFile instanceof File && photoFile.size > 0) {
    photo = await readFileAsDataUrl(photoFile);
  }

  const memory = {
    title: formData.get("title").toString().trim(),
    date: formData.get("date").toString(),
    category: formData.get("category").toString(),
    description: formData.get("description").toString().trim(),
    photo,
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
registerForm.addEventListener("submit", handleRegister);
loginForm.addEventListener("submit", handleUnlock);
lockButton.addEventListener("click", lockSite);

const isUnlocked = window.sessionStorage.getItem(sessionKey) === "true";
setUnlockedState(isUnlocked);

if (!isUnlocked) {
  if (getStoredPassphraseHash()) {
    loginPassphraseInput.focus();
  } else {
    registerPassphraseInput.focus();
  }
}

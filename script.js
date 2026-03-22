const storageKey = "storybook-memories";

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

const form = document.getElementById("memory-form");
const memoryList = document.getElementById("memory-list");
const template = document.getElementById("memory-template");
const clearButton = document.getElementById("clear-memories");
const stats = document.querySelectorAll(".stat-number");

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
  });
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
animateStats();

const SUPABASE_URL = "https://fpboqmodxbyczocpsldx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cNQtliKdzNAqIXvSllaM-Q_tWRKjOFx";
const PHOTO_BUCKET = "memory-photos";
const DEFAULT_GATE_NAMES = "Reserved for one couple only";
const GATE_SESSION_KEY = "storybook-shared-unlocked";
const GATE_SHARED_CODE_KEY = "storybook-shared-code";
const GATE_COUPLE_TITLE_KEY = "storybook-couple-title";

const isConfigured =
  !SUPABASE_URL.startsWith("YOUR_") &&
  !SUPABASE_ANON_KEY.startsWith("YOUR_") &&
  SUPABASE_URL.includes(".supabase.co") &&
  SUPABASE_ANON_KEY.length > 20;
const supabaseClient = isConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const gate = document.getElementById("privacy-gate");
const appShell = document.getElementById("app-shell");
const configBanner = document.getElementById("config-banner");
const phraseForm = document.getElementById("phrase-form");
const registerForm = document.getElementById("register-form");
const authForm = document.getElementById("auth-form");
const adminAccessToggle = document.getElementById("admin-access-toggle");
const adminForm = document.getElementById("admin-form");
const adminRegisterForm = document.getElementById("admin-register-form");
const sharedPassphraseInput = document.getElementById("shared-passphrase");
const gateError = document.getElementById("gate-error");
const registerCoupleTitleInput = document.getElementById("register-couple-title");
const registerSharedCodeInput = document.getElementById("register-shared-code");
const registerPassphraseInput = document.getElementById("register-passphrase");
const registerPassphraseConfirmInput = document.getElementById("register-passphrase-confirm");
const registerError = document.getElementById("register-error");
const registerStatus = document.getElementById("register-status");
const authDisplayNameInput = document.getElementById("auth-display-name");
const authSharedCodeInput = document.getElementById("auth-shared-code");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authError = document.getElementById("auth-error");
const authStatus = document.getElementById("auth-status");
const adminEmailInput = document.getElementById("admin-email");
const adminPasswordInput = document.getElementById("admin-password");
const adminError = document.getElementById("admin-error");
const adminStatus = document.getElementById("admin-status");
const adminRegisterEmailInput = document.getElementById("admin-register-email");
const adminRegisterPasswordInput = document.getElementById("admin-register-password");
const adminRegisterPasswordConfirmInput = document.getElementById("admin-register-password-confirm");
const adminRegisterError = document.getElementById("admin-register-error");
const adminRegisterStatus = document.getElementById("admin-register-status");
const gateNames = document.getElementById("gate-names");
const userChip = document.getElementById("user-chip");
const signOutButton = document.getElementById("sign-out");
const adminSection = document.getElementById("admin-section");
const profileForm = document.getElementById("profile-form");
const milestoneForm = document.getElementById("milestone-form");
const letterForm = document.getElementById("letter-form");
const memoryForm = document.getElementById("memory-form");
const cancelEditButton = document.getElementById("cancel-edit");
const refreshButton = document.getElementById("refresh-memories");
const saveMemoryButton = document.getElementById("save-memory");
const memoryList = document.getElementById("memory-list");
const memoryFeedback = document.getElementById("memory-feedback");
const memorySubtitle = document.getElementById("memory-subtitle");
const stats = document.querySelectorAll(".stat-number");
const template = document.getElementById("memory-template");
const milestoneTemplate = document.getElementById("milestone-template");
const letterTemplate = document.getElementById("letter-template");
const milestoneList = document.getElementById("milestone-list");
const letterList = document.getElementById("letter-list");
const searchInput = document.getElementById("search-input");
const filterCategory = document.getElementById("filter-category");
const filterAlbum = document.getElementById("filter-album");
const filterView = document.getElementById("filter-view");
const calendarTitle = document.getElementById("calendar-title");
const calendarGrid = document.getElementById("calendar-grid");
const calendarPrev = document.getElementById("calendar-prev");
const calendarNext = document.getElementById("calendar-next");
const reminderList = document.getElementById("reminder-list");
const flashbackDateLabel = document.getElementById("flashback-date-label");
const flashbackTitle = document.getElementById("flashback-title");
const flashbackDescription = document.getElementById("flashback-description");
const flashbackList = document.getElementById("flashback-list");
const brandTitle = document.getElementById("brand-title");
const heroTitle = document.getElementById("hero-title");
const heroQuote = document.getElementById("hero-quote");
const profileSummary = document.getElementById("profile-summary");
const profileAnniversaryDays = document.getElementById("profile-anniversary-days");
const profileMemoryCount = document.getElementById("profile-memory-count");
const profileLetterCount = document.getElementById("profile-letter-count");
const profilePinnedCount = document.getElementById("profile-pinned-count");
const generateInviteButton = document.getElementById("generate-invite");
const copyInviteButton = document.getElementById("copy-invite");
const inviteLinkInput = document.getElementById("invite-link");
const inviteStatus = document.getElementById("invite-status");
const exportBackupButton = document.getElementById("export-backup");
const exportStatus = document.getElementById("export-status");
const securitySummary = document.getElementById("security-summary");
const adminTotalCouples = document.getElementById("admin-total-couples");
const adminTotalProfiles = document.getElementById("admin-total-profiles");
const adminTotalMemories = document.getElementById("admin-total-memories");
const adminTotalLetters = document.getElementById("admin-total-letters");
const adminCoupleList = document.getElementById("admin-couple-list");
const adminMemoryList = document.getElementById("admin-memory-list");
const dashboardMemories = document.getElementById("dashboard-memories");
const dashboardPhotos = document.getElementById("dashboard-photos");
const dashboardFavorites = document.getElementById("dashboard-favorites");
const dashboardAlbums = document.getElementById("dashboard-albums");
const dashboardLatestTitle = document.getElementById("dashboard-latest-title");
const dashboardLatestMeta = document.getElementById("dashboard-latest-meta");

let statsAnimated = false;
let currentSession = null;
let currentProfile = null;
let currentMemories = [];
let currentMilestones = [];
let currentLetters = [];
let commentsByMemory = new Map();
let reactionsByMemory = new Map();
let channels = [];
let editingMemoryId = "";
let editingMilestoneId = "";
let currentMonth = new Date();
let activeInviteToken = "";
let currentIsAdmin = false;

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

function setFeedback(message, type = "muted") {
  memoryFeedback.textContent = message;
  memoryFeedback.style.color =
    type === "error" ? "#9c3147" : type === "success" ? "#2f6c50" : "";
}

function setGateMessage(message = "", type = "error") {
  gateError.textContent = message;
  gateError.style.color = type === "success" ? "#2f6c50" : "#9c3147";
}

function setAuthMessage(message = "", type = "error") {
  if (type === "success") {
    authStatus.textContent = message;
    authError.textContent = "";
    return;
  }

  authError.textContent = message;
  authStatus.textContent = "";
}

function setRegisterMessage(message = "", type = "error") {
  if (type === "success") {
    registerStatus.textContent = message;
    registerError.textContent = "";
    return;
  }

  registerError.textContent = message;
  registerStatus.textContent = "";
}

function setAdminMessage(message = "", type = "error") {
  if (type === "success") {
    adminStatus.textContent = message;
    adminError.textContent = "";
    return;
  }

  adminError.textContent = message;
  adminStatus.textContent = "";
}

function setAdminRegisterMessage(message = "", type = "error") {
  if (type === "success") {
    adminRegisterStatus.textContent = message;
    adminRegisterError.textContent = "";
    return;
  }

  adminRegisterError.textContent = message;
  adminRegisterStatus.textContent = "";
}

function isGateUnlocked() {
  return window.sessionStorage.getItem(GATE_SESSION_KEY) === "true";
}

function savedSharedCode() {
  return window.sessionStorage.getItem(GATE_SHARED_CODE_KEY) || "";
}

function savedCoupleTitle() {
  return window.sessionStorage.getItem(GATE_COUPLE_TITLE_KEY) || "";
}

function saveUnlockedCouple(sharedCode, coupleTitle) {
  window.sessionStorage.setItem(GATE_SESSION_KEY, "true");
  window.sessionStorage.setItem(GATE_SHARED_CODE_KEY, sharedCode);
  window.sessionStorage.setItem(GATE_COUPLE_TITLE_KEY, coupleTitle);
}

function clearUnlockedCouple() {
  window.sessionStorage.removeItem(GATE_SESSION_KEY);
  window.sessionStorage.removeItem(GATE_SHARED_CODE_KEY);
  window.sessionStorage.removeItem(GATE_COUPLE_TITLE_KEY);
}

function updateGateNames(name = "") {
  gateNames.textContent = name || DEFAULT_GATE_NAMES;
}

function setAdminMode(enabled) {
  currentIsAdmin = enabled;
  adminSection.classList.toggle("hidden", !enabled);
  document.querySelectorAll(".couple-only").forEach((node) => {
    node.classList.toggle("hidden", enabled);
  });
}

function setAdminAccessExpanded(expanded) {
  adminForm.classList.toggle("hidden", !expanded);
  adminAccessToggle.textContent = expanded ? "Hide admin access" : "Register admin";
}

function resetAdminAccessForms() {
  adminForm.reset();
  adminRegisterForm.reset();
  setAdminMessage("");
  setAdminRegisterMessage("");
}

function setInviteStatus(message = "", type = "muted") {
  inviteStatus.textContent = message;
  inviteStatus.style.color = type === "error" ? "#9c3147" : type === "success" ? "#2f6c50" : "";
}

function setExportStatus(message = "", type = "muted") {
  exportStatus.textContent = message;
  exportStatus.style.color = type === "error" ? "#9c3147" : type === "success" ? "#2f6c50" : "";
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMonthDay(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function slugifyCode(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function validateStrongPhrase(phrase) {
  if (phrase.length < 14) return "Make the phrase at least 14 characters long.";
  if (!/[a-z]/.test(phrase) || !/[A-Z]/.test(phrase)) return "Use both lowercase and uppercase letters.";
  if (!/\d/.test(phrase)) return "Add at least one number.";
  if (!/[^A-Za-z0-9]/.test(phrase)) return "Add at least one symbol like !, #, or ?.";
  return "";
}

function sanitizeFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function renderEmptyState(message = "No saved memories yet. Add your first one and start your archive.") {
  memoryList.innerHTML = `<div class="memory-empty">${message}</div>`;
}

function renderAdminCouples(couples) {
  adminCoupleList.innerHTML = "";
  if (!couples.length) {
    adminCoupleList.innerHTML = '<div class="memory-empty">No couple spaces found yet.</div>';
    return;
  }

  couples.forEach((couple) => {
    const node = document.createElement("article");
    node.className = "memory-entry";
    node.innerHTML = `
      <div class="memory-entry-top">
        <strong>${escapeHtml(couple.couple_title || couple.shared_code)}</strong>
        <span>${escapeHtml(couple.shared_code)}</span>
      </div>
      <p class="memory-meta">Members: ${couple.profile_count} | Memories: ${couple.memory_count} | Letters: ${couple.letter_count}</p>
    `;
    adminCoupleList.appendChild(node);
  });
}

function renderAdminMemories(memories) {
  adminMemoryList.innerHTML = "";
  if (!memories.length) {
    adminMemoryList.innerHTML = '<div class="memory-empty">No recent submissions yet.</div>';
    return;
  }

  memories.forEach((memory) => {
    const node = document.createElement("article");
    node.className = "memory-entry";
    node.innerHTML = `
      <div class="memory-entry-top">
        <strong>${escapeHtml(memory.title)}</strong>
        <span>${escapeHtml(memory.shared_code)}</span>
      </div>
      <p class="memory-description">${escapeHtml(memory.description || "")}</p>
      <p class="memory-meta">By ${escapeHtml(memory.author_name || "Unknown")} | ${formatDate(memory.memory_date)}</p>
      <div class="memory-actions">
        <button class="clear-button admin-delete-memory" type="button">Delete submission</button>
      </div>
    `;
    node.querySelector(".admin-delete-memory").addEventListener("click", async () => {
      try {
        await deleteMemoryAsAdmin(memory.id);
        await loadAdminData();
      } catch (error) {
        setAdminMessage(error.message || "Could not delete that submission.");
      }
    });
    adminMemoryList.appendChild(node);
  });
}

function animateStats() {
  stats.forEach((stat) => {
    if (stat.dataset.animated === "true") return;
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

function resetMemoryForm() {
  editingMemoryId = "";
  memoryForm.reset();
  document.getElementById("memory-id").value = "";
  document.getElementById("is-pinned").checked = false;
  saveMemoryButton.textContent = "Save memory";
}

function resetMilestoneForm() {
  editingMilestoneId = "";
  milestoneForm.reset();
  document.getElementById("milestone-id").value = "";
  document.getElementById("save-milestone").textContent = "Save milestone";
}

function signedInUserName() {
  return currentProfile?.display_name || "one of you";
}

async function findCoupleSpaceByPhrase(phrase) {
  const { data, error } = await supabaseClient.rpc("verify_couple_phrase", {
    input_phrase: phrase,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

async function findCoupleSpaceByCode(sharedCode) {
  const { data, error } = await supabaseClient.rpc("find_couple_space_by_code", {
    input_shared_code: sharedCode,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

async function createInviteLinkForCurrentCouple() {
  const { data, error } = await supabaseClient.rpc("create_couple_invite", {
    input_shared_code: currentProfile.shared_code,
    input_expires_hours: 72,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

async function claimInviteToken(token) {
  const { data, error } = await supabaseClient.rpc("claim_couple_invite", {
    input_token: token,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

async function fetchAdminOverview() {
  const { data, error } = await supabaseClient.rpc("admin_site_overview");
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

async function fetchAdminCouples() {
  const { data, error } = await supabaseClient.rpc("admin_couple_spaces");
  if (error) throw error;
  return data || [];
}

async function fetchAdminRecentMemories() {
  const { data, error } = await supabaseClient.rpc("admin_recent_memories");
  if (error) throw error;
  return data || [];
}

async function checkAdminAccess() {
  const { data, error } = await supabaseClient.rpc("current_is_admin");
  if (error) throw error;
  return Boolean(data);
}

async function adminSignupAllowed(email) {
  const { data, error } = await supabaseClient.rpc("admin_signup_allowed", {
    input_email: email,
  });
  if (error) throw error;
  return Boolean(data);
}

async function deleteMemoryAsAdmin(memoryId) {
  const { error } = await supabaseClient.rpc("admin_delete_memory", {
    input_memory_id: memoryId,
  });
  if (error) throw error;
}

async function createSignedUrls(paths) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  const urlMap = new Map();
  if (!uniquePaths.length) return urlMap;

  await Promise.all(
    uniquePaths.map(async (path) => {
      const { data } = await supabaseClient.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60);
      urlMap.set(path, data?.signedUrl || "");
    })
  );

  return urlMap;
}

function memoryPhotos(memory) {
  const photos = Array.isArray(memory.photo_paths) ? memory.photo_paths : [];
  if (photos.length) return photos;
  return memory.photo_path ? [memory.photo_path] : [];
}

function updateFilterOptions(memories) {
  const categories = [...new Set(memories.map((memory) => memory.category).filter(Boolean))];
  const albums = [...new Set(memories.map((memory) => memory.album_name).filter(Boolean))];

  filterCategory.innerHTML = '<option value="">All categories</option>';
  categories.forEach((category) => {
    filterCategory.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`);
  });

  filterAlbum.innerHTML = '<option value="">All albums</option>';
  albums.forEach((album) => {
    filterAlbum.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(album)}">${escapeHtml(album)}</option>`);
  });
}

function filteredMemories() {
  const query = searchInput.value.trim().toLowerCase();
  const category = filterCategory.value;
  const album = filterAlbum.value;
  const view = filterView.value;

  return [...currentMemories]
    .filter((memory) => {
      if (category && memory.category !== category) return false;
      if (album && memory.album_name !== album) return false;
      if (view === "favorites" && !memory.is_favorite) return false;
      if (view === "pinned" && !memory.is_pinned) return false;
      if (!query) return true;
      return [memory.title, memory.description, memory.album_name, memory.song_link, memory.author_name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.memory_date) - new Date(a.memory_date);
    });
}

function updateDashboard(memories) {
  const photoCount = memories.reduce((count, memory) => count + memoryPhotos(memory).length, 0);
  const favoriteCount = memories.filter((memory) => memory.is_favorite).length;
  const albumCount = new Set(memories.map((memory) => memory.album_name).filter(Boolean)).size;
  const latest = [...memories].sort((a, b) => new Date(b.memory_date) - new Date(a.memory_date))[0];

  dashboardMemories.textContent = String(memories.length);
  dashboardPhotos.textContent = String(photoCount);
  dashboardFavorites.textContent = String(favoriteCount);
  dashboardAlbums.textContent = String(albumCount);
  profileMemoryCount.textContent = String(memories.length);
  profilePinnedCount.textContent = String(memories.filter((memory) => memory.is_pinned).length);

  if (!latest) {
    dashboardLatestTitle.textContent = "Nothing saved yet";
    dashboardLatestMeta.textContent = "Once you add a memory, your newest story will appear here.";
    return;
  }

  dashboardLatestTitle.textContent = latest.title;
  dashboardLatestMeta.textContent = `${formatDate(latest.memory_date)} | added by ${latest.author_name}`;
}

function renderFlashback(memories) {
  flashbackDateLabel.textContent = "Today in your story";
  flashbackList.innerHTML = "";
  const todayKey = formatMonthDay(new Date().toISOString().slice(0, 10));
  const matches = memories.filter((memory) => formatMonthDay(memory.memory_date) === todayKey);

  if (!matches.length) {
    flashbackTitle.textContent = "No flashback yet";
    flashbackDescription.textContent = "Memories from this same date in past years will appear here automatically.";
    return;
  }

  flashbackTitle.textContent = `${matches.length} memory${matches.length > 1 ? "ies" : ""} from this date`;
  flashbackDescription.textContent = "Same day, different year. A small reminder that your story already has its own seasons.";
  matches.slice(0, 3).forEach((memory) => {
    const item = document.createElement("article");
    item.className = "flashback-item";
    item.innerHTML = `<p class="timeline-date">${formatDate(memory.memory_date)}</p><h4>${escapeHtml(memory.title)}</h4><p>${escapeHtml(memory.description)}</p>`;
    flashbackList.appendChild(item);
  });
}

function renderReminders() {
  reminderList.innerHTML = "";
  const reminderDays = Number(currentProfile?.reminder_days || 7);
  const now = new Date();
  const items = [];

  if (currentProfile?.anniversary_date) {
    const anniversary = new Date(currentProfile.anniversary_date);
    anniversary.setFullYear(now.getFullYear());
    if (anniversary < now) anniversary.setFullYear(now.getFullYear() + 1);
    const daysUntil = Math.ceil((anniversary - now) / 86400000);
    profileAnniversaryDays.textContent = String(Math.max(daysUntil, 0));
    if (daysUntil <= reminderDays) {
      items.push({ label: "Anniversary", text: `Your anniversary is in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.` });
    }
  } else {
    profileAnniversaryDays.textContent = "0";
  }

  currentMilestones.forEach((milestone) => {
    const date = new Date(milestone.milestone_date);
    date.setFullYear(now.getFullYear());
    if (date < now) date.setFullYear(now.getFullYear() + 1);
    const daysUntil = Math.ceil((date - now) / 86400000);
    if (daysUntil <= reminderDays) {
      items.push({ label: "Milestone", text: `${milestone.title} is coming up in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.` });
    }
  });

  if (!items.length) {
    reminderList.innerHTML = '<div class="memory-empty">No upcoming reminders inside your current reminder window.</div>';
    return;
  }

  items.forEach((item) => {
    reminderList.insertAdjacentHTML("beforeend", `<article class="flashback-item"><p class="timeline-date">${item.label}</p><p>${escapeHtml(item.text)}</p></article>`);
  });
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startWeekday = monthStart.getDay();
  const totalDays = monthEnd.getDate();

  calendarTitle.textContent = monthStart.toLocaleDateString("en", { month: "long", year: "numeric" });
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((day) => {
    calendarGrid.insertAdjacentHTML("beforeend", `<div class="calendar-head">${day}</div>`);
  });

  for (let i = 0; i < startWeekday; i += 1) {
    calendarGrid.insertAdjacentHTML("beforeend", '<div class="calendar-day muted"></div>');
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const dateKey = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().slice(0, 10);
    const matches = currentMemories.filter((memory) => memory.memory_date === dateKey);
    const milestoneMatches = currentMilestones.filter((milestone) => milestone.milestone_date === dateKey);
    calendarGrid.insertAdjacentHTML(
      "beforeend",
      `<div class="calendar-day${matches.length || milestoneMatches.length ? " active" : ""}"><strong>${day}</strong>${matches.slice(0, 2).map((memory) => `<span>${escapeHtml(memory.title)}</span>`).join("")}${milestoneMatches.slice(0, 1).map((milestone) => `<span>${escapeHtml(milestone.title)}</span>`).join("")}</div>`
    );
  }
}

function renderMilestones() {
  milestoneList.innerHTML = "";
  if (!currentMilestones.length) {
    milestoneList.innerHTML = '<div class="memory-empty">No milestones yet. Save your first chapter above.</div>';
    return;
  }

  [...currentMilestones].sort((a, b) => new Date(a.milestone_date) - new Date(b.milestone_date)).forEach((milestone) => {
    const node = milestoneTemplate.content.cloneNode(true);
    node.querySelector(".milestone-date").textContent = formatDate(milestone.milestone_date);
    node.querySelector(".milestone-title").textContent = milestone.title;
    node.querySelector(".milestone-description").textContent = milestone.description || "A small marker in your timeline.";
    node.querySelector(".milestone-edit").addEventListener("click", () => startMilestoneEdit(milestone));
    node.querySelector(".milestone-delete").addEventListener("click", () => deleteMilestone(milestone.id));
    milestoneList.appendChild(node);
  });
}

function renderLetters() {
  letterList.innerHTML = "";
  profileLetterCount.textContent = String(currentLetters.length);
  if (!currentLetters.length) {
    letterList.innerHTML = '<div class="memory-empty">No private letters yet. Write one below.</div>';
    return;
  }

  [...currentLetters].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).forEach((letter) => {
    const node = letterTemplate.content.cloneNode(true);
    node.querySelector(".letter-recipient").textContent = `For ${letter.recipient_name}`;
    node.querySelector(".letter-title").textContent = letter.title;
    node.querySelector(".letter-meta").textContent = `From ${letter.author_name} | ${new Date(letter.created_at).toLocaleDateString()}`;
    const body = node.querySelector(".letter-body");
    body.textContent = letter.body;
    const button = node.querySelector(".letter-toggle");
    button.addEventListener("click", async () => {
      const hidden = body.classList.toggle("hidden");
      button.textContent = hidden ? "Open" : "Hide";
      if (!hidden && !letter.is_opened) {
        await supabaseClient.from("private_letters").update({ is_opened: true }).eq("id", letter.id);
      }
    });
    letterList.appendChild(node);
  });
}

function renderComments(listNode, comments) {
  listNode.innerHTML = "";
  if (!comments.length) {
    listNode.innerHTML = '<div class="comment-item"><p>No notes yet. Leave the first one.</p></div>';
    return;
  }

  comments.forEach((comment) => {
    listNode.insertAdjacentHTML("beforeend", `<div class="comment-item"><span>${escapeHtml(comment.author_name)}</span><p>${escapeHtml(comment.body)}</p></div>`);
  });
}

async function renderMemories(memories) {
  memoryList.innerHTML = "";
  if (!memories.length) {
    renderEmptyState();
    return;
  }

  const signedUrls = await createSignedUrls(memories.flatMap((memory) => memoryPhotos(memory)));
  memories.forEach((memory) => {
    const node = template.content.cloneNode(true);
    node.querySelector(".memory-category").textContent = memory.category;
    node.querySelector(".memory-date").textContent = formatDate(memory.memory_date);
    node.querySelector(".memory-date").dateTime = memory.memory_date;
    node.querySelector(".memory-title").textContent = memory.title;
    node.querySelector(".memory-description").textContent = memory.description;
    node.querySelector(".memory-meta").textContent = `Added by ${memory.author_name || "one of you"}`;

    const pin = node.querySelector(".memory-pin");
    pin.classList.toggle("hidden", !memory.is_pinned);

    const albumBadge = node.querySelector(".memory-album");
    if (memory.album_name) {
      albumBadge.textContent = memory.album_name;
      albumBadge.classList.remove("hidden");
    }

    const song = node.querySelector(".memory-song");
    if (memory.song_link) {
      song.href = memory.song_link;
      song.classList.remove("hidden");
    }

    const gallery = node.querySelector(".memory-gallery");
    memoryPhotos(memory).forEach((path) => {
      const url = signedUrls.get(path);
      if (url) {
        gallery.insertAdjacentHTML("beforeend", `<img class="memory-image" src="${url}" alt="Saved memory photo" />`);
      }
    });

    const favoriteButton = node.querySelector(".favorite-button");
    favoriteButton.textContent = memory.is_favorite ? "Favorited" : "Favorite";
    favoriteButton.classList.toggle("active", Boolean(memory.is_favorite));
    favoriteButton.addEventListener("click", () => toggleMemoryFlag(memory.id, "is_favorite", !memory.is_favorite, memory.is_favorite ? "Memory removed from favorites." : "Memory added to favorites."));

    const pinToggle = node.querySelector(".pin-toggle");
    pinToggle.classList.toggle("active", Boolean(memory.is_pinned));
    pinToggle.textContent = memory.is_pinned ? "Pinned" : "Pin";
    pinToggle.addEventListener("click", () => toggleMemoryFlag(memory.id, "is_pinned", !memory.is_pinned, memory.is_pinned ? "Memory unpinned." : "Memory pinned."));

    node.querySelector(".edit-button").addEventListener("click", () => startMemoryEdit(memory));
    node.querySelector(".delete-button").addEventListener("click", () => deleteMemory(memory.id));

    const reactions = reactionsByMemory.get(memory.id) || {};
    node.querySelectorAll(".reaction-button").forEach((button) => {
      const reaction = button.dataset.reaction;
      const data = reactions[reaction] || { count: 0, active: false };
      button.querySelector("span").textContent = String(data.count);
      button.classList.toggle("active", data.active);
      button.addEventListener("click", () => toggleReaction(memory.id, reaction, data.active));
    });

    renderComments(node.querySelector(".comment-list"), commentsByMemory.get(memory.id) || []);
    node.querySelector(".comment-form").addEventListener("submit", (event) => handleCommentSubmit(event, memory.id));
    memoryList.appendChild(node);
  });
}

function populateProfileForm() {
  document.getElementById("couple-title").value = currentProfile?.couple_title || "";
  document.getElementById("partner-names").value = currentProfile?.partner_names || "";
  document.getElementById("anniversary-date").value = currentProfile?.anniversary_date || "";
  document.getElementById("hero-quote-input").value = currentProfile?.hero_quote || "";
  document.getElementById("reminder-days").value = currentProfile?.reminder_days || 7;

  brandTitle.textContent = currentProfile?.couple_title || "Our Storybook";
  heroTitle.textContent = currentProfile?.partner_names || "Keep your best moments, milestones, and rituals beautifully in sync.";
  heroQuote.textContent = currentProfile?.hero_quote || "Built like a scrapbook and a journal at the same time, this little website lets you celebrate what already happened and keep adding to your story as it grows.";
  profileSummary.textContent = currentProfile?.partner_names ? `${currentProfile.partner_names}${currentProfile.anniversary_date ? ` | Anniversary ${formatDate(currentProfile.anniversary_date)}` : ""}` : "Set your names, anniversary, and couple quote below.";
  securitySummary.textContent = currentProfile?.shared_code
    ? `Your shared code "${currentProfile.shared_code}" uses a reserved phrase verified on the server before anyone can enter this archive.`
    : "Your couple phrase is protected with server-side hashing and unique reservation checks.";
}

async function loadProfile(userId) {
  let { data, error } = await supabaseClient.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (!data) {
    const metadata = currentSession?.user?.user_metadata || {};
    const email = currentSession?.user?.email || "";
    const displayName = String(
      metadata.display_name ||
      metadata.full_name ||
      authDisplayNameInput.value.trim() ||
      email.split("@")[0] ||
      "Admin"
    ).trim();
    const sharedCode = slugifyCode(
      String(
        metadata.shared_code ||
        savedSharedCode() ||
        authSharedCodeInput.value ||
        "our-story"
      )
    ) || "our-story";
    const coupleTitle = String(metadata.couple_title || savedCoupleTitle() || "").trim();

    const insertResult = await supabaseClient.from("profiles").insert({
      id: userId,
      display_name: displayName,
      shared_code: sharedCode,
      couple_title: coupleTitle || null,
    });

    if (insertResult.error) {
      throw insertResult.error;
    }

    ({ data, error } = await supabaseClient.from("profiles").select("*").eq("id", userId).single());
  }

  if (error) throw error;
  currentProfile = data;
  userChip.textContent = `${data.display_name} | ${data.shared_code}`;
  memorySubtitle.textContent = `Synced across space: ${data.shared_code}`;
  authSharedCodeInput.value = data.shared_code;
  saveUnlockedCouple(data.shared_code, data.couple_title || data.partner_names || "");
  updateGateNames(data.couple_title || data.partner_names || "");
  populateProfileForm();
}

async function fetchComments(memoryIds) {
  commentsByMemory = new Map();
  if (!memoryIds.length) return;
  const { data } = await supabaseClient
    .from("memory_comments")
    .select("memory_id, author_name, body, created_at")
    .in("memory_id", memoryIds)
    .order("created_at", { ascending: true });

  (data || []).forEach((comment) => {
    const list = commentsByMemory.get(comment.memory_id) || [];
    list.push(comment);
    commentsByMemory.set(comment.memory_id, list);
  });
}

async function fetchReactions(memoryIds) {
  reactionsByMemory = new Map();
  if (!memoryIds.length) return;
  const { data } = await supabaseClient
    .from("memory_reactions")
    .select("memory_id, owner_id, reaction")
    .in("memory_id", memoryIds);

  (data || []).forEach((row) => {
    const byMemory = reactionsByMemory.get(row.memory_id) || {};
    const entry = byMemory[row.reaction] || { count: 0, active: false };
    entry.count += 1;
    if (row.owner_id === currentSession?.user.id) entry.active = true;
    byMemory[row.reaction] = entry;
    reactionsByMemory.set(row.memory_id, byMemory);
  });
}

async function fetchMilestones() {
  const { data } = await supabaseClient
    .from("milestones")
    .select("*")
    .eq("couple_code", currentProfile.shared_code)
    .order("milestone_date", { ascending: true });
  currentMilestones = data || [];
}

async function fetchLetters() {
  const { data } = await supabaseClient
    .from("private_letters")
    .select("*")
    .eq("couple_code", currentProfile.shared_code)
    .order("created_at", { ascending: false });
  currentLetters = data || [];
}

async function fetchMemories() {
  if (!currentProfile) {
    renderEmptyState("Sign in to load your shared memory vault.");
    return;
  }

  setFeedback("Loading memories...");
  const { data, error } = await supabaseClient
    .from("memories")
    .select("id, title, description, category, memory_date, photo_path, photo_paths, author_name, created_at, is_favorite, is_pinned, album_name, song_link")
    .eq("couple_code", currentProfile.shared_code)
    .order("is_pinned", { ascending: false })
    .order("memory_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    setFeedback(error.message, "error");
    renderEmptyState("Could not load memories yet.");
    return;
  }

  currentMemories = data || [];
  await Promise.all([
    fetchComments(currentMemories.map((memory) => memory.id)),
    fetchReactions(currentMemories.map((memory) => memory.id)),
    fetchMilestones(),
    fetchLetters(),
  ]);

  updateFilterOptions(currentMemories);
  updateDashboard(currentMemories);
  renderFlashback(currentMemories);
  renderCalendar();
  renderMilestones();
  renderLetters();
  renderReminders();
  await renderMemories(filteredMemories());
  setFeedback(currentMemories.length ? "Everything is up to date." : "No memories yet. Add the first one.");
}

async function clearChannels() {
  await Promise.all(channels.map((channel) => supabaseClient.removeChannel(channel)));
  channels = [];
}

async function subscribeToChanges() {
  if (!currentProfile) return;
  await clearChannels();
  ["memories", "memory_comments", "memory_reactions", "milestones", "private_letters", "profiles"].forEach((table) => {
    const channel = supabaseClient
      .channel(`${table}:${currentProfile.shared_code}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        fetchMemories();
      })
      .subscribe();
    channels.push(channel);
  });
}

async function uploadPhoto(file) {
  const filePath = `${currentProfile.shared_code}/${currentSession.user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabaseClient.storage.from(PHOTO_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return filePath;
}

async function toggleMemoryFlag(memoryId, field, value, message) {
  const { error } = await supabaseClient.from("memories").update({ [field]: value }).eq("id", memoryId);
  if (error) {
    setFeedback(error.message, "error");
    return;
  }
  setFeedback(message, "success");
  await fetchMemories();
}

async function toggleReaction(memoryId, reaction, isActive) {
  if (isActive) {
    await supabaseClient
      .from("memory_reactions")
      .delete()
      .eq("memory_id", memoryId)
      .eq("owner_id", currentSession.user.id)
      .eq("reaction", reaction);
  } else {
    await supabaseClient.from("memory_reactions").upsert(
      {
        memory_id: memoryId,
        owner_id: currentSession.user.id,
        couple_code: currentProfile.shared_code,
        author_name: signedInUserName(),
        reaction,
      },
      { onConflict: "memory_id,owner_id,reaction" }
    );
  }
  await fetchMemories();
}

async function handleCommentSubmit(event, memoryId) {
  event.preventDefault();
  const input = event.currentTarget.querySelector(".comment-input");
  const body = input.value.trim();
  if (!body) return;

  const { error } = await supabaseClient.from("memory_comments").insert({
    memory_id: memoryId,
    couple_code: currentProfile.shared_code,
    owner_id: currentSession.user.id,
    author_name: signedInUserName(),
    body,
  });

  if (error) {
    setFeedback(error.message, "error");
    return;
  }
  input.value = "";
  setFeedback("Comment added to the memory.", "success");
  await fetchMemories();
}

function startMemoryEdit(memory) {
  editingMemoryId = memory.id;
  document.getElementById("memory-id").value = memory.id;
  document.getElementById("title").value = memory.title;
  document.getElementById("date").value = memory.memory_date;
  document.getElementById("category").value = memory.category;
  document.getElementById("album-name").value = memory.album_name || "";
  document.getElementById("song-link").value = memory.song_link || "";
  document.getElementById("description").value = memory.description;
  document.getElementById("is-pinned").checked = Boolean(memory.is_pinned);
  saveMemoryButton.textContent = "Update memory";
  memoryForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteMemory(memoryId) {
  const { error } = await supabaseClient.from("memories").delete().eq("id", memoryId);
  if (error) {
    setFeedback(error.message, "error");
    return;
  }
  if (editingMemoryId === memoryId) resetMemoryForm();
  setFeedback("Memory deleted.", "success");
  await fetchMemories();
}

function startMilestoneEdit(milestone) {
  editingMilestoneId = milestone.id;
  document.getElementById("milestone-id").value = milestone.id;
  document.getElementById("milestone-title").value = milestone.title;
  document.getElementById("milestone-date").value = milestone.milestone_date;
  document.getElementById("milestone-description").value = milestone.description || "";
  document.getElementById("save-milestone").textContent = "Update milestone";
}

async function deleteMilestone(milestoneId) {
  await supabaseClient.from("milestones").delete().eq("id", milestoneId);
  await fetchMemories();
}

async function handleGenerateInvite() {
  if (!currentProfile || !currentSession) {
    setInviteStatus("Sign in before creating an invite link.", "error");
    return;
  }

  setInviteStatus("Creating invite link...", "success");
  try {
    const invite = await createInviteLinkForCurrentCouple();
    activeInviteToken = invite?.token || "";
    const inviteLink = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(activeInviteToken)}`;
    inviteLinkInput.value = inviteLink;
    setInviteStatus("Invite link created. Share it privately with your partner.", "success");
  } catch (error) {
    setInviteStatus(error.message || "Could not create an invite link yet.", "error");
  }
}

async function handleCopyInvite() {
  if (!inviteLinkInput.value) {
    setInviteStatus("Create an invite link first.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(inviteLinkInput.value);
    setInviteStatus("Invite link copied.", "success");
  } catch (_error) {
    inviteLinkInput.select();
    setInviteStatus("Copy failed automatically. The link is highlighted for manual copy.", "error");
  }
}

function handleExportBackup() {
  if (!currentProfile || !currentSession) {
    setExportStatus("Sign in before exporting your archive.", "error");
    return;
  }

  const backup = {
    exported_at: new Date().toISOString(),
    couple_profile: currentProfile,
    memories: currentMemories,
    milestones: currentMilestones,
    private_letters: currentLetters,
    comments_by_memory: Object.fromEntries(commentsByMemory),
    reactions_by_memory: Object.fromEntries(reactionsByMemory),
  };

  const fileName = `${currentProfile.shared_code || "storybook"}-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setExportStatus("Backup downloaded.", "success");
}

async function loadAdminData() {
  const [overview, couples, memories] = await Promise.all([
    fetchAdminOverview(),
    fetchAdminCouples(),
    fetchAdminRecentMemories(),
  ]);

  adminTotalCouples.textContent = String(overview?.total_couples || 0);
  adminTotalProfiles.textContent = String(overview?.total_profiles || 0);
  adminTotalMemories.textContent = String(overview?.total_memories || 0);
  adminTotalLetters.textContent = String(overview?.total_letters || 0);
  renderAdminCouples(couples);
  renderAdminMemories(memories);
}

async function handlePhraseUnlock(event) {
  event.preventDefault();
  if (!supabaseClient) {
    setGateMessage("Supabase is still required to verify your reserved phrase.");
    return;
  }
  const phrase = sharedPassphraseInput.value.trim();
  if (!phrase) {
    setGateMessage("Enter your shared phrase first.");
    return;
  }
  let reservedSpace;
  try {
    reservedSpace = await findCoupleSpaceByPhrase(phrase);
  } catch (error) {
    setGateMessage(error.message || "We could not verify that phrase right now.");
    return;
  }

  if (!reservedSpace?.shared_code) {
    setGateMessage("That phrase is not registered yet.");
    return;
  }

  saveUnlockedCouple(reservedSpace.shared_code, reservedSpace.couple_title || "");
  authSharedCodeInput.value = reservedSpace.shared_code;
  updateGateNames(reservedSpace.couple_title || "");
  setGateMessage("");
  phraseForm.reset();
  await applyGateUnlock();
}

async function handleRegisterPhrase(event) {
  event.preventDefault();
  if (!supabaseClient) {
    setRegisterMessage("Supabase is required to reserve a unique couple phrase.");
    return;
  }

  const coupleTitle = registerCoupleTitleInput.value.trim();
  const sharedCode = slugifyCode(registerSharedCodeInput.value);
  const phrase = registerPassphraseInput.value.trim();
  const confirmPhrase = registerPassphraseConfirmInput.value.trim();

  if (!coupleTitle || !sharedCode || !phrase || !confirmPhrase) {
    setRegisterMessage("Fill in every field before reserving your phrase.");
    return;
  }

  if (sharedCode.length < 4) {
    setRegisterMessage("Choose a shared space code with at least 4 characters.");
    return;
  }

  const phraseStrengthError = validateStrongPhrase(phrase);
  if (phraseStrengthError) {
    setRegisterMessage(phraseStrengthError);
    return;
  }

  if (phrase !== confirmPhrase) {
    setRegisterMessage("The two phrase fields do not match.");
    return;
  }

  setRegisterMessage("", "success");
  registerStatus.textContent = "Reserving your couple phrase...";

  const { data, error } = await supabaseClient.rpc("reserve_couple_space", {
    input_shared_code: sharedCode,
    input_phrase: phrase,
    input_couple_title: coupleTitle,
  });

  if (error) {
    setRegisterMessage(error.message || "We could not reserve that phrase.");
    return;
  }

  const reservedSpace = Array.isArray(data) ? data[0] : data;
  saveUnlockedCouple(reservedSpace?.shared_code || sharedCode, reservedSpace?.couple_title || coupleTitle);
  authSharedCodeInput.value = reservedSpace?.shared_code || sharedCode;
  registerForm.reset();
  updateGateNames(reservedSpace?.couple_title || coupleTitle);
  setRegisterMessage("Your couple phrase is reserved. Create your accounts below using the same shared code.", "success");
  setGateMessage("Your phrase is now reserved. Use it on both devices to open this space.", "success");
}

async function handleSignOut() {
  clearUnlockedCouple();
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  setUnlockedState(false);
  setAuthMessage("");
  resetAdminAccessForms();
  setInviteStatus("");
  setExportStatus("");
  inviteLinkInput.value = "";
  updateGateNames("");
  setAdminAccessExpanded(false);
  sharedPassphraseInput.focus();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!supabaseClient) {
    setAuthMessage("Add your Supabase URL and anon key in script.js first.");
    return;
  }

  const action = event.submitter?.dataset.authAction || "signin";
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  const displayName = authDisplayNameInput.value.trim();
  const sharedCode = slugifyCode(authSharedCodeInput.value);

  if (!email || !password) {
    setAuthMessage("Enter your email and password first.");
    return;
  }

  if (action === "signup" && (!displayName || !sharedCode)) {
    setAuthMessage("Add a display name and shared space code before creating an account.");
    return;
  }

  if (action === "signup") {
    let reservedSpace;
    try {
      reservedSpace = await findCoupleSpaceByCode(sharedCode);
    } catch (error) {
      setAuthMessage(error.message || "We could not verify that shared space code.");
      return;
    }
    if (!reservedSpace?.shared_code) {
      setAuthMessage("Reserve this shared space code first in the couple phrase panel above.");
      return;
    }
  }

  setAuthMessage("");
  authStatus.textContent = action === "signup" ? "Creating your account..." : "Signing you in...";

  if (action === "signup") {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          shared_code: sharedCode,
        },
      },
    });

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    if (!data.session) {
      setAuthMessage("Account created. Check your email inbox and confirm the link before signing in.", "success");
      authPasswordInput.value = "";
      return;
    }

    setAuthMessage(
      isGateUnlocked()
        ? "Account created and signed in. Opening your storybook now."
        : "Account created and signed in. Enter your shared phrase to open the storybook.",
      "success"
    );
    if (isGateUnlocked()) {
      await applySession(data.session);
    }
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setAuthMessage(error.message);
    return;
  }

  setAuthMessage(
    isGateUnlocked()
      ? "Signed in successfully. Opening your storybook now."
      : "Signed in successfully. Enter your shared phrase to open the storybook.",
    "success"
  );
  if (isGateUnlocked()) {
    await applySession(data.session);
  }
}

async function handleAdminSubmit(event) {
  event.preventDefault();
  if (!supabaseClient) {
    setAdminMessage("Supabase is required for admin login.");
    return;
  }

  const action = event.submitter?.dataset.adminAction || "signin";
  const email = adminEmailInput.value.trim();
  const password = adminPasswordInput.value;
  if (!email || !password) {
    setAdminMessage("Enter your admin email and password.");
    return;
  }

  setAdminMessage("", "success");
  adminStatus.textContent = action === "signup" ? "Creating your admin account..." : "Signing in to the admin panel...";

  if (action === "signup") {
    const { data: allowed, error: allowedError } = await supabaseClient.rpc("admin_signup_allowed", {
      input_email: email,
    });

    if (allowedError) {
      setAdminMessage(allowedError.message || "We could not verify whether this email can become an admin.");
      return;
    }

    if (!allowed) {
      setAdminMessage("This email is not allowed to register as an admin.");
      return;
    }

    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          admin_registration: true,
          display_name: "Admin",
        },
      },
    });

    if (signUpError) {
      setAdminMessage(signUpError.message);
      return;
    }

    if (!signUpData.session) {
      setAdminMessage("Admin account created. Confirm the email first, then use Open admin panel.", "success");
      adminPasswordInput.value = "";
      return;
    }
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setAdminMessage(error.message);
    return;
  }

  let isAdmin = false;
  try {
    isAdmin = await checkAdminAccess();
  } catch (accessError) {
    await supabaseClient.auth.signOut();
    setAdminMessage(accessError.message || "Admin checks are not ready yet. Run the latest SQL file first.");
    return;
  }

  if (!isAdmin) {
    await supabaseClient.auth.signOut();
    setAdminMessage("This account is not allowed to open the admin panel.");
    return;
  }

  clearUnlockedCouple();
  resetAdminAccessForms();
  setAdminMessage("Admin access granted.", "success");
  await applySession(data.session);
}

async function handleAdminRegister(event) {
  event.preventDefault();
  if (!supabaseClient) {
    setAdminRegisterMessage("Supabase is required for admin registration.");
    return;
  }

  const email = adminRegisterEmailInput.value.trim();
  const password = adminRegisterPasswordInput.value;
  const confirmPassword = adminRegisterPasswordConfirmInput.value;

  if (!email || !password || !confirmPassword) {
    setAdminRegisterMessage("Fill in every admin registration field first.");
    return;
  }

  if (password.length < 8) {
    setAdminRegisterMessage("Use at least 8 characters for the admin password.");
    return;
  }

  if (password !== confirmPassword) {
    setAdminRegisterMessage("The two admin password fields do not match.");
    return;
  }

  setAdminRegisterMessage("", "success");
  adminRegisterStatus.textContent = "Checking whether this email can register as admin...";

  let allowed = false;
  try {
    allowed = await adminSignupAllowed(email);
  } catch (error) {
    setAdminRegisterMessage(error.message || "Admin registration checks are not ready yet. Run the latest SQL file first.");
    return;
  }

  if (!allowed) {
    setAdminRegisterMessage("This email is not allowed to register as admin right now. If this is not the first admin, add the email to public.admin_users in Supabase first.");
    return;
  }

  adminRegisterStatus.textContent = "Creating your admin account...";

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: "Admin",
        admin_registration: true,
      },
    },
  });

  if (error) {
    setAdminRegisterMessage(error.message);
    return;
  }

  adminEmailInput.value = email;
  setAdminAccessExpanded(true);
  adminRegisterEmailInput.value = "";
  adminRegisterPasswordInput.value = "";
  adminRegisterPasswordConfirmInput.value = "";

  if (!data.session) {
    setAdminRegisterMessage("Admin account created. Check your email inbox, confirm the link, then sign in through the admin form.", "success");
    return;
  }

  let isAdmin = false;
  try {
    isAdmin = await checkAdminAccess();
  } catch (accessError) {
    await supabaseClient.auth.signOut();
    setAdminRegisterMessage(accessError.message || "Admin checks are not ready yet. Run the latest SQL file first.");
    return;
  }

  if (!isAdmin) {
    await supabaseClient.auth.signOut();
    setAdminRegisterMessage("Your account was created, but admin access is not ready for this email yet. Add it to public.admin_users or rerun the latest SQL file.");
    return;
  }

  clearUnlockedCouple();
  resetAdminAccessForms();
  setAdminRegisterMessage("Admin account created. Opening the admin panel now.", "success");
  await applySession(data.session);
}

async function handleProfileSave(event) {
  event.preventDefault();
  const payload = {
    couple_title: document.getElementById("couple-title").value.trim(),
    partner_names: document.getElementById("partner-names").value.trim(),
    anniversary_date: document.getElementById("anniversary-date").value || null,
    hero_quote: document.getElementById("hero-quote-input").value.trim(),
    reminder_days: Number(document.getElementById("reminder-days").value || 7),
  };

  const { error } = await supabaseClient.from("profiles").update(payload).eq("id", currentSession.user.id);
  if (error) {
    setFeedback(error.message, "error");
    return;
  }
  setFeedback("Profile updated.", "success");
  await loadProfile(currentSession.user.id);
  renderReminders();
}

async function handleMilestoneSave(event) {
  event.preventDefault();
  const payload = {
    couple_code: currentProfile.shared_code,
    owner_id: currentSession.user.id,
    title: document.getElementById("milestone-title").value.trim(),
    milestone_date: document.getElementById("milestone-date").value,
    description: document.getElementById("milestone-description").value.trim(),
  };
  const query = editingMilestoneId
    ? supabaseClient.from("milestones").update(payload).eq("id", editingMilestoneId)
    : supabaseClient.from("milestones").insert(payload);
  const { error } = await query;
  if (error) {
    setFeedback(error.message, "error");
    return;
  }
  resetMilestoneForm();
  setFeedback("Milestone saved.", "success");
  await fetchMemories();
}

async function handleLetterSave(event) {
  event.preventDefault();
  const payload = {
    couple_code: currentProfile.shared_code,
    owner_id: currentSession.user.id,
    author_name: signedInUserName(),
    recipient_name: document.getElementById("letter-recipient").value.trim(),
    title: document.getElementById("letter-title").value.trim(),
    body: document.getElementById("letter-body").value.trim(),
  };
  const { error } = await supabaseClient.from("private_letters").insert(payload);
  if (error) {
    setFeedback(error.message, "error");
    return;
  }
  letterForm.reset();
  setFeedback("Private letter saved.", "success");
  await fetchMemories();
}

async function handleMemorySave(event) {
  event.preventDefault();
  if (!currentSession || !currentProfile) {
    setFeedback("Sign in before saving a memory.", "error");
    return;
  }

  const formData = new FormData(memoryForm);
  const files = Array.from(formData.getAll("photo")).filter((item) => item instanceof File && item.size > 0);
  const payload = {
    owner_id: currentSession.user.id,
    couple_code: currentProfile.shared_code,
    author_name: signedInUserName(),
    title: formData.get("title").toString().trim(),
    memory_date: formData.get("date").toString(),
    category: formData.get("category").toString(),
    album_name: formData.get("album-name").toString().trim() || null,
    song_link: formData.get("song-link").toString().trim() || null,
    description: formData.get("description").toString().trim(),
    is_pinned: document.getElementById("is-pinned").checked,
  };

  if (!payload.title || !payload.memory_date || !payload.description) {
    setFeedback("Fill in the title, date, and story first.", "error");
    return;
  }

  saveMemoryButton.disabled = true;
  setFeedback(editingMemoryId ? "Updating memory..." : "Saving memory...", "success");

  try {
    const uploadedPaths = await Promise.all(files.map((file) => uploadPhoto(file)));
    if (editingMemoryId) {
      const existing = currentMemories.find((memory) => memory.id === editingMemoryId);
      payload.photo_paths = [...memoryPhotos(existing), ...uploadedPaths];
      const { error } = await supabaseClient.from("memories").update(payload).eq("id", editingMemoryId);
      if (error) throw error;
      setFeedback("Memory updated.", "success");
    } else {
      payload.photo_paths = uploadedPaths;
      payload.is_favorite = false;
      const { error } = await supabaseClient.from("memories").insert(payload);
      if (error) throw error;
      setFeedback("Memory saved to your shared vault.", "success");
    }
    resetMemoryForm();
    await fetchMemories();
  } catch (error) {
    setFeedback(error.message || "Could not save that memory.", "error");
  } finally {
    saveMemoryButton.disabled = false;
  }
}

async function applySession(session) {
  currentSession = session;
  if (!session) {
    currentIsAdmin = false;
    currentProfile = null;
    currentMemories = [];
    currentMilestones = [];
    currentLetters = [];
    commentsByMemory = new Map();
    reactionsByMemory = new Map();
    userChip.textContent = "Not signed in";
    memorySubtitle.textContent = "Synced across your shared space";
    brandTitle.textContent = "Our Storybook";
    heroTitle.textContent = "Keep your best moments, milestones, and rituals beautifully in sync.";
    heroQuote.textContent = "Built like a scrapbook and a journal at the same time, this little website lets you celebrate what already happened and keep adding to your story as it grows.";
    profileSummary.textContent = "Set your names, anniversary, and couple quote below.";
    profileAnniversaryDays.textContent = "0";
    profileMemoryCount.textContent = "0";
    profileLetterCount.textContent = "0";
    profilePinnedCount.textContent = "0";
    dashboardMemories.textContent = "0";
    dashboardPhotos.textContent = "0";
    dashboardFavorites.textContent = "0";
    dashboardAlbums.textContent = "0";
    dashboardLatestTitle.textContent = "Nothing saved yet";
    dashboardLatestMeta.textContent = "Once you add a memory, your newest story will appear here.";
    securitySummary.textContent = "Your couple phrase is protected with server-side hashing and unique reservation checks.";
    inviteLinkInput.value = "";
    setInviteStatus("");
    setExportStatus("");
    flashbackTitle.textContent = "No flashback yet";
    flashbackDescription.textContent = "Memories from this same date in past years will appear here automatically.";
    flashbackList.innerHTML = "";
    reminderList.innerHTML = "";
    milestoneList.innerHTML = "";
    letterList.innerHTML = "";
    setUnlockedState(false);
    setAdminMode(false);
    renderEmptyState("Sign in to open your shared memory vault.");
    if (supabaseClient) await clearChannels();
    return;
  }

  try {
    const isAdmin = await checkAdminAccess();
    if (isAdmin) {
      setAdminMode(true);
      resetAdminAccessForms();
      userChip.textContent = `${session.user.email || "Admin"} | admin`;
      setUnlockedState(true);
      await loadAdminData();
      adminSection.scrollIntoView({ behavior: "smooth", block: "start" });
      if (supabaseClient) await clearChannels();
      return;
    }

    setAdminMode(false);
    await loadProfile(session.user.id);
    setUnlockedState(true);
    await fetchMemories();
    await subscribeToChanges();
  } catch (_error) {
    setUnlockedState(false);
    setGateMessage("Your account exists, but the profile setup is missing. Run the updated SQL file first.");
  }
}

async function applyGateUnlock() {
  const unlocked = isGateUnlocked();
  if (!unlocked) {
    setUnlockedState(false);
    return;
  }

  if (!isConfigured) {
    setGateMessage("Supabase is still required for synced memories. Add your URL and key in script.js.");
    return;
  }

  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    const matchedCode = savedSharedCode();
    if (matchedCode) authSharedCodeInput.value = matchedCode;
    setGateMessage(
      matchedCode
        ? `Phrase accepted for ${matchedCode}. Create or sign in to your personal account below to sync the archive.`
        : "Your shared phrase is correct. Sign in or create an account in the panel beside it to load your cloud memories.",
      "success"
    );
    setUnlockedState(false);
    return;
  }

  await applySession(data.session);
}

async function applyInviteFromUrl() {
  if (!supabaseClient) return;
  const url = new URL(window.location.href);
  const inviteToken = url.searchParams.get("invite");
  if (!inviteToken) return;

  try {
    const invite = await claimInviteToken(inviteToken);
    if (invite?.shared_code) {
      authSharedCodeInput.value = invite.shared_code;
      registerSharedCodeInput.value = invite.shared_code;
      updateGateNames(invite.couple_title || "");
      setAuthMessage("Invite accepted. Finish creating or signing in to your personal account below.", "success");
      setGateMessage("Your invite is ready. Use the shared code already filled in below.", "success");
    }
  } catch (error) {
    setGateMessage(error.message || "That invite link is invalid or has expired.");
  } finally {
    url.searchParams.delete("invite");
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  }
}

if (!isConfigured) {
  configBanner.classList.remove("hidden");
  renderEmptyState("Add your Supabase configuration to start syncing real memories.");
} else {
  configBanner.classList.add("hidden");
}

renderEmptyState("Enter your shared phrase to open your storybook.");
updateGateNames(savedCoupleTitle());
authSharedCodeInput.value = savedSharedCode();
setAdminMode(false);
setAdminAccessExpanded(false);
phraseForm.addEventListener("submit", handlePhraseUnlock);
registerForm.addEventListener("submit", handleRegisterPhrase);
authForm.addEventListener("submit", handleAuthSubmit);
adminAccessToggle.addEventListener("click", () => {
  setAdminAccessExpanded(adminForm.classList.contains("hidden"));
});
adminForm.addEventListener("submit", handleAdminSubmit);
adminRegisterForm.addEventListener("submit", handleAdminRegister);
signOutButton.addEventListener("click", handleSignOut);
profileForm.addEventListener("submit", handleProfileSave);
milestoneForm.addEventListener("submit", handleMilestoneSave);
letterForm.addEventListener("submit", handleLetterSave);
memoryForm.addEventListener("submit", handleMemorySave);
cancelEditButton.addEventListener("click", resetMemoryForm);
refreshButton.addEventListener("click", fetchMemories);
searchInput.addEventListener("input", () => renderMemories(filteredMemories()));
filterCategory.addEventListener("change", () => renderMemories(filteredMemories()));
filterAlbum.addEventListener("change", () => renderMemories(filteredMemories()));
filterView.addEventListener("change", () => renderMemories(filteredMemories()));
calendarPrev.addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  renderCalendar();
});
calendarNext.addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  renderCalendar();
});
generateInviteButton.addEventListener("click", handleGenerateInvite);
copyInviteButton.addEventListener("click", handleCopyInvite);
exportBackupButton.addEventListener("click", handleExportBackup);

if (isConfigured) {
  applyInviteFromUrl();
  supabaseClient.auth.getSession().then(async ({ data }) => {
    if (!data.session) {
      await applyGateUnlock();
      return;
    }

    try {
      const isAdmin = await checkAdminAccess();
      if (isAdmin) {
        await applySession(data.session);
        return;
      }
    } catch (_error) {
      // Fall back to the normal couple flow below.
    }

    await applyGateUnlock();
  });
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (currentIsAdmin || window.sessionStorage.getItem(GATE_SESSION_KEY) === "true") {
      applySession(session);
    }
  });
}

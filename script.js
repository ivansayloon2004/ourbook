const SUPABASE_URL = "https://fpboqmodxbyczocpsldx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cNQtliKdzNAqIXvSllaM-Q_tWRKjOFx";
const PHOTO_BUCKET = "memory-photos";

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
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const registerNameInput = document.getElementById("register-name");
const registerEmailInput = document.getElementById("register-email");
const registerPasswordInput = document.getElementById("register-password");
const sharedCodeInput = document.getElementById("shared-code");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const registerStatus = document.getElementById("register-status");
const gateError = document.getElementById("gate-error");
const userChip = document.getElementById("user-chip");
const signOutButton = document.getElementById("sign-out");
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
  if (type === "error") {
    gateError.textContent = message;
    registerStatus.textContent = "";
    return;
  }
  registerStatus.textContent = message;
  gateError.textContent = "";
}

function humanizeAuthError(message) {
  const value = (message || "").toLowerCase();
  if (value.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (value.includes("email not confirmed")) {
    return "This account still is not confirmed. Delete the old user in Supabase and register again, or disable email confirmation.";
  }
  if (value.includes("signup is disabled") || value.includes("email signups are disabled")) {
    return "Email signups are currently disabled in Supabase. Turn the Email provider on.";
  }
  if (value.includes("user already registered")) {
    return "This email is already registered. Try signing in or delete the old Supabase user and register again.";
  }
  if (value.includes("failed to fetch")) {
    return "The app could not reach Supabase. Check your project URL, publishable key, and internet connection.";
  }
  return message || "Something went wrong while contacting Supabase.";
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

function sanitizeFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function renderEmptyState(message = "No saved memories yet. Add your first one and start your archive.") {
  memoryList.innerHTML = `<div class="memory-empty">${message}</div>`;
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
}

async function loadProfile(userId) {
  const { data, error } = await supabaseClient.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  currentProfile = data;
  userChip.textContent = `${data.display_name} | ${data.shared_code}`;
  memorySubtitle.textContent = `Synced across space: ${data.shared_code}`;
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

async function handleRegister(event) {
  event.preventDefault();
  if (!isConfigured) {
    setGateMessage("Add your Supabase URL and anon key in script.js first.");
    return;
  }

  const displayName = registerNameInput.value.trim();
  const email = registerEmailInput.value.trim();
  const password = registerPasswordInput.value;
  const sharedCode = slugifyCode(sharedCodeInput.value);
  if (!displayName || !email || !password || !sharedCode) {
    setGateMessage("Fill in every field first.");
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        display_name: displayName,
        shared_code: sharedCode,
      },
    },
  });

  if (error) {
    setGateMessage(humanizeAuthError(error.message));
    return;
  }
  registerForm.reset();
  if (!data.session) {
    setGateMessage("Account created. Check your email to confirm, then sign in.", "success");
    return;
  }
  setGateMessage("Account created and signed in.", "success");
}

async function handleLogin(event) {
  event.preventDefault();
  if (!isConfigured) {
    setGateMessage("Add your Supabase URL and anon key in script.js first.");
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: loginEmailInput.value.trim(),
    password: loginPasswordInput.value,
  });

  if (error) {
    setGateMessage(humanizeAuthError(error.message));
    return;
  }
  loginForm.reset();
}

async function handleSignOut() {
  await supabaseClient.auth.signOut();
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
    flashbackTitle.textContent = "No flashback yet";
    flashbackDescription.textContent = "Memories from this same date in past years will appear here automatically.";
    flashbackList.innerHTML = "";
    reminderList.innerHTML = "";
    milestoneList.innerHTML = "";
    letterList.innerHTML = "";
    setUnlockedState(false);
    renderEmptyState("Sign in to open your shared memory vault.");
    if (supabaseClient) await clearChannels();
    return;
  }

  try {
    await loadProfile(session.user.id);
    setUnlockedState(true);
    await fetchMemories();
    await subscribeToChanges();
  } catch (_error) {
    setUnlockedState(false);
    setGateMessage("Your account exists, but the profile setup is missing. Run the updated SQL file first.");
  }
}

if (!isConfigured) {
  configBanner.classList.remove("hidden");
  renderEmptyState("Add your Supabase configuration to start syncing real memories.");
} else {
  configBanner.classList.add("hidden");
}

renderEmptyState("Sign in to open your shared memory vault.");
registerForm.addEventListener("submit", handleRegister);
loginForm.addEventListener("submit", handleLogin);
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

if (isConfigured) {
  supabaseClient.auth.getSession().then(({ data }) => applySession(data.session));
  supabaseClient.auth.onAuthStateChange((_event, session) => applySession(session));
}

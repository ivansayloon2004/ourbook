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
const form = document.getElementById("memory-form");
const saveMemoryButton = document.getElementById("save-memory");
const memoryList = document.getElementById("memory-list");
const template = document.getElementById("memory-template");
const refreshButton = document.getElementById("refresh-memories");
const memorySubtitle = document.getElementById("memory-subtitle");
const memoryFeedback = document.getElementById("memory-feedback");
const stats = document.querySelectorAll(".stat-number");
const dashboardMemories = document.getElementById("dashboard-memories");
const dashboardPhotos = document.getElementById("dashboard-photos");
const dashboardFavorites = document.getElementById("dashboard-favorites");
const dashboardLatestTitle = document.getElementById("dashboard-latest-title");
const dashboardLatestMeta = document.getElementById("dashboard-latest-meta");
const flashbackDateLabel = document.getElementById("flashback-date-label");
const flashbackTitle = document.getElementById("flashback-title");
const flashbackDescription = document.getElementById("flashback-description");
const flashbackList = document.getElementById("flashback-list");

let statsAnimated = false;
let currentSession = null;
let currentProfile = null;
let memoriesChannel = null;
let currentMemories = [];
let commentsByMemory = new Map();

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
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function renderEmptyState(message = "No saved memories yet. Add your first one and start your archive.") {
  memoryList.innerHTML = `<div class="memory-empty">${message}</div>`;
}

function renderFlashback(memories) {
  flashbackDateLabel.textContent = "Today in your story";
  flashbackList.innerHTML = "";

  const todayKey = formatMonthDay(new Date().toISOString().slice(0, 10));
  const matches = memories.filter((memory) => formatMonthDay(memory.memory_date) === todayKey);

  if (!matches.length) {
    flashbackTitle.textContent = "No flashback yet";
    flashbackDescription.textContent =
      "Memories from this same date in past years will appear here automatically.";
    return;
  }

  flashbackTitle.textContent = `${matches.length} memory${matches.length > 1 ? "ies" : ""} from this date`;
  flashbackDescription.textContent =
    "Same day, different year. A tiny reminder that your story already has its own seasons.";

  matches.slice(0, 3).forEach((memory) => {
    const item = document.createElement("article");
    item.className = "flashback-item";
    item.innerHTML = `
      <p class="timeline-date">${formatDate(memory.memory_date)}</p>
      <h4>${memory.title}</h4>
      <p>${memory.description}</p>
    `;
    flashbackList.appendChild(item);
  });
}

function updateDashboard(memories) {
  const photoCount = memories.filter((memory) => memory.photo_path).length;
  const favoriteCount = memories.filter((memory) => memory.is_favorite).length;
  const latest = memories[0];

  dashboardMemories.textContent = String(memories.length);
  dashboardPhotos.textContent = String(photoCount);
  dashboardFavorites.textContent = String(favoriteCount);

  if (!latest) {
    dashboardLatestTitle.textContent = "Nothing saved yet";
    dashboardLatestMeta.textContent = "Once you add a memory, your newest story will appear here.";
    return;
  }

  dashboardLatestTitle.textContent = latest.title;
  dashboardLatestMeta.textContent = `${formatDate(latest.memory_date)} Â· added by ${latest.author_name}`;
}

async function createPhotoUrls(memories) {
  const withPhotos = memories.filter((memory) => memory.photo_path);
  if (!withPhotos.length) {
    return new Map();
  }

  const signedUrlEntries = await Promise.all(
    withPhotos.map(async (memory) => {
      const { data, error } = await supabaseClient.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(memory.photo_path, 60 * 60);

      if (error) {
        return [memory.id, ""];
      }

      return [memory.id, data.signedUrl];
    })
  );

  return new Map(signedUrlEntries);
}

function renderComments(listNode, comments) {
  listNode.innerHTML = "";

  if (!comments.length) {
    const empty = document.createElement("div");
    empty.className = "comment-item";
    empty.innerHTML = "<p>No notes yet. Leave the first one.</p>";
    listNode.appendChild(empty);
    return;
  }

  comments.forEach((comment) => {
    const item = document.createElement("div");
    item.className = "comment-item";
    item.innerHTML = `
      <span>${comment.author_name}</span>
      <p>${comment.body}</p>
    `;
    listNode.appendChild(item);
  });
}

async function renderMemories(memories) {
  memoryList.innerHTML = "";

  if (!memories.length) {
    renderEmptyState();
    return;
  }

  const photoUrls = await createPhotoUrls(memories);

  memories.forEach((memory) => {
    const node = template.content.cloneNode(true);
    node.querySelector(".memory-category").textContent = memory.category;
    node.querySelector(".memory-date").textContent = formatDate(memory.memory_date);
    node.querySelector(".memory-date").dateTime = memory.memory_date;

    const image = node.querySelector(".memory-image");
    const imageUrl = photoUrls.get(memory.id);
    if (imageUrl) {
      image.src = imageUrl;
      image.classList.remove("hidden");
    }

    node.querySelector(".memory-title").textContent = memory.title;
    node.querySelector(".memory-description").textContent = memory.description;
    node.querySelector(".memory-meta").textContent = `Added by ${memory.author_name || "one of you"}`;

    const favoriteButton = node.querySelector(".favorite-button");
    favoriteButton.textContent = memory.is_favorite ? "Favorited" : "Favorite";
    favoriteButton.classList.toggle("active", Boolean(memory.is_favorite));
    favoriteButton.dataset.id = memory.id;
    favoriteButton.addEventListener("click", () => toggleFavorite(memory.id, !memory.is_favorite));

    const commentList = node.querySelector(".comment-list");
    renderComments(commentList, commentsByMemory.get(memory.id) ?? []);

    const commentForm = node.querySelector(".comment-form");
    commentForm.addEventListener("submit", (event) => handleCommentSubmit(event, memory.id));

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

async function loadProfile(userId) {
  const { data, error } = await supabaseClient.from("profiles").select("*").eq("id", userId).single();

  if (error) {
    throw error;
  }

  currentProfile = data;
  userChip.textContent = `${data.display_name} | ${data.shared_code}`;
  memorySubtitle.textContent = `Synced across space: ${data.shared_code}`;
}

async function fetchComments(memoryIds) {
  commentsByMemory = new Map();

  if (!memoryIds.length) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("memory_comments")
    .select("id, memory_id, author_name, body, created_at")
    .in("memory_id", memoryIds)
    .order("created_at", { ascending: true });

  if (error) {
    return;
  }

  data.forEach((comment) => {
    const list = commentsByMemory.get(comment.memory_id) ?? [];
    list.push(comment);
    commentsByMemory.set(comment.memory_id, list);
  });
}

async function fetchMemories() {
  if (!currentProfile) {
    renderEmptyState("Sign in to load your shared memory vault.");
    return;
  }

  setFeedback("Loading memories...");

  const { data, error } = await supabaseClient
    .from("memories")
    .select("id, title, description, category, memory_date, photo_path, author_name, created_at, is_favorite")
    .eq("couple_code", currentProfile.shared_code)
    .order("memory_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    setFeedback(error.message, "error");
    renderEmptyState("Could not load memories yet.");
    return;
  }

  currentMemories = data ?? [];
  await fetchComments(currentMemories.map((memory) => memory.id));
  updateDashboard(currentMemories);
  renderFlashback(currentMemories);
  await renderMemories(currentMemories);
  setFeedback(currentMemories.length ? "Everything is up to date." : "No memories yet. Add the first one.");
}

async function subscribeToMemories() {
  if (!currentProfile) {
    return;
  }

  if (memoriesChannel) {
    await supabaseClient.removeChannel(memoriesChannel);
  }

  memoriesChannel = supabaseClient
    .channel(`couple-space:${currentProfile.shared_code}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "memories",
        filter: `couple_code=eq.${currentProfile.shared_code}`,
      },
      () => {
        fetchMemories();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "memory_comments",
      },
      () => {
        fetchMemories();
      }
    )
    .subscribe();
}

async function uploadPhoto(file) {
  if (!file || !currentProfile || !currentSession) {
    return "";
  }

  const filePath = `${currentProfile.shared_code}/${currentSession.user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabaseClient.storage.from(PHOTO_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return filePath;
}

async function toggleFavorite(memoryId, nextValue) {
  const { error } = await supabaseClient.from("memories").update({ is_favorite: nextValue }).eq("id", memoryId);

  if (error) {
    setFeedback(error.message, "error");
    return;
  }

  setFeedback(nextValue ? "Memory added to favorites." : "Memory removed from favorites.", "success");
  await fetchMemories();
}

async function handleCommentSubmit(event, memoryId) {
  event.preventDefault();

  const input = event.currentTarget.querySelector(".comment-input");
  const body = input.value.trim();
  if (!body || !currentProfile || !currentSession) {
    return;
  }

  const { error } = await supabaseClient.from("memory_comments").insert({
    memory_id: memoryId,
    couple_code: currentProfile.shared_code,
    owner_id: currentSession.user.id,
    author_name: currentProfile.display_name,
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

async function handleRegister(event) {
  event.preventDefault();

  if (!isConfigured) {
    setGateMessage("Add your Supabase URL and anon key in script.js first.");
    return;
  }

  setGateMessage("", "success");

  const displayName = registerNameInput.value.trim();
  const email = registerEmailInput.value.trim();
  const password = registerPasswordInput.value;
  const sharedCode = slugifyCode(sharedCodeInput.value);

  if (!displayName || !email || !password || !sharedCode) {
    setGateMessage("Fill in every field first.");
    return;
  }

  if (password.length < 8) {
    setGateMessage("Choose a password with at least 8 characters.");
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
    setGateMessage(error.message);
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

  setGateMessage("", "success");

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: loginEmailInput.value.trim(),
    password: loginPasswordInput.value,
  });

  if (error) {
    setGateMessage(error.message);
    return;
  }

  loginForm.reset();
}

async function handleSignOut() {
  if (!supabaseClient) {
    return;
  }

  await supabaseClient.auth.signOut();
}

async function handleSaveMemory(event) {
  event.preventDefault();

  if (!currentSession || !currentProfile) {
    setFeedback("Sign in before saving a memory.", "error");
    return;
  }

  const formData = new FormData(form);
  const title = formData.get("title").toString().trim();
  const memoryDate = formData.get("date").toString();
  const category = formData.get("category").toString();
  const description = formData.get("description").toString().trim();
  const photoFile = formData.get("photo");

  if (!title || !memoryDate || !description) {
    setFeedback("Fill in the title, date, and story first.", "error");
    return;
  }

  saveMemoryButton.disabled = true;
  setFeedback("Saving memory...", "success");

  try {
    let photoPath = "";
    if (photoFile instanceof File && photoFile.size > 0) {
      photoPath = await uploadPhoto(photoFile);
    }

    const { error } = await supabaseClient.from("memories").insert({
      owner_id: currentSession.user.id,
      couple_code: currentProfile.shared_code,
      author_name: currentProfile.display_name,
      title,
      memory_date: memoryDate,
      category,
      description,
      photo_path: photoPath || null,
      is_favorite: false,
    });

    if (error) {
      throw error;
    }

    form.reset();
    setFeedback("Memory saved to your shared vault.", "success");
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
    commentsByMemory = new Map();
    userChip.textContent = "Not signed in";
    memorySubtitle.textContent = "Synced across your shared space";
    dashboardMemories.textContent = "0";
    dashboardPhotos.textContent = "0";
    dashboardFavorites.textContent = "0";
    dashboardLatestTitle.textContent = "Nothing saved yet";
    dashboardLatestMeta.textContent = "Once you add a memory, your newest story will appear here.";
    flashbackTitle.textContent = "No flashback yet";
    flashbackDescription.textContent =
      "Memories from this same date in past years will appear here automatically.";
    flashbackList.innerHTML = "";
    setUnlockedState(false);
    renderEmptyState("Sign in to open your shared memory vault.");
    setFeedback("");

    if (supabaseClient && memoriesChannel) {
      await supabaseClient.removeChannel(memoriesChannel);
      memoriesChannel = null;
    }

    return;
  }

  try {
    await loadProfile(session.user.id);
    setUnlockedState(true);
    await fetchMemories();
    await subscribeToMemories();
  } catch (_error) {
    setUnlockedState(false);
    setGateMessage("Your account exists, but the profile setup is missing. Run the Supabase SQL file first.");
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
refreshButton.addEventListener("click", fetchMemories);
form.addEventListener("submit", handleSaveMemory);

if (isConfigured) {
  supabaseClient.auth.getSession().then(({ data }) => {
    applySession(data.session);
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    applySession(session);
  });
}





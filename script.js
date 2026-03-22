const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const PHOTO_BUCKET = "memory-photos";

const isConfigured =
  SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";
const supabase = isConfigured
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

let statsAnimated = false;
let currentSession = null;
let currentProfile = null;
let memoriesChannel = null;

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

async function createPhotoUrls(memories) {
  const withPhotos = memories.filter((memory) => memory.photo_path);
  if (!withPhotos.length) {
    return new Map();
  }

  const signedUrlEntries = await Promise.all(
    withPhotos.map(async (memory) => {
      const { data, error } = await supabase.storage
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
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error) {
    throw error;
  }

  currentProfile = data;
  userChip.textContent = `${data.display_name} | ${data.shared_code}`;
  memorySubtitle.textContent = `Synced across space: ${data.shared_code}`;
}

async function fetchMemories() {
  if (!currentProfile) {
    renderEmptyState("Sign in to load your shared memory vault.");
    return;
  }

  setFeedback("Loading memories...");

  const { data, error } = await supabase
    .from("memories")
    .select("id, title, description, category, memory_date, photo_path, author_name, created_at")
    .eq("couple_code", currentProfile.shared_code)
    .order("memory_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    setFeedback(error.message, "error");
    renderEmptyState("Could not load memories yet.");
    return;
  }

  await renderMemories(data ?? []);
  setFeedback(data && data.length ? "Everything is up to date." : "No memories yet. Add the first one.");
}

async function subscribeToMemories() {
  if (!currentProfile) {
    return;
  }

  if (memoriesChannel) {
    await supabase.removeChannel(memoriesChannel);
  }

  memoriesChannel = supabase
    .channel(`memories:${currentProfile.shared_code}`)
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
    .subscribe();
}

async function uploadPhoto(file) {
  if (!file || !currentProfile || !currentSession) {
    return "";
  }

  const filePath = `${currentProfile.shared_code}/${currentSession.user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return filePath;
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

  const { data, error } = await supabase.auth.signUp({
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

  const { error } = await supabase.auth.signInWithPassword({
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
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
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

    const { error } = await supabase.from("memories").insert({
      owner_id: currentSession.user.id,
      couple_code: currentProfile.shared_code,
      author_name: currentProfile.display_name,
      title,
      memory_date: memoryDate,
      category,
      description,
      photo_path: photoPath || null,
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
    userChip.textContent = "Not signed in";
    memorySubtitle.textContent = "Synced across your shared space";
    setUnlockedState(false);
    renderEmptyState("Sign in to open your shared memory vault.");
    setFeedback("");

    if (supabase && memoriesChannel) {
      await supabase.removeChannel(memoriesChannel);
      memoriesChannel = null;
    }

    return;
  }

  try {
    await loadProfile(session.user.id);
    setUnlockedState(true);
    await fetchMemories();
    await subscribeToMemories();
  } catch (error) {
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
  supabase.auth.getSession().then(({ data }) => {
    applySession(data.session);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    applySession(session);
  });
}

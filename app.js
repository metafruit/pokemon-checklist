// State Management
let pokemonDatabase = [];
let checkedState = {}; // maps pokeId (number) -> boolean
let activeGen = "1";
let activeType = null;
let currentTheme = "light";
let storageMode = "local"; // 'local' or 'sheets'
let appsScriptUrl = "";

// DOM Elements
const pokemonGrid = document.getElementById("pokemon-grid");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const genTabsContainer = document.getElementById("gen-tabs-container");
const typesFilterContainer = document.getElementById("types-filter-container");
const settingsBtn = document.getElementById("settings-btn");
const settingsDialog = document.getElementById("settings-dialog");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const storageModeSelect = document.getElementById("storage-mode");
const sheetsConfigGroup = document.getElementById("sheets-config-group");
const appsScriptUrlInput = document.getElementById("apps-script-url");
const initializeSheetBtn = document.getElementById("initialize-sheet-btn");
const manualSyncBtn = document.getElementById("manual-sync-btn");
const syncIndicator = document.getElementById("sync-indicator");
const syncText = document.getElementById("sync-text");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const themeSunIcon = document.getElementById("theme-sun-icon");
const themeMoonIcon = document.getElementById("theme-moon-icon");
const checkedCountEl = document.getElementById("checked-count");
const progressBarEl = document.getElementById("progress-bar");
const progressPercentEl = document.getElementById("progress-percent");

const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFileInput = document.getElementById("import-file-input");
const clearAllBtn = document.getElementById("clear-all-btn");

// Pokémon Types list
const POKEMON_TYPES = [
  "normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "steel", "fairy", "dark"
];

// Generation Ranges Map (National Dex ID bounds)
const GEN_RANGES = {
  "1": { start: 1, end: 151 },
  "2": { start: 152, end: 251 },
  "3": { start: 252, end: 386 },
  "4": { start: 387, end: 493 },
  "5": { start: 494, end: 649 },
  "6": { start: 650, end: 721 },
  "7": { start: 722, end: 809 },
  "8": { start: 810, end: 905 },
  "9": { start: 906, end: 1025 },
  "all": { start: 1, end: 1025 }
};

// ----------------------------------------------------
// Custom Canvas Confetti Engine
// ----------------------------------------------------
const canvas = document.getElementById("confetti-canvas");
const ctx = canvas.getContext("2d");
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

class ConfettiParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 6 + 4;
    this.speedX = Math.random() * 6 - 3;
    this.speedY = Math.random() * -8 - 4;
    this.gravity = 0.35;
    this.color = color;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 8 - 4;
    this.opacity = 1;
  }
  update() {
    this.speedY += this.gravity;
    this.x += this.speedX;
    this.y += this.speedY;
    this.rotation += this.rotationSpeed;
    this.opacity -= 0.015;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

function triggerConfetti(x, y, typeColor) {
  const defaultColors = ["#ffd700", "#ff4500", "#00ff00", "#00ffff", "#ff00ff", "#3b82f6"];
  const colors = typeColor ? [typeColor, "#ffffff", ...defaultColors] : defaultColors;
  
  for (let i = 0; i < 35; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new ConfettiParticle(x, y, color));
  }
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.opacity > 0);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animateConfetti);
}
requestAnimationFrame(animateConfetti);

// ----------------------------------------------------
// UI Notification Toasts
// ----------------------------------------------------
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  // Icon mapping
  let icon = "";
  if (type === "success") {
    icon = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>`;
  } else if (type === "error") {
    icon = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/></svg>`;
  } else if (type === "warning") {
    icon = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></svg>`;
  } else {
    icon = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 1 1 1.062 1.06l-.969.969c-.316.316-.67.585-1.062.802a.75.75 0 0 1-.312-1.018l.27-.405a2.25 2.25 0 0 0 .285-1.014c0-.39-.156-.764-.433-1.042a.75.75 0 0 1 1.061-1.06l.076.076Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"/></svg>`;
  }
  
  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);
  
  // Trigger transition
  setTimeout(() => toast.classList.add("show"), 10);
  
  // Auto remove
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ----------------------------------------------------
// Google Sheets Integration Sync Functions
// ----------------------------------------------------
function updateSyncIndicator(status, text) {
  syncIndicator.className = `sync-status ${status}`;
  syncText.textContent = text;
}

// Fetch checklist from Google Sheets
async function fetchChecksFromSheets() {
  if (storageMode !== "sheets" || !appsScriptUrl) return;
  
  updateSyncIndicator("syncing", "Syncing with Sheets...");
  try {
    const url = `${appsScriptUrl}?action=fetch&t=${Date.now()}`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error("HTTP error " + response.status);
    
    const result = await response.json();
    
    if (result.initialized === false) {
      showToast(result.message || "Google Sheet is empty or not formatted.", "warning");
      updateSyncIndicator("error", "Sheet Uninitialized");
      return;
    }
    
    if (result.checkedIds) {
      // Overwrite local checks with Sheets checks
      checkedState = {};
      result.checkedIds.forEach(id => {
        checkedState[id] = true;
      });
      
      saveLocalState();
      updateProgressMetrics();
      rerenderGrid();
      updateSyncIndicator("synced", "Synced with Sheets");
      showToast("Checklist synced from Google Sheets successfully!", "success");
    } else {
      throw new Error(result.error || "Failed to fetch checked list");
    }
  } catch (err) {
    console.error("Sheets fetch error:", err);
    updateSyncIndicator("error", "Sync Connection Error");
    showToast("Could not sync from Google Sheets. Offline backup is active.", "error");
  }
}

// Send single checkmark update to Google Sheets (GET request to bypass CORS preflight redirects)
async function syncSingleCheckToSheets(pokeId, checked) {
  if (storageMode !== "sheets" || !appsScriptUrl) return;
  
  updateSyncIndicator("syncing", "Syncing check...");
  try {
    const url = `${appsScriptUrl}?action=sync&id=${pokeId}&checked=${checked}&t=${Date.now()}`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error("HTTP error " + response.status);
    
    const result = await response.json();
    if (result.success) {
      updateSyncIndicator("synced", "Synced with Sheets");
    } else {
      throw new Error(result.error || "Update rejected by script");
    }
  } catch (err) {
    console.error("Sheets update error:", err);
    updateSyncIndicator("error", "Pending Sync");
    showToast("Failed to sync checkmark to Google Sheet. Will retry on full sync.", "warning");
  }
}

// Bulk Push local state to Sheets (POST request)
async function pushAllChecksToSheets() {
  if (storageMode !== "sheets" || !appsScriptUrl) {
    showToast("Google Sheets sync is not enabled.", "warning");
    return;
  }
  
  const checkedIds = Object.keys(checkedState)
    .filter(id => checkedState[id])
    .map(Number);
    
  updateSyncIndicator("syncing", "Uploading checklist...");
  try {
    const response = await fetch(appsScriptUrl, {
      method: "POST",
      mode: "no-cors", // Use no-cors for standard redirect handling
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulk_sync",
        checkedIds: checkedIds
      })
    });
    
    // In 'no-cors' mode, response is opaque, meaning we can't inspect the body.
    // However, it succeeds if no exception is thrown, so we assume success.
    updateSyncIndicator("synced", "Synced with Sheets");
    showToast("Checklist pushed to Google Sheet!", "success");
    
    // We should fetch immediately after to verify, but since POST redirects are opaque,
    // let's give the sheet 500ms and run a GET fetch to sync local state securely.
    setTimeout(fetchChecksFromSheets, 1000);
    
  } catch (err) {
    console.error("Sheets upload error:", err);
    updateSyncIndicator("error", "Sync Error");
    showToast("Failed to push checklist to Google Sheet.", "error");
  }
}

// Initialize sheet with all Pokémon data (POST request)
async function initializeGoogleSheet() {
  if (!appsScriptUrl) {
    showToast("Please enter a valid Google Apps Script Web App URL first.", "error");
    return;
  }
  
  if (!confirm("This will overwrite your active Google Sheet page and set up a new Pokémon list. Continue?")) {
    return;
  }
  
  initializeSheetBtn.disabled = true;
  initializeSheetBtn.innerHTML = `<span style="display:inline-block;animation:spin 1s infinite linear;">↻</span> Initializing...`;
  
  try {
    // We send basic Pokémon details so the sheet has rows for search, sort, and checklist mapping
    const simplifiedPokemons = pokemonDatabase.map(p => ({
      id: p.id,
      name: p.name,
      types: p.types,
      generation: p.generation
    }));
    
    const response = await fetch(appsScriptUrl, {
      method: "POST",
      mode: "no-cors", // Opaque post handling
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "populate",
        pokemons: simplifiedPokemons
      })
    });
    
    showToast("Setup request sent! The sheet is being populated in the background.", "info");
    
    // Push our current checkmarks immediately to pre-fill the sheet checkboxes
    setTimeout(async () => {
      await pushAllChecksToSheets();
      initializeSheetBtn.disabled = false;
      initializeSheetBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        Initialize/Format Sheet
      `;
    }, 2000);
    
  } catch (err) {
    console.error("Sheet initialization error:", err);
    showToast("Failed to initialize Google Sheet.", "error");
    initializeSheetBtn.disabled = false;
    initializeSheetBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
      Initialize/Format Sheet
    `;
  }
}

// ----------------------------------------------------
// Local Caching & State Management
// ----------------------------------------------------
function loadLocalState() {
  // Load Theme
  currentTheme = localStorage.getItem("pokemon-theme") || "light";
  document.body.setAttribute("data-theme", currentTheme);
  updateThemeIcons();

  // Load Settings
  storageMode = localStorage.getItem("pokemon-storage-mode") || "local";
  appsScriptUrl = localStorage.getItem("pokemon-apps-script-url") || "";
  
  storageModeSelect.value = storageMode;
  appsScriptUrlInput.value = appsScriptUrl;
  
  if (storageMode === "sheets") {
    sheetsConfigGroup.style.display = "flex";
    updateSyncIndicator("syncing", "Syncing with Sheets...");
  } else {
    sheetsConfigGroup.style.display = "none";
    updateSyncIndicator("local", "Offline Mode");
  }

  // Load Checklist Checks
  const savedChecks = localStorage.getItem("pokemon-checked-state");
  if (savedChecks) {
    checkedState = JSON.parse(savedChecks);
  } else {
    checkedState = {};
  }
}

function saveLocalState() {
  localStorage.setItem("pokemon-checked-state", JSON.stringify(checkedState));
  localStorage.setItem("pokemon-storage-mode", storageMode);
  localStorage.setItem("pokemon-apps-script-url", appsScriptUrl);
  localStorage.setItem("pokemon-theme", currentTheme);
}

// ----------------------------------------------------
// UI Rendering Engine
// ----------------------------------------------------
function updateProgressMetrics() {
  // Total Caught
  const caughtCount = Object.keys(checkedState).filter(id => checkedState[id]).length;
  const totalCount = pokemonDatabase.length || 1025;
  
  checkedCountEl.textContent = caughtCount;
  
  const totalPercent = totalCount > 0 ? Math.round((caughtCount / totalCount) * 100) : 0;
  progressBarEl.style.width = `${totalPercent}%`;
  progressPercentEl.textContent = `${totalPercent}%`;
  
  // Update Tab Badges progress (individual generations counts)
  Object.keys(GEN_RANGES).forEach(genKey => {
    const range = GEN_RANGES[genKey];
    const genPokes = pokemonDatabase.filter(p => p.id >= range.start && p.id <= range.end);
    const genPokesCount = genPokes.length;
    const genCaught = genPokes.filter(p => checkedState[p.id]).length;
    
    const progBadge = document.getElementById(`gen${genKey}-prog`);
    if (progBadge) {
      progBadge.textContent = `(${genCaught}/${genPokesCount})`;
    }
  });
}

function generateTypeFilterPills() {
  typesFilterContainer.innerHTML = "";
  
  // Clear/All Types Pill
  const clearPill = document.createElement("div");
  clearPill.className = `type-filter-pill ${activeType === null ? 'active' : ''}`;
  clearPill.style.setProperty("--active-color", "var(--primary)");
  clearPill.style.setProperty("--glow-color", "var(--primary-glow)");
  clearPill.textContent = "All Types";
  clearPill.addEventListener("click", () => {
    activeType = null;
    document.querySelectorAll(".type-filter-pill").forEach(p => p.classList.remove("active"));
    clearPill.classList.add("active");
    rerenderGrid();
  });
  typesFilterContainer.appendChild(clearPill);
  
  // Inject individual type pills
  POKEMON_TYPES.forEach(type => {
    const pill = document.createElement("div");
    pill.className = `type-filter-pill ${activeType === type ? 'active' : ''}`;
    pill.style.setProperty("--active-color", `var(--type-${type})`);
    pill.style.setProperty("--glow-color", `rgba(var(--type-${type}), 0.2)`);
    pill.textContent = type;
    
    pill.addEventListener("click", () => {
      document.querySelectorAll(".type-filter-pill").forEach(p => p.classList.remove("active"));
      if (activeType === type) {
        activeType = null;
        clearPill.classList.add("active");
      } else {
        activeType = type;
        pill.classList.add("active");
      }
      rerenderGrid();
    });
    
    typesFilterContainer.appendChild(pill);
  });
}

// Create a single card component
function createPokemonCard(pokemon) {
  const isChecked = !!checkedState[pokemon.id];
  const card = document.createElement("div");
  card.className = `pokemon-card ${isChecked ? 'checked' : ''}`;
  
  // Primary type color variables for borders and glows
  const primaryType = pokemon.types[0];
  card.style.setProperty("--primary-type-color", `var(--type-${primaryType})`);
  
  // Build Types HTML
  const typesHtml = pokemon.types.map(t => `
    <span class="type-badge" style="background-color: var(--type-${t});">${t}</span>
  `).join("");
  
  card.innerHTML = `
    <div class="card-header">
      <span class="dex-number">#${String(pokemon.id).padStart(4, '0')}</span>
      <label class="checkbox-container">
        <input type="checkbox" data-id="${pokemon.id}" ${isChecked ? 'checked' : ''}>
        <span class="checkmark"></span>
      </label>
    </div>
    
    <div class="sprite-container">
      <div class="sprite-placeholder"></div>
      <img class="pokemon-sprite" loading="lazy" src="${pokemon.sprite}" alt="${pokemon.name}">
    </div>
    
    <h3 class="pokemon-name">${pokemon.name}</h3>
    <div class="pokemon-types">
      ${typesHtml}
    </div>
  `;
  
  // Card click behavior (checking off the pokemon)
  card.addEventListener("click", (e) => {
    // If clicking directly on link or checkbox, let browser handle it
    if (e.target.tagName === 'INPUT' || e.target.closest('.checkbox-container')) {
      return;
    }
    const checkbox = card.querySelector('input[type="checkbox"]');
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event("change"));
  });
  
  // Checkbox state change trigger
  const checkbox = card.querySelector('input[type="checkbox"]');
  checkbox.addEventListener("change", (e) => {
    const id = pokemon.id;
    const checked = checkbox.checked;
    
    checkedState[id] = checked;
    if (checked) {
      card.classList.add("checked");
      
      // Fire confetti from checkbox location
      const rect = checkbox.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      triggerConfetti(x, y, `var(--type-${primaryType})`);
    } else {
      card.classList.remove("checked");
    }
    
    saveLocalState();
    updateProgressMetrics();
    
    // Sync check status to Google Sheets (if enabled)
    if (storageMode === "sheets") {
      syncSingleCheckToSheets(id, checked);
    }
  });

  // Lazy image load completion handler to remove skeleton loader
  const img = card.querySelector(".pokemon-sprite");
  const placeholder = card.querySelector(".sprite-placeholder");
  img.addEventListener("load", () => {
    if (placeholder) placeholder.style.display = "none";
  });
  img.addEventListener("error", () => {
    // Fallback if image fails to load
    img.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png";
    if (placeholder) placeholder.style.display = "none";
  });
  
  return card;
}

// Core Filtering & Grid Update
function rerenderGrid() {
  pokemonGrid.innerHTML = "";
  
  const query = searchInput.value.toLowerCase().trim();
  const statusVal = statusFilter.value;
  
  // Filter Pokémon data based on constraints
  const filtered = pokemonDatabase.filter(p => {
    // Generation Check: If searching, search across all, else scope to active tab range
    if (query === "") {
      const range = GEN_RANGES[activeGen];
      if (p.id < range.start || p.id > range.end) return false;
    }
    
    // Type Filter
    if (activeType && !p.types.includes(activeType)) return false;
    
    // Search Query Check
    if (query !== "") {
      const isNumMatch = String(p.id) === query;
      const isNameMatch = p.name.toLowerCase().includes(query);
      if (!isNumMatch && !isNameMatch) return false;
    }
    
    // Caught Status Filter
    const isChecked = !!checkedState[p.id];
    if (statusVal === "caught" && !isChecked) return false;
    if (statusVal === "uncaught" && isChecked) return false;
    
    return true;
  });
  
  // Render empty state if nothing matches
  if (filtered.length === 0) {
    pokemonGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3 class="empty-state-title">No Pokémon Found</h3>
        <p class="empty-state-desc">Try modifying your search queries or category filters.</p>
      </div>
    `;
    return;
  }
  
  // Inject cards
  const fragment = document.createDocumentFragment();
  filtered.forEach(p => {
    fragment.appendChild(createPokemonCard(p));
  });
  pokemonGrid.appendChild(fragment);
}

// ----------------------------------------------------
// Settings & Utility Handlers
// ----------------------------------------------------
function toggleTheme() {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", currentTheme);
  saveLocalState();
  updateThemeIcons();
}

function updateThemeIcons() {
  if (currentTheme === "dark") {
    themeSunIcon.style.display = "none";
    themeMoonIcon.style.display = "block";
  } else {
    themeSunIcon.style.display = "block";
    themeMoonIcon.style.display = "none";
  }
}

function handleExport() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(checkedState, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "pokemon_checklist_backup.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("Checklist JSON backup exported!", "success");
}

function handleImport() {
  importFileInput.click();
}

importFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      
      // Clean up object validation
      const cleaned = {};
      Object.keys(imported).forEach(k => {
        if (!isNaN(k)) {
          cleaned[Number(k)] = !!imported[k];
        }
      });
      
      if (confirm(`Import backup containing ${Object.keys(cleaned).length} caught statuses? This will merge with your current list.`)) {
        checkedState = { ...checkedState, ...cleaned };
        saveLocalState();
        updateProgressMetrics();
        rerenderGrid();
        showToast("Backup imported and merged successfully!", "success");
        
        if (storageMode === "sheets" && appsScriptUrl) {
          pushAllChecksToSheets();
        }
      }
    } catch (err) {
      showToast("Invalid JSON file template.", "error");
    }
  };
  reader.readAsText(file);
});

// ----------------------------------------------------
// Initial App Bootstrapping
// ----------------------------------------------------
async function initApp() {
  try {
    // 1. Fetch Local static database
    const response = await fetch("pokemon_db.json");
    if (!response.ok) throw new Error("Could not load Pokémon database JSON");
    pokemonDatabase = await response.json();
    
    // 2. Load cached configurations
    loadLocalState();
    
    // 3. Render Pill Filters
    generateTypeFilterPills();
    
    // 4. Update Checklist totals
    updateProgressMetrics();
    
    // 5. Render active generation cards
    rerenderGrid();
    
    // 6. Connect to Google Sheets (if sheets sync active)
    if (storageMode === "sheets" && appsScriptUrl) {
      fetchChecksFromSheets();
    }
    
  } catch (err) {
    console.error("App boot failed:", err);
    showToast("Failed to initialize application data.", "error");
  }
}

// ----------------------------------------------------
// Event Listeners
// ----------------------------------------------------

// Gen Tabs Click
genTabsContainer.addEventListener("click", (e) => {
  const tab = e.target.closest(".tab-btn");
  if (!tab) return;
  
  document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  activeGen = tab.dataset.gen;
  
  // Clear search on tab switch to keep things focused
  searchInput.value = "";
  
  rerenderGrid();
});

// Input Search
let searchDebounce;
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    // If user is searching, switch tab rendering to "All" (visual feedback)
    // but don't clear the generation tab button active state necessarily.
    rerenderGrid();
  }, 250);
});

statusFilter.addEventListener("change", rerenderGrid);

// Theme Toggle
themeToggleBtn.addEventListener("click", toggleTheme);

// Settings Modals Actions
settingsBtn.addEventListener("click", () => settingsDialog.showModal());
closeSettingsBtn.addEventListener("click", () => settingsDialog.close());

storageModeSelect.addEventListener("change", (e) => {
  const mode = e.target.value;
  if (mode === "sheets") {
    sheetsConfigGroup.style.display = "flex";
  } else {
    sheetsConfigGroup.style.display = "none";
  }
});

saveSettingsBtn.addEventListener("click", () => {
  const oldMode = storageMode;
  const oldUrl = appsScriptUrl;
  
  storageMode = storageModeSelect.value;
  appsScriptUrl = appsScriptUrlInput.value.trim();
  
  saveLocalState();
  
  if (storageMode === "sheets") {
    if (!appsScriptUrl) {
      showToast("Please enter a valid Google Apps Script Web App URL.", "error");
      return;
    }
    
    // If sync config changed or is enabled, sync
    if (oldMode !== "sheets" || oldUrl !== appsScriptUrl) {
      fetchChecksFromSheets();
    }
  } else {
    updateSyncIndicator("local", "Offline Mode");
  }
  
  settingsDialog.close();
  showToast("Settings applied successfully!", "success");
});

initializeSheetBtn.addEventListener("click", initializeGoogleSheet);
manualSyncBtn.addEventListener("click", fetchChecksFromSheets);

exportBtn.addEventListener("click", handleExport);
importBtn.addEventListener("click", handleImport);

clearAllBtn.addEventListener("click", () => {
  if (confirm("Are you absolutely sure you want to clear all of your checklist progress? This action cannot be undone.")) {
    checkedState = {};
    saveLocalState();
    updateProgressMetrics();
    rerenderGrid();
    showToast("Checklist progress reset successfully.", "info");
    
    if (storageMode === "sheets" && appsScriptUrl) {
      pushAllChecksToSheets();
    }
  }
});

// Boot the application on load
window.addEventListener("DOMContentLoaded", initApp);

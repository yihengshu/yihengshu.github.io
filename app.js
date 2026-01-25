const mdTarget = document.getElementById("md");
const themeButtons = document.querySelectorAll(".theme-toggle button");
const THEME_KEY = "theme";
const VALID_THEMES = new Set(["light", "dark", "auto"]);

function getStoredPreference() {
  const saved = localStorage.getItem(THEME_KEY);
  return VALID_THEMES.has(saved) ? saved : null;
}

function getSystemTheme() {
  if (!window.matchMedia) {
    return null;
  }
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  if (typeof mq.matches !== "boolean") {
    return null;
  }
  return mq.matches ? "dark" : "light";
}

function getThemeByLocalTime() {
  const hour = new Date().getHours();
  const isNight = hour >= 19 || hour < 6;
  return isNight ? "dark" : "light";
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("theme-dark", isDark);
}

function updateThemeButtons(preference) {
  themeButtons.forEach((btn) => {
    const active = btn.dataset.theme === preference;
    btn.setAttribute("aria-pressed", String(active));
  });
}

function resolveTheme(preference) {
  if (preference === "auto") {
    return getSystemTheme() ?? getThemeByLocalTime();
  }
  return preference;
}

function applyThemeByPreference(preference) {
  const resolved = resolveTheme(preference);
  applyTheme(resolved);
  updateThemeButtons(preference);
}

function setThemePreference(preference) {
  const safePreference = VALID_THEMES.has(preference) ? preference : "auto";
  localStorage.setItem(THEME_KEY, safePreference);
  applyThemeByPreference(safePreference);
}

function applyThemeByLocalTime() {
  const preference = getStoredPreference() ?? "auto";
  applyThemeByPreference(preference);
}

async function loadMarkdown() {
  try {
    const response = await fetch("content.md", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error("Failed to load markdown");
    }
    const markdown = await response.text();
    mdTarget.innerHTML = window.marked ? window.marked.parse(markdown) : markdown;
  } catch (error) {
    mdTarget.innerHTML = "<p>Unable to load content.</p>";
  }
}

themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => setThemePreference(btn.dataset.theme));
});

const systemThemeQuery = window.matchMedia
  ? window.matchMedia("(prefers-color-scheme: dark)")
  : null;

if (systemThemeQuery?.addEventListener) {
  systemThemeQuery.addEventListener("change", () => {
    const preference = getStoredPreference() ?? "auto";
    if (preference === "auto") {
      applyThemeByPreference(preference);
    }
  });
}

applyThemeByLocalTime();
loadMarkdown();

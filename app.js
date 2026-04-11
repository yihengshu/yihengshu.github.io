const mdTarget = document.getElementById("md");
const themeButtonList = Array.from(document.querySelectorAll(".theme-toggle button"));
const navActionsTarget = document.getElementById("glassNavActions");
const navBrand = document.getElementById("glassNavBrand");
const navWrap = document.querySelector(".glass-nav-wrap");
const mainCard = document.querySelector(".md");
const THEME_KEY = "theme";
const VALID_THEMES = new Set(["light", "dark", "auto"]);
const SCROLL_THRESHOLD = 18;
const GITHUB_OWNER = "yihengshu";
const GITHUB_REPO = "yihengshu.github.io";
const GITHUB_CONTENT_PATH = "content.md";
let hasScrolledDown = false;
let lastScrollY = window.scrollY || window.pageYOffset || 0;

function isNavOverlayingMainCard() {
  if (!mainCard) {
    return false;
  }
  const navBottom = navWrap ? navWrap.getBoundingClientRect().bottom : 0;
  const mainRect = mainCard.getBoundingClientRect();
  return mainRect.top <= navBottom - 2;
}

function updateNavBrandVisibility() {
  if (!navBrand) {
    return;
  }
  const y = window.scrollY || window.pageYOffset || 0;
  const visible = hasScrolledDown && y > SCROLL_THRESHOLD && isNavOverlayingMainCard();
  navBrand.classList.toggle("is-visible", visible);
  navBrand.setAttribute("aria-hidden", String(!visible));
}

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
  themeButtonList.forEach((btn) => {
    const active = btn.dataset.theme === preference;
    btn.setAttribute("aria-checked", String(active));
    btn.tabIndex = active ? 0 : -1;
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

function updateScrollState() {
  const y = window.scrollY || window.pageYOffset || 0;
  if (y > lastScrollY + 1) {
    hasScrolledDown = true;
  }
  lastScrollY = y;
  document.body.classList.toggle("is-scrolled", y > SCROLL_THRESHOLD);
  updateNavBrandVisibility();
}

function syncProfileLinksToTopBar() {
  if (!navActionsTarget) {
    return;
  }
  navActionsTarget.replaceChildren();
  const profile = mdTarget.querySelector(".profile-links");
  if (!profile) {
    return;
  }
  const linkCluster = profile.querySelector(".link-cluster");
  if (!linkCluster) {
    return;
  }
  const anchors = linkCluster.querySelectorAll("a.link-chip");
  anchors.forEach((anchor) => {
    const link = anchor.cloneNode(true);
    link.classList.add("link-chip", "icon-only", "nav-icon-chip");
    navActionsTarget.append(link);
  });
  linkCluster.remove();
  if (!profile.querySelector("a")) {
    profile.remove();
  }
}

function forceLinksOpenInNewTab(root) {
  if (!root) return;
  root.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.toLowerCase().startsWith("javascript:")) return;
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });
}

function formatLastUpdated(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }).format(date).replace(/(\w{3}) /, "$1. ");
}

async function fetchLastUpdatedFromGitHub() {
  const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?path=${encodeURIComponent(GITHUB_CONTENT_PATH)}&per_page=1`, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) {
    throw new Error("Failed to load GitHub commit metadata.");
  }
  const commits = await response.json();
  return formatLastUpdated(commits?.[0]?.commit?.committer?.date || "");
}

async function loadMarkdown() {
  try {
    const markdownResponse = await fetch("content.md", { cache: "no-store" });
    if (!markdownResponse.ok) {
      throw new Error("Failed to load markdown");
    }
    const markdown = await markdownResponse.text();
    let renderedMarkdown = markdown;
    try {
      const lastUpdated = await fetchLastUpdatedFromGitHub();
      if (lastUpdated) {
        renderedMarkdown = markdown.replace("{{LAST_UPDATED}}", lastUpdated);
      }
    } catch (error) {
      console.warn("Unable to replace last updated with the latest GitHub commit date.", error);
    }
    mdTarget.innerHTML = window.marked ? window.marked.parse(renderedMarkdown) : renderedMarkdown;
    forceLinksOpenInNewTab(mdTarget);
    syncProfileLinksToTopBar();
    forceLinksOpenInNewTab(navActionsTarget);
  } catch (error) {
    mdTarget.innerHTML = "<p>Unable to load content.</p>";
  }
}

themeButtonList.forEach((btn) => {
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

window.addEventListener("scroll", updateScrollState, { passive: true });
window.addEventListener("resize", updateScrollState, { passive: true });
applyThemeByLocalTime();
updateScrollState();
loadMarkdown();

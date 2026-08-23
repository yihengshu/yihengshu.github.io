const themeToggle = document.querySelector(".theme-toggle");
const themeButtonList = Array.from(themeToggle ? themeToggle.querySelectorAll("button[data-theme]") : []);
const navBrand = document.getElementById("glassNavBrand");
const navWrap = document.querySelector(".glass-nav-wrap");
const mainCard = document.querySelector(".md");
const THEME_KEY = "theme";
const VALID_THEMES = new Set(["light", "dark", "auto"]);
const SCROLL_THRESHOLD = 18;
const systemThemeQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function getScrollY() {
  return window.scrollY ?? window.pageYOffset ?? 0;
}

let currentThemePreference = "auto";
let themeStorageAvailable = true;
let lastScrollY = getScrollY();
let hasScrolledDown = lastScrollY > SCROLL_THRESHOLD;
let pendingScrollFrame = null;
let navBrandVisible = null;

function isNavOverlayingMainCard() {
  if (!mainCard) {
    return false;
  }
  const navBottom = navWrap ? navWrap.getBoundingClientRect().bottom : 0;
  const mainRect = mainCard.getBoundingClientRect();
  return mainRect.top <= navBottom - 2;
}

function updateNavBrandVisibility(y) {
  if (!navBrand) {
    return;
  }
  const visible = hasScrolledDown && y > SCROLL_THRESHOLD && isNavOverlayingMainCard();
  if (visible === navBrandVisible) {
    return;
  }
  navBrandVisible = visible;
  navBrand.classList.toggle("is-visible", visible);
  navBrand.setAttribute("aria-hidden", String(!visible));
}

function disableThemeStorage(error) {
  if (!themeStorageAvailable) {
    return;
  }
  themeStorageAvailable = false;
  console.warn("Theme preference storage is unavailable; the selection will last for this page only.", error);
}

function getStoredPreference() {
  if (!themeStorageAvailable) {
    return null;
  }
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    return VALID_THEMES.has(saved) ? saved : null;
  } catch (error) {
    disableThemeStorage(error);
    return null;
  }
}

function persistThemePreference(preference) {
  if (!themeStorageAvailable) {
    return;
  }
  try {
    window.localStorage.setItem(THEME_KEY, preference);
  } catch (error) {
    disableThemeStorage(error);
  }
}

function getSystemTheme() {
  if (typeof systemThemeQuery?.matches !== "boolean") {
    return null;
  }
  return systemThemeQuery.matches ? "dark" : "light";
}

function getThemeByLocalTime() {
  const hour = new Date().getHours();
  const isNight = hour >= 19 || hour < 6;
  return isNight ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("theme-dark", theme === "dark");
}

function updateThemeButtons(preference) {
  themeButtonList.forEach((button) => {
    const active = button.dataset.theme === preference;
    button.setAttribute("aria-checked", String(active));
    button.tabIndex = active ? 0 : -1;
  });
}

function resolveTheme(preference) {
  if (preference === "auto") {
    return getSystemTheme() ?? getThemeByLocalTime();
  }
  return preference;
}

function applyThemeByPreference(preference) {
  applyTheme(resolveTheme(preference));
  updateThemeButtons(preference);
}

function setThemePreference(preference, { persist = true } = {}) {
  const safePreference = VALID_THEMES.has(preference) ? preference : "auto";
  currentThemePreference = safePreference;
  applyThemeByPreference(safePreference);
  if (persist) {
    persistThemePreference(safePreference);
  }
}

function initializeTheme() {
  setThemePreference(getStoredPreference() ?? "auto", { persist: false });
}

function handleThemeKeydown(event) {
  if (event.altKey || event.ctrlKey || event.metaKey || !(event.target instanceof Element)) {
    return;
  }
  const button = event.target.closest("button[data-theme]");
  const currentIndex = themeButtonList.indexOf(button);
  if (currentIndex < 0) {
    return;
  }

  let nextIndex = null;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    nextIndex = (currentIndex + 1) % themeButtonList.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    nextIndex = (currentIndex - 1 + themeButtonList.length) % themeButtonList.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = themeButtonList.length - 1;
  }
  if (nextIndex === null) {
    return;
  }

  event.preventDefault();
  const nextButton = themeButtonList[nextIndex];
  setThemePreference(nextButton.dataset.theme);
  nextButton.focus();
}

function enhanceExternalLinks(root) {
  root.querySelectorAll("a[href]").forEach((link) => {
    const rawHref = link.getAttribute("href");
    let url;
    try {
      url = new URL(rawHref, document.baseURI);
    } catch (error) {
      console.warn("Unable to classify link target.", rawHref, error);
      return;
    }

    const isExternalHttp = (url.protocol === "http:" || url.protocol === "https:") && url.origin !== window.location.origin;
    if (!isExternalHttp) {
      return;
    }
    const target = link.getAttribute("target")?.trim();
    if (target) {
      if (target.toLowerCase() === "_blank") {
        link.relList.add("noopener", "noreferrer");
      }
      return;
    }
    if (link.hasAttribute("download")) {
      return;
    }
    link.setAttribute("target", "_blank");
    link.relList.add("noopener", "noreferrer");
  });
}

function updateScrollState() {
  const y = getScrollY();
  if (y > lastScrollY + 1) {
    hasScrolledDown = true;
  }
  lastScrollY = y;
  document.body.classList.toggle("is-scrolled", y > SCROLL_THRESHOLD);
  updateNavBrandVisibility(y);
}

function scheduleScrollStateUpdate() {
  if (pendingScrollFrame !== null) {
    return;
  }
  pendingScrollFrame = requestAnimationFrame(() => {
    pendingScrollFrame = null;
    updateScrollState();
  });
}

function syncRestoredScrollState() {
  const y = getScrollY();
  if (y > SCROLL_THRESHOLD) {
    hasScrolledDown = true;
  }
  lastScrollY = y;
  scheduleScrollStateUpdate();
}

themeButtonList.forEach((button) => {
  button.addEventListener("click", () => setThemePreference(button.dataset.theme));
});
themeToggle?.addEventListener("keydown", handleThemeKeydown);

if (systemThemeQuery?.addEventListener) {
  systemThemeQuery.addEventListener("change", () => {
    if (currentThemePreference === "auto") {
      applyThemeByPreference(currentThemePreference);
    }
  });
}

window.addEventListener("scroll", scheduleScrollStateUpdate, { passive: true });
window.addEventListener("resize", scheduleScrollStateUpdate);
window.addEventListener("pageshow", syncRestoredScrollState);
initializeTheme();
enhanceExternalLinks(document);
updateScrollState();

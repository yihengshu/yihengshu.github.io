const mdTarget = document.getElementById("md");
const themeButtons = document.querySelectorAll(".theme-toggle button");

function setTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("theme-dark", isDark);
  localStorage.setItem("theme", theme);
  themeButtons.forEach((btn) => {
    const active = btn.dataset.theme === theme;
    btn.setAttribute("aria-pressed", String(active));
  });
}

function applyThemeByLocalTime() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    setTheme(saved);
    return;
  }
  const hour = new Date().getHours();
  const isNight = hour >= 19 || hour < 6;
  setTheme(isNight ? "dark" : "light");
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
  btn.addEventListener("click", () => setTheme(btn.dataset.theme));
});

applyThemeByLocalTime();
loadMarkdown();

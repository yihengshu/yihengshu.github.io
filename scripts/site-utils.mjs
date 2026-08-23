import { execFileSync } from "node:child_process";
import { stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const jekyllFrontMatter = "---\n---\n";
export const jekyllLastUpdated = '{% assign update_month = site.time | date: "%b" %}{{ update_month }}{% unless update_month == "May" %}.{% endunless %} {{ site.time | date: "%-d, %Y" }}';

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function requireNode24() {
  const major = Number.parseInt(process.versions.node.split(".")[0], 10);
  assert(major === 24, `Node.js 24 is required; found ${process.versions.node}.`);
}

export function runGit(args) {
  return execFileSync("git", args, { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
}

export function formatLastUpdated(dateString) {
  const date = new Date(dateString);
  assert(!Number.isNaN(date.getTime()), `Invalid content commit date: ${dateString}`);
  const timeZone = "America/New_York";
  const dateOptions = { day: "numeric", year: "numeric", timeZone };
  const shortMonth = new Intl.DateTimeFormat("en-US", { month: "short", timeZone }).format(date);
  const fullMonth = new Intl.DateTimeFormat("en-US", { month: "long", timeZone }).format(date);
  const formattedDate = new Intl.DateTimeFormat("en-US", { ...dateOptions, month: "short" }).format(date);
  return shortMonth === fullMonth ? formattedDate : formattedDate.replace(shortMonth, `${shortMonth}.`);
}

export async function requireRegularFile(filePath) {
  const fileStat = await stat(filePath);
  assert(fileStat.isFile(), `Expected a regular file: ${relative(rootDir, filePath)}`);
}

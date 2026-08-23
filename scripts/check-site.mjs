import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { assert, formatLastUpdated, requireNode24, requireRegularFile, rootDir, runGit } from "./site-utils.mjs";

const outputDir = join(rootDir, "_site");
const copiedFiles = ["app.js", "styles.css", "files/homepage.jpeg", "files/C.V.pdf", "files/EMNLP22poster.pdf", "files/EMNLP22slides.pdf"];
const expectedFiles = ["index.html", ...copiedFiles].sort();


async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = prefix ? join(prefix, entry.name) : entry.name;
    const absolutePath = join(directory, entry.name);
    assert(!entry.isSymbolicLink(), `Published output must not contain symbolic links: ${relativePath}`);
    if (entry.isDirectory()) files.push(...await listFiles(absolutePath, relativePath));
    else {
      assert(entry.isFile(), `Published output contains an unsupported entry: ${relativePath}`);
      files.push(relativePath.split(sep).join("/"));
    }
  }
  return files;
}

async function verifyCopiedFile(relativePath) {
  const [source, output] = await Promise.all([readFile(join(rootDir, relativePath)), readFile(join(outputDir, relativePath))]);
  assert(source.equals(output), `Published copy differs from its source: ${relativePath}`);
}

async function check() {
  requireNode24();
  await requireRegularFile(join(outputDir, "index.html"));
  const actualFiles = (await listFiles(outputDir)).sort();
  assert(JSON.stringify(actualFiles) === JSON.stringify(expectedFiles), `Unexpected published files. Expected ${expectedFiles.join(", ")}; found ${actualFiles.join(", ")}.`);
  await Promise.all(copiedFiles.map(verifyCopiedFile));
  const [indexHtml, rootIndexHtml, appSource] = await Promise.all([readFile(join(outputDir, "index.html"), "utf8"), readFile(join(rootDir, "index.html"), "utf8"), readFile(join(outputDir, "app.js"), "utf8")]);
  assert(indexHtml === rootIndexHtml, "The tracked root index.html differs from the generated deployment page; run npm run build.");
  assert(!indexHtml.includes("__CONTENT__"), "Generated index.html contains the content injection marker.");
  assert(!indexHtml.includes("{{LAST_UPDATED}}"), "Generated index.html contains the last-updated marker.");
  assert(!indexHtml.includes("cdn.jsdelivr.net/npm/marked"), "Generated index.html still loads Marked at runtime.");
  assert(!indexHtml.includes("api.github.com"), "Generated index.html contains a GitHub API dependency.");
  assert((indexHtml.match(/id="md"/g) ?? []).length === 1, "Generated index.html must contain exactly one #md element.");
  assert(indexHtml.includes("<h1>Yiheng Shu</h1>"), "Generated index.html does not contain the rendered page heading.");
  assert((indexHtml.match(/class="link-chip icon-only nav-icon-chip"/g) ?? []).length === 8, "Generated index.html must contain all eight profile links.");
  assert(indexHtml.includes('role="radio" aria-checked="true" tabindex="0" data-theme="auto"'), "The generated theme control lacks an accessible default state.");
  assert(indexHtml.includes("<script src=\"app.js\"></script>"), "Generated index.html does not load app.js.");
  assert(!appSource.includes("fetch(\"content.md\""), "Published app.js still fetches content.md at runtime.");
  assert(!appSource.includes("api.github.com"), "Published app.js still calls the GitHub API at runtime.");
  const commitDate = runGit(["log", "-1", "--format=%cI", "--", "content.md"]);
  assert(commitDate.length > 0, "Unable to find the latest content.md commit date.");
  assert(indexHtml.includes(`Last update: ${formatLastUpdated(commitDate)}`), "Generated index.html has an incorrect last-updated date.");
  process.stdout.write(`Verified ${actualFiles.length} published files in ${relative(rootDir, outputDir)}.\n`);
}

await check();

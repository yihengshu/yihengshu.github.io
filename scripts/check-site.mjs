import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { assert, formatLastUpdated, jekyllFrontMatter, jekyllLastUpdated, requireNode24, requireRegularFile, rootDir, runGit } from "./site-utils.mjs";

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

async function readWorkflowSources() {
  const workflowDir = join(rootDir, ".github/workflows");
  const workflowNames = (await readdir(workflowDir)).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"));
  return Promise.all(workflowNames.map(async (name) => ({ name, source: await readFile(join(workflowDir, name), "utf8") })));
}

async function check() {
  requireNode24();
  await requireRegularFile(join(outputDir, "index.html"));
  const actualFiles = (await listFiles(outputDir)).sort();
  assert(JSON.stringify(actualFiles) === JSON.stringify(expectedFiles), `Unexpected published files. Expected ${expectedFiles.join(", ")}; found ${actualFiles.join(", ")}.`);
  await Promise.all(copiedFiles.map(verifyCopiedFile));
  const [indexHtml, rootIndexSource, appSource, jekyllConfig, workflows] = await Promise.all([readFile(join(outputDir, "index.html"), "utf8"), readFile(join(rootDir, "index.html"), "utf8"), readFile(join(outputDir, "app.js"), "utf8"), readFile(join(rootDir, "_config.yml"), "utf8"), readWorkflowSources()]);
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
  const formattedCommitDate = formatLastUpdated(commitDate);
  assert(indexHtml.includes(`Last update: ${formattedCommitDate}`), "Generated index.html has an incorrect local-preview date.");
  assert(rootIndexSource.startsWith(jekyllFrontMatter), "The branch index lacks Jekyll front matter.");
  assert((rootIndexSource.split(jekyllLastUpdated).length - 1) === 1, "The branch index must contain exactly one Jekyll deployment-date expression.");
  const simulatedPagesHtml = rootIndexSource.slice(jekyllFrontMatter.length).replace(jekyllLastUpdated, formattedCommitDate);
  assert(simulatedPagesHtml === indexHtml, "The branch/Jekyll source differs from the verified local page outside its automatic date.");
  assert(jekyllConfig.includes("timezone: America/New_York"), "Jekyll must render dates in America/New_York.");
  for (const excludedPath of ["README.md", "content.md", "index.template.html", "package.json", "package-lock.json", "scripts", "node_modules", "vendor"]) {
    assert(jekyllConfig.includes(`  - ${excludedPath}`), `Jekyll does not exclude development source: ${excludedPath}`);
  }
  const verifyWorkflow = workflows.find(({ name }) => name === "verify.yml")?.source;
  assert(verifyWorkflow, "The repository lacks .github/workflows/verify.yml.");
  for (const { name, source } of workflows) {
    assert(!source.includes("deploy-pages"), `Workflow ${name} must not deploy a competing Pages artifact.`);
    assert(!source.includes("upload-pages-artifact"), `Workflow ${name} must not upload a competing Pages artifact.`);
  }
  assert(verifyWorkflow.includes("git diff --exit-code -- index.html"), "The verification workflow does not detect an uncommitted generated branch index.");
  process.stdout.write(`Verified ${actualFiles.length} published files in ${relative(rootDir, outputDir)}.\n`);
}

await check();

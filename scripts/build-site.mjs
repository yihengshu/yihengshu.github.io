import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { marked } from "marked";
import { assert, formatLastUpdated, jekyllFrontMatter, jekyllLastUpdated, requireNode24, requireRegularFile, rootDir, runGit } from "./site-utils.mjs";

const outputDir = join(rootDir, "_site");
const templatePath = join(rootDir, "index.template.html");
const rootIndexPath = join(rootDir, "index.html");
const contentPath = join(rootDir, "content.md");
const contentMarker = "__CONTENT__";
const lastUpdatedMarker = "{{LAST_UPDATED}}";
const jekyllDateMarker = "@@JEKYLL_LAST_UPDATED@@";
const publicFiles = ["app.js", "styles.css", "files/homepage.jpeg", "files/C.V.pdf", "files/EMNLP22poster.pdf", "files/EMNLP22slides.pdf"];

function countOccurrences(value, marker) {
  return value.split(marker).length - 1;
}

function renderMarkdown(markdownSource, lastUpdated) {
  const renderedContent = marked.parse(markdownSource.replace(lastUpdatedMarker, lastUpdated));
  assert(typeof renderedContent === "string" && renderedContent.length > 0, "Marked did not produce HTML content.");
  return renderedContent.trimEnd();
}

async function copyPublicFiles() {
  for (const sourceRelativePath of publicFiles) {
    const sourcePath = join(rootDir, sourceRelativePath);
    const destinationPath = join(outputDir, sourceRelativePath);
    await requireRegularFile(sourcePath);
    await mkdir(dirname(destinationPath), { recursive: true });
    await cp(sourcePath, destinationPath);
  }
}

async function build() {
  requireNode24();
  assert(dirname(outputDir) === rootDir && outputDir !== rootDir, "Refusing to use an unsafe output directory.");
  assert(runGit(["rev-parse", "--is-shallow-repository"]) === "false", "A complete Git history is required; fetch with --unshallow before building.");
  await Promise.all([requireRegularFile(templatePath), requireRegularFile(contentPath)]);
  const [template, markdownSource] = await Promise.all([readFile(templatePath, "utf8"), readFile(contentPath, "utf8")]);
  assert(countOccurrences(template, contentMarker) === 1, `Expected exactly one ${contentMarker} marker in index.template.html.`);
  assert(countOccurrences(markdownSource, lastUpdatedMarker) === 1, `Expected exactly one ${lastUpdatedMarker} marker in content.md.`);
  if (runGit(["status", "--porcelain", "--", "content.md"])) {
    process.stderr.write("Warning: the local preview date uses the latest content.md commit; GitHub Pages will use its Jekyll deployment time.\n");
  }
  const commitDate = runGit(["log", "-1", "--format=%cI", "--", "content.md"]);
  assert(commitDate.length > 0, "Unable to find the latest content.md commit date.");
  const formattedCommitDate = formatLastUpdated(commitDate);
  const deploymentIndexHtml = template.replace(contentMarker, renderMarkdown(markdownSource, formattedCommitDate));
  const branchContent = renderMarkdown(markdownSource, jekyllDateMarker).replace(jekyllDateMarker, jekyllLastUpdated);
  const branchIndexSource = jekyllFrontMatter + template.replace(contentMarker, branchContent);
  assert(!deploymentIndexHtml.includes(contentMarker), `Generated HTML still contains ${contentMarker}.`);
  assert(!deploymentIndexHtml.includes(lastUpdatedMarker), `Generated HTML still contains ${lastUpdatedMarker}.`);
  assert(!branchIndexSource.includes(contentMarker), `Branch index still contains ${contentMarker}.`);
  assert(!branchIndexSource.includes(lastUpdatedMarker), `Branch index still contains ${lastUpdatedMarker}.`);
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await Promise.all([writeFile(join(outputDir, "index.html"), deploymentIndexHtml, "utf8"), writeFile(rootIndexPath, branchIndexSource, "utf8")]);
  await copyPublicFiles();
  process.stdout.write(`Built ${relative(rootDir, outputDir)} with local content date ${formattedCommitDate}; branch Pages will render its deployment date.\n`);
}

await build();

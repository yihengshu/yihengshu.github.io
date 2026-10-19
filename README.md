# Yiheng Shu's homepage

Visit <https://yihengshu.github.io/>.

## Local build

The local build requires Node.js 24 and a non-shallow Git checkout because its preview date comes from the latest commit that changed `content.md`.

```sh
npm ci
npm run build
npm run check
python3 -m http.server 8000 --directory _site
```

Open <http://localhost:8000/>. The generated `_site` directory is the complete deployment artifact and is not committed.

`index.html` is the generated Jekyll source used by branch publishing. Edit `content.md` or `index.template.html`, then rerun the build instead of editing `index.html` directly.

To regenerate it automatically, enable the bundled pre-commit hook once per clone with `git config core.hooksPath .githooks`. When a commit stages `content.md`, `index.template.html`, `styles.css` or `app.js`, the hook rebuilds with Node.js 24 (through `npx node@24` if the local Node differs) and stages the new `index.html`. GitHub Pages replaces its Liquid expression with the deployment date; `_site/index.html` contains a concrete date for local preview.

## Deployment

The repository keeps its existing **Deploy from a branch** Pages source. GitHub's built-in Jekyll deployment renders the current date in the `America/New_York` timezone. The custom workflow only verifies the Node build and committed generated source, so it cannot race with or overwrite the Pages deployment.

# Yiheng Shu's homepage

Visit <https://yihengshu.github.io/>.

## Local build

The build requires Node.js 24 and a non-shallow Git checkout because the displayed update date comes from the latest commit that changed `content.md`.

```sh
npm ci
npm run build
npm run check
python3 -m http.server 8000 --directory _site
```

Open <http://localhost:8000/>. The generated `_site` directory is the complete deployment artifact and is not committed.

`index.html` is generated from `index.template.html` and kept as a transition-safe branch-publishing fallback. Edit `content.md` or the template, then rerun the build instead of editing `index.html` directly.

## Deployment

Pushes to `main` build and deploy the allowlisted static artifact through GitHub Actions. Configure the repository's Pages source as **GitHub Actions** under **Settings → Pages**.

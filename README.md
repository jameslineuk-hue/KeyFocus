# KeyFocus

KeyFocus is a tiny static-site pattern for reuniting lost keys with their owner. Each printed tag includes a URL to your deployed site and a unique KeyFocus code; when someone visits the link, the site shows only the contact details for the matching code.

This project is deliberately simple: plain HTML, CSS and vanilla JavaScript, with an optional JSON data file. It can be hosted on any static host (GitHub Pages, Netlify, Cloudflare Pages, S3/CloudFront, etc.).

## Project structure

- `index.html` — public landing page that explains how KeyFocus works, with no personal data.
- `details.html` — “found keys” page. It reads the `?code=` query string, looks up a matching profile, and shows the owner’s name and phone number.
- `generate.html` — profile generator used by the owner to mint new KeyFocus codes and JSON snippets.
- `js/keyfocus.js` — shared client-side helpers for generating/normalising codes and loading entries.
- `data/entries.json` — deployed map of KeyFocus codes to contact details.
- `styles.css` — shared styling for all pages.

## How it works

1. A KeyFocus profile is a simple JSON entry keyed by its code, for example:

   ```json
   {
     "KF-1027": {
       "name": "Andrew James",
       "phone": "07446871772"
     }
   }
   ```

2. `details.html` reads a `?code=KF-1027` parameter, normalises it using `window.KeyFocus.normalizeCode`, and loads all known entries from:
   - the deployed `data/entries.json` file (server entries), and
   - this browser’s `localStorage` (locally generated entries).
3. If a matching profile exists, it shows the owner’s name and a dialable phone link derived from `window.KeyFocus.telHrefFromPhone`. Otherwise it shows a friendly “code not recognised” state.

## Generating a new tag profile

Use `generate.html` locally or on your deployed site:

1. Open `generate.html` in your browser.
2. Fill in **Full name** and **Phone** and submit the form.
3. The page will:
   - Generate a random KeyFocus code such as `KF-ABCD12`.
   - Show a shareable link to `details.html?code=...` (you can turn this into a QR code for printing on the tag).
   - Display a JSON snippet under “New profile”.
   - Save the entry into `localStorage` for local testing.
   - If running the local Node server, also save the entry directly into `data/entries.json`.
4. For static deployments without the Node server, copy the JSON snippet into `data/entries.json` on your server and redeploy/invalidate any CDN cache.

## Editing `data/entries.json`

`data/entries.json` is a single JSON object whose keys are KeyFocus codes. A typical file with multiple entries looks like:

```json
{
  "KF-1027": { "name": "Andrew James", "phone": "07446871772" },
  "KF-ABCD12": { "name": "Sam Taylor", "phone": "07123456789" }
}
```

- Keep the outer braces and ensure keys are unique.
- Codes are case-insensitive on lookup but are stored in the normalised `KF-XXXXXX` form.

## Running locally

Because `details.html` and `js/keyfocus.js` use `fetch("data/entries.json")`, you should serve the files over HTTP rather than opening them via the `file://` protocol.

From the `KeyFocus` directory:

- **Node server with file persistence (recommended)**

  ```bash
  npm start
  ```

  Then open:
  - `http://127.0.0.1:8000/index.html`
  - `http://127.0.0.1:8000/generate.html`
  - `http://127.0.0.1:8000/details.html?code=KF-1027`

  This serves static files and adds `POST /api/entries`, used by `generate.html` to write to `data/entries.json`.

- **Python 3 (static only, no file writes from browser)**

  ```bash
  python -m http.server 8000
  ```

- **Node static server (static only, no file writes from browser)**

  ```bash
  npx serve .
  ```

When running purely from the file system without a server, `generate.html` will still work and store profiles in `localStorage`; `details.html` will then resolve codes from local storage only.

Notes:

- The **printable QR tag** on `generate.html` loads a QR image from an external service, so you’ll need an internet connection for the QR image to render (printing still works without it, but the QR may be blank).

## Deploying

Any static host that serves the files at a stable base URL will work.
If you need browser-driven writes into `data/entries.json`, use a Node host (for example Render web service mode):

1. Upload the contents of this directory (including the `data/` and `js/` folders).
2. Point your chosen domain or subdomain at the deployment.
3. Use `generate.html` to create profiles and update `data/entries.json` as needed.
4. Print tags that contain either the full finder URL or a QR code that encodes `https://your-domain.example/details.html?code=KF-XXXXXX`.

## Deploying to Render

This repo now includes a `render.yaml` blueprint for a Node web service deployment.

1. Push this project to a GitHub (or GitLab/Bitbucket) repository.
2. In Render, click **New +** -> **Blueprint**.
3. Connect your repo and select it.
4. Render will detect `render.yaml` and create a Node web service.
5. Confirm deploy.
6. After deploy, open:
   - `https://<your-render-domain>/` (redirects to `index.html`)
   - `https://<your-render-domain>/generate` (rewritten to `generate.html`)
   - `https://<your-render-domain>/details?code=KF-1027` (rewritten to `details.html`)

Notes:

- `render.yaml` runs `npm start`, which serves the app and enables `POST /api/entries`.
- The server supports friendly routes `/`, `/generate`, and `/details?code=...` without `.html`.
- Render web service filesystems are ephemeral; runtime writes to `data/entries.json` can be lost on restart/redeploy. Use git commits (or a real database) for permanent storage.
- You can add a custom domain in Render settings once deployment is live.

## Privacy notes

- The public landing page (`index.html`) never exposes any personal data.
- Only people with a full tag link (including the KeyFocus code) can see the matching contact details.
- All data is stored client-side in `data/entries.json` and, optionally, in the browser’s `localStorage` on devices where you generate profiles.

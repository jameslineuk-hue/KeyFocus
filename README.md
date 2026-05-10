# KeyFocus

KeyFocus is a small site for reuniting lost keys with their owner. Each tag includes a URL to your site and a unique KeyFocus code; the finder page shows only the contact details for that code.

The UI is plain HTML, CSS, and JavaScript. **Authoritative data can live in Supabase** (via a tiny Flask API) while `data/entries.json` remains available as a legacy or offline fallback, and the browser can still use `localStorage` when the API is unavailable.

## Project structure

- `index.html` — public landing page (no personal data).
- `details.html` — finder page; reads `?code=` and displays name and phone.
- `generate.html` — mint codes and links for tags.
- `js/keyfocus.js` — shared helpers and loading/saving logic.
- `data/entries.json` — optional static map of codes to profiles (used when no API is present or for seed data).
- `app.py` — Flask app: serves the static site and implements `GET/POST /api/entries` backed by Supabase.
- `requirements.txt` — Python dependencies (`flask`, `supabase`, `python-dotenv`, `gunicorn`).
- `supabase/schema.sql` — table + RLS policies to run once in the Supabase SQL editor.
- `styles.css` — shared styling.

## Supabase setup

1. In the Supabase dashboard, open **SQL** → **New query**, paste `supabase/schema.sql`, and run it.
2. In **Project Settings → API**, copy **Project URL** and the **anon** / **publishable** API key.
3. In the project root, copy `.env.example` to `.env` and set:

   - `SUPABASE_URL` — your project URL  
   - `SUPABASE_KEY` — your anon/publishable key (keep this secret; never commit `.env`)

   The Flask app uses the same key as your snippet with `create_client(...)`; tighten Row Level Security later if you expose this key elsewhere.

## How entry loading works

`window.KeyFocus.loadAllEntries()` merges three maps (later sources override earlier ones on duplicate codes):

1. `data/entries.json` (static file)
2. This browser’s `localStorage`
3. `GET /api/entries` when the Flask app is running (Supabase)

So when deployed with Flask + Supabase, Supabase wins for conflicts; the static JSON file is still useful for migration or backup.

## Running locally

Serve over HTTP (not `file://`) so `fetch` works.

### Flask + Supabase (recommended)

Use a virtual environment so dependencies stay isolated:

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then edit with your Supabase URL and key
python app.py
```

Then open:

- `http://127.0.0.1:5000/` — home  
- `http://127.0.0.1:5000/generate.html` — create profiles (saved to Supabase + `localStorage`)  
- `http://127.0.0.1:5000/details.html?code=KF-1027` — finder page  

Friendly routes: `/generate` and `/details` also work.

### Static only (no Supabase)

```bash
python -m http.server 8000
```

No `/api/entries` exists in this mode; only `data/entries.json` and `localStorage` apply.

Notes:

- The QR image on `generate.html` uses an external API; you need network access for the QR to load.

## Deploying (general)

1. Configure Supabase (schema + env vars) if using the API.
2. Host the Flask app on any Python-capable platform, **or** upload only the static files for a JSON/`localStorage`-only deployment.
3. Print tags with URLs like `https://your-domain.example/details.html?code=KF-XXXXXX` (or `/details?code=...` when using Flask routes).

## Deploying to Render

`render.yaml` defines a **Python** web service: `pip install -r requirements.txt` and `gunicorn --bind 0.0.0.0:$PORT app:app`.

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. In Render: **New +** → **Blueprint** → select the repo.
3. In the Render dashboard for the service, add **environment variables** `SUPABASE_URL` and `SUPABASE_KEY` (do not commit real keys to git).
4. Deploy, then open your service URL with `/`, `/generate`, or `/details?code=...`.

## Privacy notes

- The landing page does not expose personal data.
- Only people with a link that includes the KeyFocus code can open the matching profile on `details.html`.
- With Supabase enabled, contact rows live in your Supabase project; with static-only mode, data is in `data/entries.json` and optionally `localStorage` on devices that generated profiles.

## Optional: Supabase agent skills for AI tools

If you use tooling that supports Cursor-style skills, you can add Supabase’s skill pack (optional):

```bash
npx skills add supabase/agent-skills
```

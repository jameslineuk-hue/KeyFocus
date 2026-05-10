import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from flask import Flask, abort, jsonify, request, send_from_directory
from supabase import Client, create_client

load_dotenv()

ROOT = Path(__file__).resolve().parent
ALLOWED_SUFFIXES = frozenset({".html", ".css", ".js", ".json", ".ico", ".svg", ".png", ".webp"})

app = Flask(__name__)


def _supabase() -> Optional[Client]:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)


def _rows_to_map(rows: list) -> dict:
    out: dict = {}
    for row in rows or []:
        code = str(row.get("code", "")).strip().upper()
        if not code:
            continue
        out[code] = {
            "name": str(row.get("name", "")).strip(),
            "phone": str(row.get("phone", "")).strip(),
        }
    return out


@app.route("/api/entries", methods=["GET"])
def api_entries_get():
    sb = _supabase()
    if sb is None:
        return jsonify({})
    try:
        res = sb.table("keyfocus_entries").select("code,name,phone").execute()
        return jsonify(_rows_to_map(res.data))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/entries", methods=["POST"])
def api_entries_post():
    data = request.get_json(silent=True) or {}
    code = str(data.get("code", "")).strip().upper()
    name = str(data.get("name", "")).strip()
    phone = str(data.get("phone", "")).strip()
    if not code or not name or not phone:
        return jsonify({"error": "code, name, and phone are required"}), 400

    sb = _supabase()
    if sb is None:
        return jsonify({"error": "Supabase is not configured (missing SUPABASE_URL / SUPABASE_KEY)"}), 503

    try:
        sb.table("keyfocus_entries").upsert(
            {"code": code, "name": name, "phone": phone},
            on_conflict="code",
        ).execute()
        return jsonify({"ok": True, "code": code})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/")
def index_page():
    return send_from_directory(ROOT, "index.html")


@app.route("/generate")
def generate_short():
    return send_from_directory(ROOT, "generate.html")


@app.route("/details")
def details_short():
    return send_from_directory(ROOT, "details.html")


@app.route("/<path:filename>")
def static_site(filename):
    if filename.startswith("api"):
        abort(404)
    path = (ROOT / filename).resolve()
    try:
        path.relative_to(ROOT)
    except ValueError:
        abort(404)
    if not path.is_file():
        abort(404)
    ext = path.suffix.lower()
    if ext not in ALLOWED_SUFFIXES:
        abort(404)
    return send_from_directory(ROOT, filename)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(debug=True, host="127.0.0.1", port=port)

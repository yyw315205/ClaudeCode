# Environment Facts — Reference Before Any PowerShell Instructions

**Last updated: 2026-02-26**

---

## User's Environment

| Fact | Value |
|---|---|
| OS | Windows (exact version unconfirmed) |
| Shell | Windows PowerShell |
| Python launcher | `py` (NOT `python` — Microsoft Store alias blocks `python`) |
| Project root | `C:\Users\prfav\ClaudeCode\` |
| Backend path | `C:\Users\prfav\ClaudeCode\backend\` |
| Database file | `C:\Users\prfav\ClaudeCode\backend\crm.db` (SQLite) |
| Frontend path | Unknown — confirm before referencing |

---

## Python Rules

- **ALWAYS use `py`**, never `python` or `python3`
- Example: `py reset_password.py`, `py -m uvicorn ...`, `py -m pip ...`
- `python` will fail with "Python was not found; run without arguments to install from Microsoft Store"

---

## Backend File Structure (Confirmed)

The backend contains ONLY these Python files:
- `main.py` — FastAPI app, all auth logic lives here (`hash_password`, `verify_password`, JWT, etc.)
- `models.py` — SQLAlchemy models / table definitions
- `schemas.py` — Pydantic schemas
- `database.py` — DB engine and session setup
- `reset_password.py` — Standalone script to reset admin password

**There is NO `auth.py`, NO `security.py`, NO `utils.py`.**

---

## Database Facts

- Engine: SQLite
- File: `crm.db` in the backend folder
- Tables: `users`, `companies`, `contacts`, `deals`, `pipelines`, `pipeline_stages`, `properties`, `deal_contacts`, `deal_companies`
- On fresh DB: only `admin/admin` is seeded automatically. No other data.
- **Deleting crm.db wipes ALL data** — users, companies, contacts, deals, pipelines, custom fields

---

## Known Mistakes to Never Repeat

1. Do NOT use `python` — use `py`
2. Do NOT reference `auth` module — it does not exist
3. Do NOT write one-liners that import from non-existent modules
4. Do NOT suggest module paths without first checking the actual files in the backend
5. Always confirm file/module exists before referencing it in a command

---

## Clarifying Questions Still Outstanding

- [ ] Exact Windows version (Windows 10 / 11)?
- [ ] Where is Python installed? Run `py -c "import sys; print(sys.executable)"` to confirm
- [ ] Is there a virtual environment (`.venv` folder) in the backend?
- [ ] Frontend: where is it served from and how is it started?

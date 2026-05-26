#!/usr/bin/env python3
"""
Import orozep_full_dump.sql into the new Supabase project over a direct
Postgres connection (pg8000). The dump is read from disk, so none of the
data passes through the MCP/tool layer.

CONNECTION STRING
  Provide the new project's Postgres URI one of two ways:
    export DB_URL="postgresql://postgres:PASSWORD@db.dnxqulforkrworigllnv.supabase.co:5432/postgres"
  or put it on line 1 of:  supabase-export/.dbconn
  (Get it from Supabase dashboard -> Connect -> "Session pooler" or "Direct connection".)

Usage:
    python3 supabase-export/import_dump.py
"""
import os, re, ssl, sys
from pathlib import Path
from urllib.parse import urlparse, unquote
import pg8000.dbapi

ROOT = Path(__file__).resolve().parent.parent
DUMP = ROOT / "supabase-export" / "orozep_full_dump.sql"


def get_conn_uri() -> str:
    uri = os.environ.get("DB_URL", "").strip()
    if not uri:
        f = ROOT / "supabase-export" / ".dbconn"
        if f.exists():
            uri = f.read_text().strip().splitlines()[0].strip()
    if not uri:
        sys.exit("ERROR: no connection string. Set DB_URL or create supabase-export/.dbconn")
    return uri


def split_statements(sql: str):
    """Split SQL on ';' while respecting single-quoted strings ('' = escaped quote)."""
    stmts, buf, in_str = [], [], False
    i, n = 0, len(sql)
    while i < n:
        c = sql[i]
        buf.append(c)
        if c == "'":
            if in_str and i + 1 < n and sql[i + 1] == "'":
                buf.append("'"); i += 2; continue
            in_str = not in_str
        elif c == ";" and not in_str:
            stmt = "".join(buf).strip()
            if stmt and not stmt.lstrip().startswith("--"):
                stmts.append(stmt)
            buf = []
        i += 1
    tail = "".join(buf).strip()
    if tail and not tail.startswith("--"):
        stmts.append(tail)
    return stmts


def main():
    uri = get_conn_uri()
    p = urlparse(uri)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE  # Supabase requires SSL; skip CA hassle

    print(f"Connecting to {p.hostname}:{p.port or 5432} ...")
    conn = pg8000.dbapi.connect(
        user=unquote(p.username or ""),
        password=unquote(p.password or ""),
        host=p.hostname,
        port=p.port or 5432,
        database=(p.path or "/postgres").lstrip("/") or "postgres",
        ssl_context=ctx,
    )
    cur = conn.cursor()

    raw = DUMP.read_text()
    stmts = split_statements(raw)
    inserts = [s for s in stmts if s.upper().startswith("INSERT")]
    others = [s for s in stmts if not s.upper().startswith("INSERT")]
    print(f"Parsed {len(stmts)} statements ({len(others)} DDL/other, {len(inserts)} INSERT)")

    ok = 0
    failures = []
    for s in stmts:
        try:
            cur.execute(s)
            if s.upper().startswith("INSERT"):
                ok += 1
        except Exception as e:
            label = re.sub(r"\s+", " ", s)[:90]
            failures.append((label, str(e).replace("\n", " ")[:160]))
    conn.commit()
    cur.close()
    conn.close()

    print(f"\n--- DONE ---")
    print(f"INSERTs succeeded: {ok}/{len(inserts)}")
    if failures:
        print(f"Failures: {len(failures)}")
        for label, err in failures[:25]:
            print(f"  ! {label}\n      -> {err}")
    else:
        print("No failures.")


if __name__ == "__main__":
    main()

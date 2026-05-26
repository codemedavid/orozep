#!/usr/bin/env python3
"""
Load ONLY the cleaned orders file (chunks/02_orders_all_safe.sql) into the
target Supabase project over a direct Postgres connection (pg8000).
Catalog data is already imported via MCP; this handles the 607 orders.

Connection string (Supabase -> Connect -> "Session pooler" or "Direct"):
  export DB_URL="postgresql://postgres.<ref>:<password>@<host>:5432/postgres"
  or put it on line 1 of supabase-export/.dbconn

Statements already carry "ON CONFLICT DO NOTHING", so re-runs are safe.
"""
import os, re, sys, ssl
from pathlib import Path
from urllib.parse import urlparse, unquote
import pg8000.dbapi

ROOT = Path(__file__).resolve().parent
ORDERS = ROOT / "chunks" / "02_orders_all_safe.sql"


def get_uri() -> str:
    uri = os.environ.get("DB_URL", "").strip()
    if not uri:
        f = ROOT / ".dbconn"
        if f.exists():
            uri = f.read_text().strip().splitlines()[0].strip()
    if not uri:
        sys.exit("ERROR: no connection string. Set DB_URL or create supabase-export/.dbconn")
    return uri


def split_statements(sql: str):
    # statement boundary = ';' + newline immediately followed by 'INSERT INTO'
    parts = re.split(r'(?<=;)\n(?=INSERT INTO)', sql.strip())
    return [p for p in parts if p.strip()]


def connect(uri: str):
    u = urlparse(uri)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return pg8000.dbapi.connect(
        user=unquote(u.username or ""),
        password=unquote(u.password or ""),
        host=u.hostname,
        port=u.port or 5432,
        database=(u.path.lstrip("/") or "postgres"),
        ssl_context=ctx,
    )


def main():
    uri = get_uri()
    stmts = split_statements(ORDERS.read_text())
    print(f"orders statements parsed: {len(stmts)}")
    conn = connect(uri)
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM public.orders;")
    print("orders before:", cur.fetchone()[0])
    ok = 0
    for i, s in enumerate(stmts, 1):
        try:
            cur.execute(s)
            ok += 1
        except Exception as e:
            conn.rollback()
            sys.exit(f"FAILED at statement {i}: {e}\n--- stmt head ---\n{s[:300]}")
    conn.commit()
    cur.execute("SELECT count(*) FROM public.orders;")
    after = cur.fetchone()[0]
    # verification aggregates
    cur.execute("SELECT coalesce(sum(total_price),0), coalesce(sum(shipping_fee),0), "
                "coalesce(sum(discount_applied),0), md5(string_agg(id::text,'\n' ORDER BY id::text)) "
                "FROM public.orders;")
    st, sf, sd, idhash = cur.fetchone()
    print(f"executed ok: {ok}/{len(stmts)}")
    print("orders after:", after)
    print(f"sum total_price: {st}")
    print(f"sum shipping_fee: {sf}")
    print(f"sum discount_applied: {sd}")
    print(f"idhash: {idhash}")
    cur.close(); conn.close()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Migrate all Supabase Storage images to ImageKit, then produce a rewritten SQL dump.

PREREQUISITES
  1. The source Supabase project must NOT be egress-restricted (otherwise every
     download returns HTTP 402). Lift the restriction first, then run this.
  2. Provide your ImageKit PRIVATE key (not the public URL id) one of two ways:
        export IMAGEKIT_PRIVATE_KEY="private_xxxxxxxx"
     or put it on the first line of:  image-migration/.imagekit_key

WHAT IT DOES (resumable — safe to re-run)
  1. Reads every distinct Supabase storage URL out of the SQL dump.
  2. Downloads each file into  image-migration/downloads/<bucket>/<filename>
  3. Uploads each to ImageKit under folder  /<bucket>/  keeping the filename,
     producing  https://ik.imagekit.io/jl17byaav/<bucket>/<filename>
  4. Writes a mapping  image-migration/url_map.json  (old URL -> new URL)
  5. Emits  supabase-export/orozep_full_dump_imagekit.sql  with every URL swapped.
  6. Logs anything that failed to  image-migration/failures.log

Usage:
    python3 image-migration/migrate_images.py
"""
import os, re, json, base64, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DUMP = ROOT / "supabase-export" / "orozep_full_dump.sql"
OUT_DUMP = ROOT / "supabase-export" / "orozep_full_dump_imagekit.sql"
DL = ROOT / "image-migration" / "downloads"
MAP_FILE = ROOT / "image-migration" / "url_map.json"
FAIL_LOG = ROOT / "image-migration" / "failures.log"

IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/jl17byaav"
IMAGEKIT_UPLOAD = "https://upload.imagekit.io/api/v1/files/upload"
SUPABASE_HOST = "otheoohdoisalkvqynsn.supabase.co"

STORAGE_RE = re.compile(
    r"https://" + re.escape(SUPABASE_HOST) +
    r"/storage/v1/object/public/(?P<bucket>[^/]+)/(?P<name>[^\s'\"\\)]+)"
)


def get_private_key() -> str:
    key = os.environ.get("IMAGEKIT_PRIVATE_KEY", "").strip()
    if not key:
        kf = ROOT / "image-migration" / ".imagekit_key"
        if kf.exists():
            key = kf.read_text().strip().splitlines()[0].strip()
    if not key:
        sys.exit("ERROR: ImageKit private key not found. Set IMAGEKIT_PRIVATE_KEY "
                 "or create image-migration/.imagekit_key")
    return key


def collect_urls() -> dict:
    """Return {full_url: (bucket, name)} for every distinct storage URL in the dump."""
    text = DUMP.read_text()
    found = {}
    for m in STORAGE_RE.finditer(text):
        url = m.group(0).rstrip("',);")
        found[url] = (m.group("bucket"), m.group("name"))
    return found


def download(url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 0:
        return True  # resume: already have it
    dest.parent.mkdir(parents=True, exist_ok=True)
    code = subprocess.run(
        ["curl", "-s", "-L", "-o", str(dest), "-w", "%{http_code}", url],
        capture_output=True, text=True,
    ).stdout.strip()
    if code == "200" and dest.exists() and dest.stat().st_size > 0:
        # guard against the 402 JSON body being saved as a "file"
        head = dest.read_bytes()[:32]
        if head.lstrip().startswith(b"{") and dest.stat().st_size < 1000:
            dest.unlink(missing_ok=True)
            return False
        return True
    if code == "402":
        sys.exit("ABORT: Supabase returned 402 (egress quota / project restricted). "
                 "Lift the restriction before running this migration.")
    dest.unlink(missing_ok=True)
    return False


def upload(local: Path, bucket: str, name: str, auth_header: str) -> str | None:
    """Upload to ImageKit; return the new public URL or None on failure."""
    proc = subprocess.run(
        ["curl", "-s", "-X", "POST", IMAGEKIT_UPLOAD,
         "-H", auth_header,
         "-F", f"file=@{local}",
         "-F", f"fileName={name}",
         "-F", f"folder=/{bucket}",
         "-F", "useUniqueFileName=false",
         "-F", "overwriteFile=true"],
        capture_output=True, text=True,
    )
    try:
        resp = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return None
    return resp.get("url")


def main():
    key = get_private_key()
    auth_header = "Authorization: Basic " + base64.b64encode((key + ":").encode()).decode()

    urls = collect_urls()
    print(f"Found {len(urls)} distinct storage URLs in {DUMP.name}")

    url_map = json.loads(MAP_FILE.read_text()) if MAP_FILE.exists() else {}
    failures = []

    for i, (url, (bucket, name)) in enumerate(sorted(urls.items()), 1):
        if url in url_map:
            continue  # already migrated in a previous run
        local = DL / bucket / name
        print(f"[{i}/{len(urls)}] {bucket}/{name}", end=" ... ")
        if not download(url, local):
            print("DOWNLOAD FAILED")
            failures.append(("download", url))
            continue
        new_url = upload(local, bucket, name, auth_header)
        if not new_url:
            print("UPLOAD FAILED")
            failures.append(("upload", url))
            continue
        url_map[url] = new_url
        print("ok")
        if i % 25 == 0:  # checkpoint
            MAP_FILE.write_text(json.dumps(url_map, indent=2))

    MAP_FILE.write_text(json.dumps(url_map, indent=2))

    # rewrite the dump
    text = DUMP.read_text()
    for old, new in url_map.items():
        text = text.replace(old, new)
    OUT_DUMP.write_text(text)

    if failures:
        FAIL_LOG.write_text("\n".join(f"{kind}\t{u}" for kind, u in failures))

    print("\n--- SUMMARY ---")
    print(f"Migrated : {len(url_map)}/{len(urls)}")
    print(f"Failed   : {len(failures)}  (see {FAIL_LOG} )" if failures else "Failed   : 0")
    print(f"URL map  : {MAP_FILE}")
    print(f"New dump : {OUT_DUMP}")
    leftover = [u for u in urls if u not in url_map]
    if leftover:
        print(f"NOTE: {len(leftover)} URLs still un-migrated — re-run to retry them.")


if __name__ == "__main__":
    main()

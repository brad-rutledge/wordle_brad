
# build_words.py
# Combine SCOWL + ENABLE to produce a 5-letter words.json (lowercase, ASCII, deduped).
# Licenses: SCOWL (MIT-like) and ENABLE (Public Domain). See LICENSES.md.

import json, re, zipfile
from pathlib import Path
from urllib.request import urlopen

WORD_RE = re.compile(r"^[a-z]{5}$")

# Official sources:
SCOWL_ZIP_URL = "http://wordlist.aspell.net/dicts/SCOWL/SCOWL-2020.12.07.zip"  # SCOWL archive
ENABLE_TXT_URL = "https://raw.githubusercontent.com/rressler/data_raw_courses/main/enable1_words.txt"  # ENABLE mirror

WORKDIR = Path("._words_build")
SCOWL_SIZES = ["60", "70"]  # "common" + broader coverage
SCOWL_DIALECTS = ["american-english", "british-english"]  # include both dialects

def fetch(url: str, dest: Path):
  dest.parent.mkdir(parents=True, exist_ok=True)
  with urlopen(url) as r, dest.open("wb") as f:
    f.write(r.read())

def filter_5_letter(path: Path) -> set[str]:
  words = set()
  with path.open("r", encoding="utf-8", errors="ignore") as f:
    for line in f:
      w = line.strip().lower()
      if WORD_RE.match(w): words.add(w)
  return words

def main():
  WORKDIR.mkdir(exist_ok=True)

  # ENABLE
  enable_txt = WORKDIR / "enable1_words.txt"
  fetch(ENABLE_TXT_URL, enable_txt)
  enable_words = filter_5_letter(enable_txt)

  # SCOWL
  scowl_zip = WORKDIR / "scowl.zip"
  fetch(SCOWL_ZIP_URL, scowl_zip)
  with zipfile.ZipFile(scowl_zip, "r") as z:
    z.extractall(WORKDIR / "scowl")

  scowl_root = WORKDIR / "scowl" / "SCOWL-2020.12.07" / "wordlist"
  scowl_words = set()
  for dialect in SCOWL_DIALECTS:
    for size in SCOWL_SIZES:
      candidate = scowl_root / dialect / size
      if candidate.exists():
        scowl_words |= filter_5_letter(candidate)

  combined = sorted(enable_words | scowl_words)
  Path("words.json").write_text(json.dumps(combined, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
  print(f"Built words.json with {len(combined)} words.")

if __name__ == "__main__":
  main()
``
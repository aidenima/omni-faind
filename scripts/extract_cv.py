import json
import sys
from pathlib import Path

try:
  from PyPDF2 import PdfReader
except ImportError:
  print(json.dumps({"error": "PyPDF2 is not installed."}))
  sys.exit(1)


def guess_candidate_name(text: str) -> str:
  skip_keywords = {
    "location",
    "country",
    "phone",
    "email",
    "summary",
    "profile",
    "experience",
    "skills",
    "tech",
    "stack",
    "linkedin",
    "github",
    "contact",
  }

  lines = [
    line.strip()
    for line in text.splitlines()
    if line.strip() and len(line.strip()) <= 60
  ]

  for line in lines[:20]:
    normalized = line.split(":", 1)[-1].strip() if ":" in line else line
    lower = normalized.lower()
    if any(keyword in lower for keyword in skip_keywords):
      continue
    tokens = [
      token
      for token in normalized.split()
      if token.replace("-", "").isalpha()
    ]
    if len(tokens) >= 2:
      if len(tokens) == 2:
        formatted = " ".join(
          token[:1].upper() + token[1:].lower() for token in tokens
        )
        return formatted
      formatted = " ".join(
        token[:1].upper() + token[1:].lower() for token in tokens[:2]
      )
      return formatted

  words = [
    token
    for token in text.replace("\n", " ").split()
    if token.replace("-", "").isalpha()
  ]
  if len(words) >= 2:
    formatted = " ".join(
      words[i][:1].upper() + words[i][1:].lower() for i in range(2)
    )
    return formatted

  return ""


def extract_text(path: Path) -> str:
  reader = PdfReader(str(path))
  chunks = []
  for page in reader.pages:
    extracted = page.extract_text() or ""
    chunks.append(extracted)
  return "\n".join(chunks).strip()


def main() -> None:
  if len(sys.argv) < 2:
    print(json.dumps({"error": "Missing file path argument."}))
    sys.exit(1)

  file_path = Path(sys.argv[1])
  if not file_path.exists():
    print(json.dumps({"error": "File does not exist."}))
    sys.exit(1)

  try:
    text = extract_text(file_path)
  except Exception as exc:  # pragma: no cover - best effort logging
    print(json.dumps({"error": f"Failed to read PDF: {exc}"}))
    sys.exit(1)

  payload = {"text": text}
  candidate_name = guess_candidate_name(text)
  if candidate_name:
    payload["name"] = candidate_name

  sys.stdout.buffer.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))


if __name__ == "__main__":
  main()

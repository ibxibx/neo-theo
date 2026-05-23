"""
Rebrand all 'NeoTheo' / 'Neo-Theo' / 'Neotheo' mentions to 'neo-theo'
with markdown bold (**neo-theo**) where appropriate.

Rules:
- Skip inside fenced code blocks (```)
- Skip inside inline code (`...`)
- Skip URLs and identifier names (already lowercase + dashed)
- Apply bold ONLY when the word appears as a standalone brand reference in prose
"""

import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

MARKDOWN_FILES = [
    "README.md",
    "apps/dashboard/README.md",
    "docs/ARCHITECTURE.md",
    "docs/BUILD_PLAN.md",
    "docs/CATEGORIES_AND_ACTIONS.md",
    "docs/ELEVENLABS_SETUP.md",
    "docs/INQUIRIES_SAMPLES.md",
    "docs/JAN_FEEDBACK.md",
    "docs/THEO_NEGOTIATES.md",
    "docs/URGENCY_RULES.md",
    "docs/WYNAND_FEEDBACK.md",
    "packages/agent/system_prompt.md",
    "packages/agent/triage_prompt.md",
]

VARIANTS = [r"NeoTheo", r"Neo-Theo", r"Neotheo"]


def process_line(line: str, in_code_block: bool) -> tuple[str, int]:
    if in_code_block:
        return line, 0
    out = []
    count = 0
    parts = re.split(r"(`[^`]*`)", line)
    for i, part in enumerate(parts):
        if i % 2 == 1:
            out.append(part)
            continue
        new_part = part
        for variant in VARIANTS:
            pattern = re.compile(
                rf"(?<![A-Za-z0-9\-/_.]){variant}(?![A-Za-z0-9\-/_.])"
            )
            new_part, n = pattern.subn("**neo-theo**", new_part)
            count += n
        # Cleanup accidental double-bolding
        new_part = re.sub(r"\*\*\*\*neo-theo\*\*\*\*", "**neo-theo**", new_part)
        out.append(new_part)
    return "".join(out), count


def process_file(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    in_code = False
    out_lines = []
    total = 0
    for line in text.split("\n"):
        stripped = line.lstrip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_code = not in_code
            out_lines.append(line)
            continue
        new_line, count = process_line(line, in_code)
        out_lines.append(new_line)
        total += count
    new_text = "\n".join(out_lines)
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
    return total


if __name__ == "__main__":
    total_files = 0
    total_replacements = 0
    for rel in MARKDOWN_FILES:
        p = REPO / rel
        if not p.exists():
            print(f"  ? skip (not found): {rel}")
            continue
        n = process_file(p)
        if n > 0:
            print(f"  + {rel}: {n} replacement(s)")
            total_files += 1
            total_replacements += n
        else:
            print(f"  . {rel}: no changes")
    print(f"\nTotal: {total_replacements} replacements across {total_files} files.")

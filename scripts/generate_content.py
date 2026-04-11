from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parent.parent
SOURCE_FILE = ROOT / "content.md"
OUTPUT_FILE = ROOT / "content.generated.md"
TRACKED_PATH = "content.md"
PLACEHOLDER = "{{LAST_UPDATED}}"


def run_git_command(args: list[str]) -> str:
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


def format_last_updated(iso_date: str) -> str:
    year, month, day = iso_date.split("-")
    month_name = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."][int(month) - 1]
    return f"{month_name} {int(day)}, {year}"


def get_last_updated_date() -> str:
    iso_date = run_git_command(["git", "log", "-1", "--format=%cs", "--", TRACKED_PATH])
    if not iso_date:
        raise RuntimeError("No git commit date found for content.md.")
    return format_last_updated(iso_date)


def main() -> None:
    last_updated = get_last_updated_date()
    content = SOURCE_FILE.read_text(encoding="utf-8")
    if PLACEHOLDER not in content:
        raise RuntimeError("The last updated placeholder was not found in content.md.")
    OUTPUT_FILE.write_text(content.replace(PLACEHOLDER, last_updated), encoding="utf-8")


if __name__ == "__main__":
    main()

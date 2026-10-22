"""Stage a Public-repository Pages artifact without replacing existing paths.

Run from the repository root after checking out electrical-quiz/ and building it.
Only tracked files already outside the new app directory are preserved; only
the built public/ files from the app are published at /electrical-quiz/.
"""
from pathlib import Path
import shutil
import subprocess


def stage(root: Path) -> None:
    app = root / "electrical-quiz"
    built = app / "public"
    output = root / "_site"
    if not (built / "index.html").is_file():
        raise SystemExit("Build electrical-quiz/public before staging Pages.")
    if output.exists():
        raise SystemExit("_site already exists; use a clean checkout.")
    tracked = subprocess.check_output(
        ["git", "ls-files", "-z"], cwd=root
    ).decode().split("\0")
    output.mkdir()
    for name in tracked:
        if not name:
            continue
        relative = Path(name)
        if relative.parts[0] in {"electrical-quiz", ".github", ".gitignore"}:
            continue
        source = root / relative
        if source.is_symlink():
            raise SystemExit(f"Review tracked symlink before publication: {name}")
        if source.is_file():
            target = output / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
    shutil.copytree(built, output / "electrical-quiz")
    (output / ".nojekyll").touch()


if __name__ == "__main__":
    stage(Path.cwd())

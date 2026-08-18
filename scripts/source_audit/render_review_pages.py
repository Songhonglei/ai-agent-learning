import argparse
import json
import os
import subprocess
import tempfile
from pathlib import Path

from scripts.source_audit.models import (
    AuditValidationError,
    assert_distinct_paths,
    validate_index,
)


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def all_page_numbers(index: dict) -> list[int]:
    pages = [item["pdfPage"] for item in index.get("pages", [])]
    expected = list(range(1, len(pages) + 1))
    if sorted(pages) != expected:
        raise AuditValidationError(
            "index pages must be continuous from 1"
        )
    return expected


def _validated_page_numbers(pages) -> list[int]:
    validated = []
    for page in pages:
        if type(page) is not int or page < 1:
            raise AuditValidationError(
                f"page numbers must be positive integers: {page!r}"
            )
        validated.append(page)
    return sorted(set(validated))


def parse_page_selection(value: str) -> list[int]:
    if not value:
        raise AuditValidationError("page selection must not be empty")

    pages = []
    for raw_page in value.split(","):
        page_text = raw_page.strip()
        try:
            page = int(page_text)
        except ValueError as error:
            raise AuditValidationError(f"invalid page selection: {raw_page!r}") from error
        pages.append(page)
    return _validated_page_numbers(pages)


def review_page_numbers(index: dict) -> list[int]:
    pages = [
        item["pdfPage"]
        for item in index.get("pages", [])
        if item.get("charCount") == 0
        or any(item.get("symbolCounts", {}).values())
    ]
    pages.extend(item["pdfPage"] for item in index.get("numberedItems", []))
    return _validated_page_numbers(pages)


def _paths_refer_to_same_file(first: Path, second: Path) -> bool:
    if os.path.abspath(first) == os.path.abspath(second):
        return True
    try:
        return os.path.samefile(first, second)
    except OSError:
        return False


def _reject_source_alias(pdf_path: Path, output_path: Path) -> None:
    if _paths_refer_to_same_file(pdf_path, output_path):
        raise AuditValidationError(
            f"rendered PNG path aliases source PDF: {output_path}"
        )


def _require_png(path: Path) -> None:
    if not path.is_file():
        raise AuditValidationError(f"rendered PNG is missing: {path}")
    if path.is_symlink():
        raise AuditValidationError(f"rendered PNG has an invalid signature: {path}")
    with path.open("rb") as file:
        signature = file.read(8)
    if signature != PNG_SIGNATURE:
        raise AuditValidationError(f"rendered PNG has an invalid signature: {path}")


def render_pages(
    pdf_path: Path,
    pages: list[int],
    output_dir: Path,
    pdftoppm: str,
    dpi: int = 120,
    protected_inputs: dict[str, Path] | None = None,
) -> list[Path]:
    validated_pages = _validated_page_numbers(pages)
    if type(dpi) is not int or dpi < 1:
        raise AuditValidationError(f"DPI must be a positive integer: {dpi!r}")

    final_pngs = {
        page: output_dir / f"page-{page:03d}.png" for page in validated_pages
    }
    paths_to_validate = {"source PDF": pdf_path}
    paths_to_validate.update(
        {
            f"protected input {position} ({name})": path
            for position, (name, path) in enumerate(
                (protected_inputs or {}).items(), start=1
            )
        }
    )
    paths_to_validate.update(
        {
            f"rendered PNG for page {page}": final_png
            for page, final_png in final_pngs.items()
        }
    )
    assert_distinct_paths(paths_to_validate)

    output_dir.mkdir(parents=False, exist_ok=True)
    rendered = []
    for page in validated_pages:
        final_png = final_pngs[page]
        with tempfile.TemporaryDirectory(
            prefix=f".page-{page:03d}-", dir=output_dir
        ) as temporary_directory:
            temporary_prefix = Path(temporary_directory) / "render"
            temporary_png = temporary_prefix.with_suffix(".png")
            subprocess.run(
                [
                    pdftoppm,
                    "-f",
                    str(page),
                    "-l",
                    str(page),
                    "-singlefile",
                    "-png",
                    "-r",
                    str(dpi),
                    str(pdf_path),
                    str(temporary_prefix),
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            _require_png(temporary_png)
            _reject_source_alias(pdf_path, temporary_png)
            _reject_source_alias(pdf_path, final_png)
            os.replace(temporary_png, final_png)
        rendered.append(final_png)
    return rendered


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Render PDF pages for visual audit")
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--index", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--pdftoppm", default="pdftoppm")
    parser.add_argument("--dpi", type=int, default=120)
    parser.add_argument("--pages")
    args = parser.parse_args(argv)

    index = json.loads(Path(args.index).read_text(encoding="utf-8"))
    pages = (
        parse_page_selection(args.pages)
        if args.pages is not None
        else review_page_numbers(index)
    )
    render_pages(
        Path(args.pdf),
        pages,
        Path(args.output_dir),
        args.pdftoppm,
        args.dpi,
        protected_inputs={"index": Path(args.index)},
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

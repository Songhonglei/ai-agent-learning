import hashlib
import json
import os
import unicodedata
from itertools import combinations
from pathlib import Path


APPROVED_PDF_SHA256 = (
    "27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac"
)
DISPOSITIONS = {"included", "compressed", "excluded", "missing", "unreviewed"}
VISUAL_CLASSES = {"semantic-core", "evidence", "decorative"}
VISUAL_HANDLINGS = {"reuse", "redraw", "text-alt", "omit"}
NUMBERED_KINDS = {"figure", "table", "experiment"}
ALL_KINDS = NUMBERED_KINDS | {"page", "outline"}


class AuditValidationError(ValueError):
    pass


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def assert_expected_sha256(path: Path, expected_sha256: str) -> str:
    if not path.is_file():
        raise AuditValidationError(f"source file not found: {path}")
    actual_sha256 = sha256_file(path)
    if actual_sha256 != expected_sha256.lower():
        raise AuditValidationError(
            "source fingerprint mismatch: "
            f"expected {expected_sha256}, got {actual_sha256}"
        )
    return actual_sha256


def _normalized_path_key(path: Path) -> str:
    resolved = path.resolve(strict=False)
    return unicodedata.normalize("NFC", str(resolved)).casefold()


def paths_conflict(first: Path, second: Path) -> bool:
    if _normalized_path_key(first) == _normalized_path_key(second):
        return True
    if first.exists() and second.exists():
        try:
            return os.path.samefile(first, second)
        except OSError:
            return False
    return False


def assert_distinct_paths(paths: dict[str, Path]) -> None:
    for (first_name, first_path), (second_name, second_path) in combinations(
        paths.items(), 2
    ):
        if paths_conflict(first_path, second_path):
            raise AuditValidationError(
                f"path conflict: {first_name} and {second_name} "
                "must refer to different files"
            )


def stable_source_id(kind, number=None, pdf_page=None, ordinal=None):
    if kind in NUMBERED_KINDS and number:
        return f"{kind}-{number}"
    if kind == "page" and pdf_page is not None:
        return f"page-{pdf_page:03d}"
    if kind == "outline" and pdf_page is not None and ordinal is not None:
        return f"outline-{pdf_page:03d}-{ordinal:03d}"
    raise AuditValidationError(f"cannot build source id for kind={kind!r}")


def load_json(path: Path) -> object:
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def write_json_deterministic(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def all_source_items(index: dict) -> list[dict]:
    return [
        item
        for collection_name in ("pages", "outline", "numberedItems")
        for item in index.get(collection_name, [])
    ]


def validate_index(index: dict) -> None:
    if not isinstance(index, dict):
        raise AuditValidationError("index must be an object")
    seen_ids = set()
    for collection_name in ("pages", "outline", "numberedItems"):
        collection = index.get(collection_name, [])
        if not isinstance(collection, list):
            raise AuditValidationError(f"index.{collection_name} must be a list")
        for item in collection:
            if not isinstance(item, dict) or not item.get("sourceId"):
                raise AuditValidationError("each source item must have a sourceId")
            if "kind" in item and item["kind"] not in ALL_KINDS:
                raise AuditValidationError(f"invalid source kind: {item.get('kind')}")
            source_id = item["sourceId"]
            if source_id in seen_ids:
                raise AuditValidationError(f"duplicate source id: {source_id}")
            seen_ids.add(source_id)


def validate_decisions(
    index: dict, decisions: list[dict], require_complete: bool = False
) -> None:
    validate_index(index)
    if not isinstance(decisions, list):
        raise AuditValidationError("decisions must be a list")

    source_items_by_id = {
        item["sourceId"]: item for item in all_source_items(index)
    }
    source_ids = set(source_items_by_id)
    decision_ids = set()
    for decision in decisions:
        if not isinstance(decision, dict):
            raise AuditValidationError("each decision must be an object")
        source_id = decision.get("sourceId")
        if source_id in decision_ids:
            raise AuditValidationError(f"duplicate decision id: {source_id}")
        if source_id not in source_ids:
            raise AuditValidationError(f"unknown source id: {source_id}")
        decision_ids.add(source_id)

        disposition = decision.get("disposition")
        if disposition not in DISPOSITIONS:
            raise AuditValidationError(f"invalid disposition: {disposition}")
        reason = decision.get("reason")
        if disposition in {"excluded", "missing"} and (
            not isinstance(reason, str) or not reason.strip()
        ):
            raise AuditValidationError(
                f"{disposition} decisions require a non-empty string reason"
            )

        for field in ("lessonIds", "markdownRefs"):
            if field not in decision or not isinstance(decision[field], list):
                raise AuditValidationError(
                    f"{field} must be an array: {source_id}"
                )
            if any(
                not isinstance(value, str) or not value.strip()
                for value in decision[field]
            ):
                raise AuditValidationError(
                    f"{field} members must be non-blank strings: {source_id}"
                )

        review_state = decision.get("reviewState")
        if review_state not in {"reviewed", "unreviewed"}:
            raise AuditValidationError(f"invalid reviewState: {review_state}")
        if review_state != "unreviewed" and disposition == "unreviewed":
            raise AuditValidationError("reviewed records require a final disposition")

        visual_class = decision.get("visualClass")
        if visual_class is not None and visual_class not in VISUAL_CLASSES:
            raise AuditValidationError(f"invalid visual class: {visual_class}")
        visual_handling = decision.get("visualHandling")
        if visual_handling is not None and visual_handling not in VISUAL_HANDLINGS:
            raise AuditValidationError(f"invalid visual handling: {visual_handling}")
        if (
            "captionConflictResolved" in decision
            and not isinstance(decision["captionConflictResolved"], bool)
        ):
            raise AuditValidationError(
                f"captionConflictResolved must be a bool: {source_id}"
            )
        if (
            "captionConflictNote" in decision
            and not isinstance(decision["captionConflictNote"], str)
        ):
            raise AuditValidationError(
                f"captionConflictNote must be a string: {source_id}"
            )

    if not require_complete:
        return

    if any(
        decision.get("reviewState") == "unreviewed"
        or decision.get("disposition") == "unreviewed"
        for decision in decisions
    ):
        raise AuditValidationError("complete validation rejects unreviewed decisions")
    if decision_ids != source_ids:
        raise AuditValidationError("complete validation requires every source item")

    for decision in decisions:
        source_id = decision["sourceId"]
        item = source_items_by_id[source_id]
        kind = item.get("kind")
        if kind in {"figure", "table"} and (
            decision.get("visualClass") is None
            or decision.get("visualHandling") is None
        ):
            raise AuditValidationError(
                f"reviewed {kind} {source_id} requires "
                "visualClass and visualHandling"
            )

        lesson_ids = decision["lessonIds"]
        has_lesson_placement = bool(lesson_ids)
        used_in_course = (
            decision.get("disposition") in {"included", "compressed", "missing"}
            or has_lesson_placement
        )
        if (
            decision.get("visualClass") == "semantic-core"
            and decision.get("visualHandling") == "omit"
            and used_in_course
        ):
            raise AuditValidationError(
                "semantic-core course visuals cannot be omitted"
            )

        if decision.get("disposition") == "missing":
            if not has_lesson_placement:
                raise AuditValidationError(
                    f"missing decision {source_id} requires at least one "
                    "non-empty lessonId"
                )

        if item.get("captionConflict") is True:
            if decision.get("captionConflictResolved") is not True:
                raise AuditValidationError(
                    f"caption conflict {source_id} requires "
                    "captionConflictResolved=true"
                )
            note = decision.get("captionConflictNote")
            if not isinstance(note, str) or not note.strip():
                raise AuditValidationError(
                    f"caption conflict {source_id} requires a non-empty "
                    "captionConflictNote"
                )

from __future__ import annotations

import hashlib
import json
import os
import stat
import tempfile
import unicodedata
from pathlib import Path

from scripts.source_audit.models import AuditValidationError, assert_distinct_paths


def _pending(name):
    raise NotImplementedError(name)


def deterministic_json_bytes(value: object) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    ).encode("utf-8")


def sha256_json(value: object) -> str:
    return hashlib.sha256(deterministic_json_bytes(value)).hexdigest()


def _stage_bytes(target: Path, payload: bytes, mode: int) -> Path:
    target.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{target.name}.", suffix=".tmp", dir=target.parent,
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as staged:
            staged.write(payload)
            staged.flush()
            os.fsync(staged.fileno())
        os.chmod(temporary, mode)
        return temporary
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise


def _normalized_transaction_values(values_by_path):
    if not isinstance(values_by_path, dict):
        raise TypeError("values_by_path must be a dict")
    normalized = {}
    for raw_path, payload in values_by_path.items():
        path = Path(raw_path)
        if not isinstance(payload, bytes):
            raise TypeError(f"transaction payload must be bytes: {path}")
        if path.exists() and not path.is_file():
            raise AuditValidationError(f"transaction target must be a file: {path}")
        normalized[path] = payload
    assert_distinct_paths({
        f"transaction-target-{position}": path
        for position, path in enumerate(normalized, start=1)
    })
    return normalized


def _ordered_transaction_paths(normalized):
    return sorted(
        normalized,
        key=lambda path: unicodedata.normalize(
            "NFC", str(path.resolve(strict=False))
        ).casefold(),
    )


def _transaction_snapshots(ordered):
    return {
        path: {
            "existed": path.exists(),
            "bytes": path.read_bytes() if path.exists() else b"",
            "mode": stat.S_IMODE(path.stat().st_mode) if path.exists() else 0o644,
        }
        for path in ordered
    }


def _restore_committed_paths(committed, snapshots):
    rollback_error = None
    for path in reversed(committed):
        snapshot = snapshots[path]
        try:
            if snapshot["existed"]:
                restore = _stage_bytes(path, snapshot["bytes"], snapshot["mode"])
                try:
                    os.replace(restore, path)
                finally:
                    restore.unlink(missing_ok=True)
            else:
                path.unlink(missing_ok=True)
        except BaseException as error:
            rollback_error = rollback_error or error
    return rollback_error


def write_files_transaction(values_by_path: dict[Path, bytes]) -> None:
    normalized = _normalized_transaction_values(values_by_path)
    ordered = _ordered_transaction_paths(normalized)
    snapshots = _transaction_snapshots(ordered)
    staged: dict[Path, Path] = {}
    all_temporaries: list[Path] = []
    committed: list[Path] = []
    try:
        for path in ordered:
            staged[path] = _stage_bytes(path, normalized[path], snapshots[path]["mode"])
            all_temporaries.append(staged[path])
        for path in ordered:
            os.replace(staged[path], path)
            committed.append(path)
            staged.pop(path, None)
    except BaseException as original_error:
        rollback_error = _restore_committed_paths(committed, snapshots)
        if rollback_error is not None:
            raise RuntimeError(
                "transaction failed and rollback was incomplete"
            ) from rollback_error
        raise original_error
    finally:
        for temporary in all_temporaries:
            temporary.unlink(missing_ok=True)
        for temporary in staged.values():
            temporary.unlink(missing_ok=True)


def write_json_transaction(values_by_path: dict[Path, object]) -> None:
    if not isinstance(values_by_path, dict):
        raise TypeError("values_by_path must be a dict")
    assert_distinct_paths({
        f"transaction-target-{position}": Path(path)
        for position, path in enumerate(values_by_path, start=1)
    })
    write_files_transaction({
        Path(path): deterministic_json_bytes(value)
        for path, value in values_by_path.items()
    })

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

from scripts.source_audit.decisions import (
    upgrade_editorial_decisions,
    validate_editorial_decisions,
)
from scripts.source_audit.models import (
    AuditValidationError,
    load_json,
    paths_conflict,
)
from scripts.source_audit.review_ledger import (
    build_genesis_ledger_entry,
)
from scripts.source_audit.transactions import (
    deterministic_json_bytes,
    sha256_json,
    write_files_transaction,
)

def _assert_preserved_fields(old, new):
    for field, value in old.items():
        if new.get(field) != value:
            raise AuditValidationError(
                f"migration overwrote {field}: {old['sourceId']}"
            )


def _build_parser():
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", required=True)
    parser.add_argument("--visuals", required=True)
    parser.add_argument("--decisions", required=True)
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--policy", required=True)
    parser.add_argument(
        "--expected-source-count", required=True, type=int
    )
    parser.add_argument(
        "--expected-unreviewed-count", required=True, type=int
    )
    return parser


def _migration_role_paths(args):
    return {
        "index": Path(args.index),
        "visuals": Path(args.visuals),
        "policy": Path(args.policy),
        "decisionsInput": Path(args.decisions),
        "decisionsOutput": Path(args.decisions),
        "ledgerInput": Path(args.ledger),
        "ledgerOutput": Path(args.ledger),
    }


def _run_migration_command(args):
    index = load_json(Path(args.index))
    visuals = load_json(Path(args.visuals))
    decisions = load_json(Path(args.decisions))
    ledger = load_json(Path(args.ledger))
    policy = load_json(Path(args.policy))
    _validate_migration_preconditions(
        visuals,
        decisions,
        args.expected_source_count,
        args.expected_unreviewed_count,
    )
    migrated, genesis = migrate_with_genesis(
        index, visuals, decisions, ledger, policy
    )
    _write_migration_outputs(
        args.decisions,
        args.ledger,
        migrated,
        genesis,
    )
    return {
        "status": "migrated",
        "sourceCount": len(migrated),
        "unreviewedCount": sum(
            row["reviewState"] == "unreviewed"
            for row in migrated
        ),
        "decisionsSha256": sha256_json(migrated),
    }


def _validate_migration_paths(role_paths):
    allowed_pairs = {
        frozenset({"decisionsInput", "decisionsOutput"}),
        frozenset({"ledgerInput", "ledgerOutput"}),
    }
    roles = sorted(role_paths)
    for offset, left in enumerate(roles):
        for right in roles[offset + 1:]:
            if not paths_conflict(
                Path(role_paths[left]),
                Path(role_paths[right]),
            ):
                continue
            if frozenset({left, right}) in allowed_pairs:
                continue
            raise AuditValidationError(
                f"path alias: {left} and {right}"
            )


def _validate_migration_preconditions(
    visuals,
    decisions,
    expected_source_count,
    expected_unreviewed_count,
):
    if visuals:
        raise AuditValidationError(
            "visual catalog must be empty for baseline migration"
        )
    if len(decisions) != expected_source_count:
        raise AuditValidationError(
            "expected source count mismatch"
        )
    unreviewed = sum(
        row.get("reviewState", "unreviewed") == "unreviewed"
        for row in decisions
    )
    if unreviewed != expected_unreviewed_count:
        raise AuditValidationError(
            "expected unreviewed count mismatch"
        )


def _write_migration_outputs(
    decisions_path,
    ledger_path,
    decisions,
    ledger,
):
    write_files_transaction({
        Path(decisions_path): deterministic_json_bytes(decisions),
        Path(ledger_path): deterministic_json_bytes(ledger),
    })


def main(argv=None):
    args = _build_parser().parse_args(argv)
    try:
        _validate_migration_paths(_migration_role_paths(args))
        result = _run_migration_command(args)
        print(json.dumps(
            result, ensure_ascii=False, sort_keys=True
        ))
        return 0
    except AuditValidationError as error:
        print(str(error), file=sys.stderr)
        return 2


def migrate(index, visuals, decisions):
    before = copy.deepcopy(decisions)
    migrated = upgrade_editorial_decisions(
        index, visuals, copy.deepcopy(decisions)
    )
    if len(before) != len(migrated):
        raise AuditValidationError(
            "migration changed decision count"
    )
    for old, new in zip(before, migrated, strict=True):
        _assert_preserved_fields(old, new)
        if (
            new["reviewState"] != "unreviewed"
            or new["disposition"] != "unreviewed"
        ):
            raise AuditValidationError(
                "migration made editorial decision: "
                f"{new['sourceId']}"
            )
    if migrated == before:
        return before
    return migrated


def migrate_with_genesis(
    index,
    visuals,
    decisions,
    ledger,
    policy,
):
    migrated = migrate(index, visuals, decisions)
    baseline_hash = sha256_json(migrated)
    expected = [
        build_genesis_ledger_entry(
            baseline_hash, len(migrated)
        )
    ]
    if ledger not in ([], expected):
        raise AuditValidationError(
            "ledger is not empty or matching genesis"
        )
    validate_editorial_decisions(
        index, visuals, migrated, policy
    )
    return migrated, expected


if __name__ == "__main__":
    raise SystemExit(main())

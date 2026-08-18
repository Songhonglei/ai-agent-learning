from __future__ import annotations

import copy
import re
from pathlib import Path, PurePosixPath

from scripts.source_audit.catalog import source_items_by_id
from scripts.source_audit.decisions import (
    APPROVED_CAPTION_CONFLICT_SOURCE_IDS,
    validate_editorial_record,
)
from scripts.source_audit.models import (
    AuditValidationError,
    load_json,
    sha256_file,
)
from scripts.source_audit.render_review_pages import review_page_numbers
from scripts.source_audit.transactions import (
    deterministic_json_bytes,
    sha256_json,
)


def compare_review_patches(
    primary: dict,
    secondary: dict,
) -> list[dict]:
    primary_by_id = {}
    for record in primary["changes"]:
        source_id = record["sourceId"]
        if source_id in primary_by_id:
            raise AuditValidationError(
                f"duplicate patch sourceId: {source_id}"
            )
        primary_by_id[source_id] = record
    secondary_by_id = {}
    for record in secondary["changes"]:
        source_id = record["sourceId"]
        if source_id in secondary_by_id:
            raise AuditValidationError(
                f"duplicate patch sourceId: {source_id}"
            )
        secondary_by_id[source_id] = record
    disagreements = []
    shared_ids = primary_by_id.keys() & secondary_by_id.keys()
    for source_id in sorted(shared_ids):
        fields = sorted(
            field
            for field in (
                set(primary_by_id[source_id])
                | set(secondary_by_id[source_id])
            )
            if primary_by_id[source_id].get(field)
            != secondary_by_id[source_id].get(field)
        )
        if fields:
            disagreements.append({
                "sourceId": source_id,
                "fields": fields,
            })
    return disagreements


def _validated_decisions_by_id(decisions, source_map):
    if not isinstance(decisions, list):
        raise AuditValidationError("decisions must be a list")
    decisions_by_id = {}
    ordered_ids = []
    for position, decision in enumerate(decisions):
        if not isinstance(decision, dict):
            raise AuditValidationError(
                f"decision at position {position} must be an object"
            )
        source_id = decision.get("sourceId")
        if not isinstance(source_id, str) or not source_id.strip():
            raise AuditValidationError(
                "decision sourceId must be non-blank"
            )
        if source_id in decisions_by_id:
            raise AuditValidationError(
                f"duplicate decision sourceId: {source_id}"
            )
        if source_id not in source_map:
            raise AuditValidationError(
                f"decision references unknown sourceId: {source_id}"
            )
        decisions_by_id[source_id] = decision
        ordered_ids.append(source_id)
    if ordered_ids != sorted(ordered_ids):
        raise AuditValidationError(
            "decisions must use sourceId order"
        )
    if set(decisions_by_id) != set(source_map):
        missing = sorted(set(source_map) - set(decisions_by_id))
        extra = sorted(set(decisions_by_id) - set(source_map))
        raise AuditValidationError(
            "decision source set mismatch: "
            f"missing={missing}, extra={extra}"
        )
    return decisions_by_id


def _validated_caption_conflict_source_ids(
    conflicts,
    catalog_source_ids,
):
    expected = list(APPROVED_CAPTION_CONFLICT_SOURCE_IDS)
    if conflicts != expected:
        raise AuditValidationError(
            "captionConflictSourceIds differ from approved 21-ID baseline"
        )
    missing = sorted(set(expected) - set(catalog_source_ids))
    if missing:
        raise AuditValidationError(
            "captionConflictSourceIds are outside frozen catalog: "
            f"{missing}"
        )
    return expected


def _validate_manifest_selection(
    manifest,
    index,
    visuals,
    decisions,
    ledger,
    policy,
):
    if any(
        entry.get("batchId") == manifest["batchId"]
        for entry in ledger
    ):
        raise AuditValidationError(
            f"duplicate batchId: {manifest['batchId']}"
        )
    for name in ("pages", "sourceIds"):
        if manifest[name] != sorted(set(manifest[name])):
            raise AuditValidationError(
                f"manifest {name} must be sorted and unique"
            )
    source_map = source_items_by_id(index, visuals)
    _validated_caption_conflict_source_ids(
        policy.get("captionConflictSourceIds"),
        source_map,
    )
    decisions_by_id = _validated_decisions_by_id(
        decisions,
        source_map,
    )
    selected_pages = set(manifest["pages"])
    expected_source_ids = sorted(
        source_id
        for source_id, item in source_map.items()
        if decisions_by_id[source_id]["reviewState"] == "unreviewed"
        and any(
            item["pdfPage"] == page
            or any(
                occurrence["pdfPage"] == page
                for occurrence in item.get("occurrences", [])
            )
            for page in selected_pages
        )
    )
    if manifest["mode"] == "calibration" and (
        manifest["sourceIds"] != expected_source_ids
    ):
        raise AuditValidationError(
            "manifest omits or adds assigned unreviewed sources"
        )
    if manifest["mode"] == "normal":
        unknown_sources = sorted(set(manifest["sourceIds"]) - set(source_map))
        if unknown_sources:
            raise AuditValidationError(
                f"manifest assigns unknown sources: {unknown_sources}"
            )
        reviewed_sources = sorted(
            source_id for source_id in manifest["sourceIds"]
            if decisions_by_id[source_id]["reviewState"] != "unreviewed"
        )
        if reviewed_sources:
            raise AuditValidationError(
                f"manifest assigns reviewed IDs: {reviewed_sources}"
            )
        outside_pages = sorted(
            source_id for source_id in manifest["sourceIds"]
            if not any(
                item_page == page
                for item_page in [source_map[source_id]["pdfPage"]]
                + [
                    occurrence["pdfPage"]
                    for occurrence in source_map[source_id].get("occurrences", [])
                ]
                for page in selected_pages
            )
        )
        if outside_pages:
            raise AuditValidationError(
                f"manifest assigns sources outside selected pages: {outside_pages}"
            )
    if manifest["mode"] == "calibration":
        required = set(policy["calibration"]["requiredPages"])
        if not required <= selected_pages:
            raise AuditValidationError(
                "calibration manifest omits a required page"
            )
        external = selected_pages - set(review_page_numbers(index))
        if len(external) < 3:
            raise AuditValidationError(
                "calibration manifest has fewer than three external pages"
            )
    return source_map, decisions_by_id


def _project_relative_frozen_path(label, field):
    if not isinstance(label, str) or "\\" in label:
        raise AuditValidationError(
            f"{field} must be a project-relative POSIX path"
        )
    path = PurePosixPath(label)
    if path.is_absolute() or ".." in path.parts or not path.parts:
        raise AuditValidationError(
            f"{field} must be project-relative"
        )
    return path


def _freeze_evidence_hashes(manifest, paths):
    evidence = {
        "pdfSha256": sha256_file(paths["pdf"]),
        "sourceIndexSha256": sha256_file(paths["index"]),
        "unnumberedVisualsSha256": sha256_file(paths["visuals"]),
        "baseDecisionsSha256": sha256_file(paths["decisions"]),
        "baseLedgerSha256": sha256_file(paths["ledger"]),
        "editorialPolicySha256": sha256_file(paths["policy"]),
        "analysisSha256": sha256_file(paths["analysis"]),
        "courseOutlineSha256": sha256_file(
            paths["course_outline"]
        ),
    }
    manifest_mapping = {
        "pdfSha256": "pdfSha256",
        "sourceIndexSha256": "sourceIndexSha256",
        "unnumberedVisualsSha256": "unnumberedVisualsSha256",
        "decisionsSha256": "baseDecisionsSha256",
        "editorialPolicySha256": "editorialPolicySha256",
        "analysisSha256": "analysisSha256",
        "courseOutlineSha256": "courseOutlineSha256",
    }
    for manifest_key, evidence_key in manifest_mapping.items():
        if manifest.get(manifest_key) != evidence[evidence_key]:
            raise AuditValidationError(
                f"manifest evidence mismatch: {manifest_key}"
            )
    return evidence


def _validated_manifest_records(manifest, name):
    records = manifest[name]
    if not isinstance(records, list):
        raise AuditValidationError(f"{name} must be a list")
    seen_pages = set()
    seen_paths = set()
    validated = []
    for position, record in enumerate(records):
        if (
            not isinstance(record, dict)
            or set(record) != {"pdfPage", "path", "sha256"}
        ):
            raise AuditValidationError(
                f"{name} fields mismatch at position {position}"
            )
        _project_relative_frozen_path(record["path"], f"{name}.path")
        pdf_page = record["pdfPage"]
        if (
            type(pdf_page) is not int
            or pdf_page < 1
            or pdf_page in seen_pages
        ):
            raise AuditValidationError(
                f"{name} pdfPage is invalid"
            )
        if record["path"] in seen_paths:
            raise AuditValidationError(
                f"{name} path is duplicated"
            )
        if re.fullmatch(r"[0-9a-f]{64}", record["sha256"]) is None:
            raise AuditValidationError(
                f"{name} SHA-256 is invalid"
            )
        seen_pages.add(pdf_page)
        seen_paths.add(record["path"])
        validated.append(copy.deepcopy(record))
    validated.sort(
        key=lambda item: (item["pdfPage"], item["path"])
    )
    if [
        item["pdfPage"] for item in validated
    ] != manifest["pages"]:
        raise AuditValidationError(
            f"{name} do not cover manifest pages"
        )
    return validated


def _frozen_page_decisions(pages, decisions_by_id):
    frozen = []
    required_fields = {
        "visualReviewState",
        "visualReviewer",
        "discoveredVisualIds",
        "symbolReview",
    }
    for pdf_page in pages:
        source_id = f"page-{pdf_page:03d}"
        decision = decisions_by_id.get(source_id)
        if decision is None:
            raise AuditValidationError(
                f"missing frozen page decision: {source_id}"
            )
        if not required_fields <= set(decision):
            raise AuditValidationError(
                f"page decision scan fields are incomplete: {source_id}"
            )
        if (
            decision["visualReviewState"] != "reviewed"
            or not decision["visualReviewer"].strip()
        ):
            raise AuditValidationError(
                f"page scan incomplete: {source_id}"
            )
        frozen.append(copy.deepcopy(decision))
    return frozen


def freeze_batch(
    manifest,
    pdf_path,
    index_path,
    visuals_path,
    decisions_path,
    ledger_path,
    policy_path,
    analysis_path,
    course_outline_path,
):
    index = load_json(index_path)
    visuals = load_json(visuals_path)
    decisions = load_json(decisions_path)
    ledger = load_json(ledger_path)
    policy = load_json(policy_path)
    source_map, decisions_by_id = _validate_manifest_selection(
        manifest,
        index,
        visuals,
        decisions,
        ledger,
        policy,
    )
    paths = {
        "pdf": pdf_path,
        "index": index_path,
        "visuals": visuals_path,
        "decisions": decisions_path,
        "ledger": ledger_path,
        "policy": policy_path,
        "analysis": analysis_path,
        "course_outline": course_outline_path,
    }
    evidence_hashes = _freeze_evidence_hashes(manifest, paths)
    project_root = Path.cwd()
    snapshot_label, snapshot_hash = _verified_policy_snapshot(
        manifest,
        project_root,
        evidence_hashes["editorialPolicySha256"],
    )
    freeze = {
        "schemaVersion": 1,
        "batchId": manifest["batchId"],
        "mode": manifest["mode"],
        "pages": list(manifest["pages"]),
        "sourceIds": list(manifest["sourceIds"]),
        "catalogSourceIds": sorted(source_map),
        "baseReviewStates": {
            item["sourceId"]: item["reviewState"]
            for item in decisions
        },
        "pageImages": _verified_manifest_records(
            manifest,
            "pageImages",
            project_root,
        ),
        "pageBundles": _verified_manifest_records(
            manifest,
            "pageBundles",
            project_root,
        ),
        "policySnapshotPath": snapshot_label,
        "policySnapshotSha256": snapshot_hash,
        "captionConflictSourceIds": list(
            APPROVED_CAPTION_CONFLICT_SOURCE_IDS
        ),
        "frozenPageDecisions": _frozen_page_decisions(
            manifest["pages"],
            decisions_by_id,
        ),
        **evidence_hashes,
    }
    freeze["freezeSha256"] = sha256_json(freeze)
    return freeze


def _confined_frozen_file(project_root, label, field):
    relative = _project_relative_frozen_path(label, field)
    root = Path(project_root).resolve()
    path = (root / Path(*relative.parts)).resolve(strict=False)
    try:
        path.relative_to(root)
    except ValueError as error:
        raise AuditValidationError(
            f"{field} escapes project root"
        ) from error
    if not path.is_file():
        raise AuditValidationError(f"{field} is not a file")
    return path


def _verified_manifest_records(manifest, name, project_root):
    records = _validated_manifest_records(manifest, name)
    for record in records:
        path = _confined_frozen_file(
            project_root,
            record["path"],
            f"{name}.path",
        )
        if sha256_file(path) != record["sha256"]:
            raise AuditValidationError(
                f"{name} artifact hash mismatch: {record['path']}"
            )
    return records


def _verified_policy_snapshot(
    manifest,
    project_root,
    editorial_policy_sha256,
):
    label = manifest.get("policySnapshotPath")
    path = _confined_frozen_file(
        project_root,
        label,
        "policySnapshotPath",
    )
    actual = sha256_file(path)
    if actual != manifest.get("policySnapshotSha256"):
        raise AuditValidationError(
            "policy snapshot manifest hash mismatch"
        )
    if actual != editorial_policy_sha256:
        raise AuditValidationError(
            "policy snapshot source hash mismatch"
        )
    return label, actual


def frozen_manifest_artifact_paths(manifest, project_root):
    paths = {}
    for name in ("pageImages", "pageBundles"):
        for record in _validated_manifest_records(manifest, name):
            label = f"{name}-{record['pdfPage']}"
            paths[label] = _confined_frozen_file(
                project_root,
                record["path"],
                f"{name}.path",
            )
    paths["policySnapshot"] = _confined_frozen_file(
        project_root,
        manifest.get("policySnapshotPath"),
        "policySnapshotPath",
    )
    return paths


def frozen_manifest_evidence_roots(artifact_paths):
    image_roots = {
        path.parent
        for name, path in artifact_paths.items()
        if name.startswith("pageImages-")
    }
    package_roots = {
        path.parent
        for name, path in artifact_paths.items()
        if name.startswith("pageBundles-")
        or name == "policySnapshot"
    }
    if len(image_roots) != 1:
        raise AuditValidationError(
            "manifest page images do not share one evidence root"
        )
    if len(package_roots) != 1:
        raise AuditValidationError(
            "manifest package artifacts do not share one evidence root"
        )
    return {
        "image-root": next(iter(image_roots)),
        "package-root": next(iter(package_roots)),
    }


def _validate_freeze_identity(freeze):
    stored_hash = freeze.get("freezeSha256")
    unhashed = {
        key: value for key, value in freeze.items()
        if key != "freezeSha256"
    }
    if sha256_json(unhashed) != stored_hash:
        raise AuditValidationError("freezeSha256 mismatch")
    for name in ("pages", "sourceIds", "catalogSourceIds"):
        values = freeze[name]
        if values != sorted(set(values)):
            raise AuditValidationError(
                f"freeze {name} must be sorted and unique"
            )
    if not set(freeze["sourceIds"]) <= set(
        freeze["catalogSourceIds"]
    ):
        raise AuditValidationError(
            "freeze sourceIds are outside catalog"
        )
    if set(freeze["baseReviewStates"]) != set(
        freeze["catalogSourceIds"]
    ):
        raise AuditValidationError(
            "baseReviewStates do not cover frozen catalog"
        )
    _validated_caption_conflict_source_ids(
        freeze.get("captionConflictSourceIds"),
        freeze["catalogSourceIds"],
    )
    assigned_reviewed = sorted(
        source_id for source_id in freeze["sourceIds"]
        if freeze["baseReviewStates"][source_id] != "unreviewed"
    )
    if assigned_reviewed:
        raise AuditValidationError(
            f"freeze assigns reviewed IDs: {assigned_reviewed}"
        )


def _validate_frozen_hash_records(
    name,
    records,
    pages,
    current_records,
):
    if records != sorted(
        records,
        key=lambda item: (item["pdfPage"], item["path"]),
    ):
        raise AuditValidationError(
            f"{name} must use stable order"
        )
    if [record["pdfPage"] for record in records] != pages:
        raise AuditValidationError(
            f"{name} do not exactly cover freeze pages"
        )
    for record in records:
        if set(record) != {"pdfPage", "path", "sha256"}:
            raise AuditValidationError(
                f"{name} record fields are invalid"
            )
        _project_relative_frozen_path(
            record["path"],
            f"{name}.path",
        )
        if re.fullmatch(
            r"[0-9a-f]{64}",
            record["sha256"],
        ) is None:
            raise AuditValidationError(
                f"{name} record SHA-256 is invalid"
            )
    if current_records != records:
        raise AuditValidationError(f"{name} mismatch")


def validate_frozen_immutable_evidence(
    freeze,
    current_evidence,
):
    _validate_freeze_identity(freeze)
    for name in ("pageImages", "pageBundles"):
        _validate_frozen_hash_records(
            name,
            freeze[name],
            freeze["pages"],
            current_evidence[name],
        )
    frozen_page_ids = sorted(
        item["sourceId"]
        for item in freeze["frozenPageDecisions"]
    )
    expected_page_ids = [
        f"page-{pdf_page:03d}" for pdf_page in freeze["pages"]
    ]
    if frozen_page_ids != expected_page_ids:
        raise AuditValidationError(
            "frozenPageDecisions do not match pages"
        )
    _project_relative_frozen_path(
        freeze["policySnapshotPath"],
        "policySnapshotPath",
    )
    if (
        current_evidence["policySnapshotPath"]
        != freeze["policySnapshotPath"]
    ):
        raise AuditValidationError("policySnapshotPath mismatch")
    immutable_hashes = (
        "pdfSha256",
        "sourceIndexSha256",
        "unnumberedVisualsSha256",
        "editorialPolicySha256",
        "analysisSha256",
        "courseOutlineSha256",
        "policySnapshotSha256",
    )
    for key in immutable_hashes:
        if current_evidence[key] != freeze[key]:
            raise AuditValidationError(f"{key} mismatch")
    if (
        current_evidence["catalogSourceIds"]
        != freeze["catalogSourceIds"]
    ):
        raise AuditValidationError("catalogSourceIds mismatch")
    if (
        current_evidence["captionConflictSourceIds"]
        != freeze["captionConflictSourceIds"]
    ):
        raise AuditValidationError(
            "captionConflictSourceIds mismatch"
        )


def validate_frozen_batch(freeze, current_evidence):
    validate_frozen_immutable_evidence(freeze, current_evidence)
    for key in (
        "baseDecisionsSha256",
        "baseLedgerSha256",
    ):
        if current_evidence[key] != freeze[key]:
            raise AuditValidationError(f"{key} mismatch")
    if (
        current_evidence["baseReviewStates"]
        != freeze["baseReviewStates"]
    ):
        raise AuditValidationError("baseReviewStates mismatch")


def _validate_review_patch_envelope(
    freeze,
    patch,
    assigned_source_ids,
):
    if set(patch) != {
        "batchId",
        "reviewer",
        "reviewerTaskId",
        "evidenceHashes",
        "changes",
    }:
        raise AuditValidationError(
            "review patch fields mismatch"
        )
    if patch["batchId"] != freeze["batchId"]:
        raise AuditValidationError(
            "review patch batchId mismatch"
        )
    for field in ("reviewer", "reviewerTaskId"):
        if (
            not isinstance(patch[field], str)
            or not patch[field].strip()
        ):
            raise AuditValidationError(
                f"{field} must be non-blank"
            )
    evidence_fields = (
        "pdfSha256",
        "sourceIndexSha256",
        "unnumberedVisualsSha256",
        "baseDecisionsSha256",
        "baseLedgerSha256",
        "editorialPolicySha256",
        "analysisSha256",
        "courseOutlineSha256",
        "freezeSha256",
    )
    expected_evidence = {
        key: freeze[key] for key in evidence_fields
    }
    if patch["evidenceHashes"] != expected_evidence:
        raise AuditValidationError(
            "review patch evidence hash mismatch"
        )
    if not isinstance(assigned_source_ids, set):
        raise AuditValidationError(
            "assigned_source_ids must be a set"
        )
    if not assigned_source_ids <= set(freeze["sourceIds"]):
        raise AuditValidationError(
            "patch assignment is outside freeze"
        )


def _patch_changes_by_id(records, assigned_source_ids):
    changes = {}
    for record in records:
        source_id = record["sourceId"]
        if source_id in changes:
            raise AuditValidationError(
                f"duplicate patch sourceId: {source_id}"
            )
        changes[source_id] = record
    if set(changes) != assigned_source_ids:
        raise AuditValidationError(
            "patch changes do not match assignment"
        )
    return changes


def _expected_patch_fields(item, source_id, conflicts):
    fields = {
        "sourceId",
        "disposition",
        "reason",
        "lessonIds",
        "markdownRefs",
        "visualClass",
        "visualHandling",
        "reviewState",
        "riskFlags",
        "mustKeepIds",
        "symbolTextAlternatives",
    }
    if item["kind"] in {"figure", "table", "visual"}:
        fields.update({
            "visualTextAlternative",
            "visualHandlingNote",
        })
    if item["kind"] == "page":
        fields.update({
            "visualReviewState",
            "visualReviewer",
            "discoveredVisualIds",
            "symbolReview",
        })
    if source_id in conflicts:
        fields.update({
            "captionConflictResolved",
            "captionConflictNote",
        })
    return fields


def _validate_patch_record_order(source_id, record):
    for field in (
        "lessonIds",
        "markdownRefs",
        "riskFlags",
        "mustKeepIds",
        "symbolTextAlternatives",
    ):
        expected_order = sorted(
            record[field],
            key=lambda value: (
                deterministic_json_bytes(value)
                if isinstance(value, dict)
                else value
            ),
        )
        if record[field] != expected_order:
            raise AuditValidationError(
                f"{field} must use stable order: {source_id}"
            )
    if len(record["mustKeepIds"]) != len(
        set(record["mustKeepIds"])
    ):
        raise AuditValidationError(
            f"duplicate mustKeepIds: {source_id}"
        )


def _validate_patch_special_fields(
    source_id,
    item,
    record,
    frozen_pages,
    conflicts,
):
    page_fields = (
        "visualReviewState",
        "visualReviewer",
        "discoveredVisualIds",
        "symbolReview",
    )
    if item["kind"] == "page":
        if source_id not in frozen_pages:
            raise AuditValidationError(
                f"missing frozen page evidence: {source_id}"
            )
        for field in page_fields:
            if record[field] != frozen_pages[source_id][field]:
                raise AuditValidationError(
                    "frozen page evidence changed: "
                    f"{source_id}.{field}"
                )
    if source_id in conflicts and (
        record["captionConflictResolved"] is not True
        or not isinstance(record["captionConflictNote"], str)
        or not record["captionConflictNote"].strip()
    ):
        raise AuditValidationError(
            f"caption conflict unresolved: {source_id}"
        )


def validate_review_patch(
    freeze,
    patch,
    source_map,
    assigned_source_ids,
    policy,
):
    _validate_freeze_identity(freeze)
    _validate_review_patch_envelope(
        freeze,
        patch,
        assigned_source_ids,
    )
    changes = _patch_changes_by_id(
        patch["changes"],
        assigned_source_ids,
    )
    frozen_policy = copy.deepcopy(policy)
    frozen_policy["captionConflictSourceIds"] = list(
        freeze["captionConflictSourceIds"]
    )
    conflicts = set(frozen_policy["captionConflictSourceIds"])
    frozen_pages = {
        item["sourceId"]: item
        for item in freeze["frozenPageDecisions"]
    }
    for source_id in sorted(changes):
        if source_id not in source_map:
            raise AuditValidationError(
                f"unknown patch sourceId: {source_id}"
            )
        item = source_map[source_id]
        record = changes[source_id]
        if set(record) != _expected_patch_fields(
            item,
            source_id,
            conflicts,
        ):
            raise AuditValidationError(
                f"complete record fields mismatch: {source_id}"
            )
        if record["reviewState"] != "reviewed":
            raise AuditValidationError(
                f"patch record must be reviewed: {source_id}"
            )
        _validate_patch_record_order(source_id, record)
        _validate_patch_special_fields(
            source_id,
            item,
            record,
            frozen_pages,
            conflicts,
        )
        validate_editorial_record(item, record, frozen_policy)


def _hash_confined_frozen_records(
    records,
    project_root,
    confined_root,
    field,
):
    hashed = []
    confined_labels = set()
    for record in records:
        relative = _project_relative_frozen_path(
            record["path"],
            f"{field}.path",
        )
        path = (project_root / relative).resolve()
        try:
            path.relative_to(project_root)
            confined = path.relative_to(confined_root)
        except ValueError as error:
            raise AuditValidationError(
                f"frozen path escapes project or {field} root: "
                f"{record['path']}"
            ) from error
        confined_labels.add(confined.as_posix())
        hashed.append({
            **record,
            "sha256": sha256_file(path),
        })
    return hashed, confined_labels


def _resolve_frozen_policy_snapshot(
    freeze,
    project_root,
    package_root,
):
    relative = _project_relative_frozen_path(
        freeze["policySnapshotPath"],
        "policySnapshotPath",
    )
    path = (project_root / relative).resolve()
    try:
        path.relative_to(project_root)
        confined = path.relative_to(package_root)
    except ValueError as error:
        raise AuditValidationError(
            "frozen policySnapshotPath escapes package root"
        ) from error
    return path, confined.as_posix()


def _confined_evidence_root(project_root, root, field):
    confined_root = Path(root).resolve()
    try:
        confined_root.relative_to(project_root)
    except ValueError as error:
        raise AuditValidationError(
            f"{field} root escapes project root"
        ) from error
    if not confined_root.is_dir():
        raise AuditValidationError(
            f"{field} root is not a directory"
        )
    return confined_root


def build_current_batch_evidence(
    freeze,
    pdf_path,
    index_path,
    visuals_path,
    decisions_path,
    ledger_path,
    policy_path,
    analysis_path,
    course_outline_path,
    image_dir,
    package_dir,
):
    project_root = Path.cwd().resolve()
    image_root = _confined_evidence_root(
        project_root,
        image_dir,
        "image",
    )
    package_root = _confined_evidence_root(
        project_root,
        package_dir,
        "package",
    )
    index = load_json(index_path)
    visuals = load_json(visuals_path)
    decisions = load_json(decisions_path)
    policy = load_json(policy_path)
    page_images, _ = _hash_confined_frozen_records(
        freeze["pageImages"],
        project_root,
        image_root,
        "image",
    )
    page_bundles, bundle_labels = _hash_confined_frozen_records(
        freeze["pageBundles"],
        project_root,
        package_root,
        "package",
    )
    snapshot_path, snapshot_label = (
        _resolve_frozen_policy_snapshot(
            freeze,
            project_root,
            package_root,
        )
    )
    expected_package_files = {
        "manifest.json",
        snapshot_label,
        *bundle_labels,
    }
    actual_package_files = {
        path.relative_to(package_root).as_posix()
        for path in package_root.rglob("*")
        if path.is_file()
    }
    if actual_package_files != expected_package_files:
        raise AuditValidationError(
            "package directory contains missing or extra files"
        )
    return {
        "pdfSha256": sha256_file(pdf_path),
        "sourceIndexSha256": sha256_file(index_path),
        "unnumberedVisualsSha256": sha256_file(visuals_path),
        "baseDecisionsSha256": sha256_file(decisions_path),
        "baseLedgerSha256": sha256_file(ledger_path),
        "editorialPolicySha256": sha256_file(policy_path),
        "analysisSha256": sha256_file(analysis_path),
        "courseOutlineSha256": sha256_file(course_outline_path),
        "policySnapshotPath": freeze["policySnapshotPath"],
        "policySnapshotSha256": sha256_file(snapshot_path),
        "captionConflictSourceIds": list(
            policy["captionConflictSourceIds"]
        ),
        "pageImages": page_images,
        "pageBundles": page_bundles,
        "catalogSourceIds": sorted(
            source_items_by_id(index, visuals)
        ),
        "baseReviewStates": {
            item["sourceId"]: item["reviewState"]
            for item in decisions
        },
    }

import json
import os
import tempfile
import unittest
from pathlib import Path

from scripts.source_audit.models import (
    AuditValidationError,
    assert_distinct_paths,
    stable_source_id,
    validate_decisions,
    validate_index,
    write_json_deterministic,
)
from tests.source_audit.editorial_fixtures import sample_page20_index


def source_index():
    return {
        "pages": [{"sourceId": "page-001", "kind": "page"}],
        "outline": [],
        "numberedItems": [],
    }


def decision(**changes):
    value = {
        "sourceId": "page-001",
        "disposition": "included",
        "reason": "",
        "lessonIds": [],
        "markdownRefs": [],
        "reviewState": "reviewed",
    }
    value.update(changes)
    return value


class ModelTests(unittest.TestCase):
    def test_shared_path_guard_rejects_normalized_and_file_identity_aliases(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "Source.pdf"
            source.write_bytes(b"immutable source")
            source_before = source.read_bytes()

            relative_alias = root / "nested" / ".." / source.name
            case_alias = root / "source.pdf"
            unicode_first = root / "Réport.md"
            unicode_second = root / "Re\u0301port.md"
            symlink_alias = root / "source-link.pdf"
            hardlink_alias = root / "source-hardlink.pdf"
            symlink_alias.symlink_to(source)
            os.link(source, hardlink_alias)

            alias_pairs = (
                (source, relative_alias),
                (source, case_alias),
                (unicode_first, unicode_second),
                (source, symlink_alias),
                (source, hardlink_alias),
            )
            for first, second in alias_pairs:
                with self.subTest(first=first, second=second):
                    with self.assertRaisesRegex(
                        AuditValidationError, "path conflict"
                    ):
                        assert_distinct_paths({"first": first, "second": second})

            self.assertEqual(source.read_bytes(), source_before)

    def test_stable_source_ids(self):
        self.assertEqual(stable_source_id("figure", number="1-2"), "figure-1-2")
        self.assertEqual(stable_source_id("page", pdf_page=20), "page-020")
        self.assertEqual(
            stable_source_id("outline", pdf_page=20, ordinal=3),
            "outline-020-003",
        )

    def test_deterministic_json_has_sorted_keys_and_final_newline(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "out.json"
            write_json_deterministic(path, {"z": 1, "a": 2})
            self.assertEqual(path.read_text(), '{\n  "a": 2,\n  "z": 1\n}\n')

    def test_complete_validation_rejects_unreviewed_item(self):
        index = {
            "pages": [{"sourceId": "page-001"}],
            "outline": [],
            "numberedItems": [],
        }
        decisions = [{
            "sourceId": "page-001",
            "disposition": "unreviewed",
            "reason": "",
            "lessonIds": [],
            "markdownRefs": [],
            "reviewState": "unreviewed",
        }]
        with self.assertRaisesRegex(AuditValidationError, "unreviewed"):
            validate_decisions(index, decisions, require_complete=True)

    def test_index_validation_rejects_invalid_kind(self):
        index = source_index()
        index["pages"][0]["kind"] = "not-a-kind"

        with self.assertRaisesRegex(AuditValidationError, "kind"):
            validate_index(index)

    def test_decision_validation_rejects_invalid_review_state(self):
        with self.assertRaisesRegex(AuditValidationError, "reviewState"):
            validate_decisions(
                source_index(),
                [decision(reviewState="not-a-state")],
            )

    def test_decision_validation_rejects_duplicate_ids(self):
        with self.assertRaisesRegex(AuditValidationError, "duplicate"):
            validate_decisions(source_index(), [decision(), decision()])

    def test_decision_validation_rejects_unknown_ids(self):
        with self.assertRaisesRegex(AuditValidationError, "unknown"):
            validate_decisions(
                source_index(),
                [decision(sourceId="page-999")],
            )

    def test_decision_list_fields_reject_missing_wrong_types_and_invalid_members(self):
        invalid_values = (
            ("null", None, "must be an array"),
            ("string", "lesson-01", "must be an array"),
            ("object", {"id": "lesson-01"}, "must be an array"),
            ("number", 1, "must be an array"),
            ("boolean", True, "must be an array"),
            ("non-string member", [None], "members must be non-blank strings"),
            ("empty member", [""], "members must be non-blank strings"),
            ("blank member", [" \t\n"], "members must be non-blank strings"),
        )
        for field in ("lessonIds", "markdownRefs"):
            missing = decision()
            del missing[field]
            with self.subTest(field=field, invalid="missing"):
                with self.assertRaisesRegex(
                    AuditValidationError, f"{field} must be an array"
                ):
                    validate_decisions(source_index(), [missing])

            for label, value, expected_error in invalid_values:
                with self.subTest(field=field, invalid=label):
                    with self.assertRaisesRegex(
                        AuditValidationError, f"{field} {expected_error}"
                    ):
                        validate_decisions(
                            source_index(),
                            [decision(**{field: value})],
                        )

    def test_decision_list_fields_accept_empty_and_non_blank_string_arrays(self):
        for field in ("lessonIds", "markdownRefs"):
            for value in ([], [" lesson-01 ", "\tlesson-02\n"]):
                record = decision(**{field: value})
                before = json.loads(json.dumps(record))
                with self.subTest(field=field, value=value):
                    validate_decisions(source_index(), [record])
                    self.assertEqual(record, before)

    def test_excluded_and_missing_decisions_require_reasons(self):
        for disposition in ("excluded", "missing"):
            with self.subTest(disposition=disposition):
                with self.assertRaisesRegex(AuditValidationError, "reason"):
                    validate_decisions(
                        source_index(),
                        [decision(disposition=disposition)],
                    )

    def test_excluded_and_missing_require_non_blank_string_reasons(self):
        for disposition in ("excluded", "missing"):
            for reason in ("   ", "\t", "\n", ["看似有内容"]):
                with self.subTest(disposition=disposition, reason=reason):
                    with self.assertRaisesRegex(
                        AuditValidationError, "non-empty string reason"
                    ):
                        validate_decisions(
                            source_index(),
                            [
                                decision(
                                    disposition=disposition,
                                    reason=reason,
                                )
                            ],
                        )

    def test_reviewed_decision_requires_final_disposition(self):
        with self.assertRaisesRegex(AuditValidationError, "final disposition"):
            validate_decisions(
                source_index(),
                [decision(disposition="unreviewed")],
            )

    def test_semantic_core_visual_cannot_be_omitted(self):
        with self.assertRaisesRegex(AuditValidationError, "semantic-core"):
            validate_decisions(
                source_index(),
                [decision(visualClass="semantic-core", visualHandling="omit")],
                require_complete=True,
            )

    def test_optional_caption_conflict_fields_require_declared_types(self):
        invalid_values = (
            ("captionConflictResolved", 1, "bool"),
            ("captionConflictNote", False, "string"),
        )
        for field, value, expected_error in invalid_values:
            with self.subTest(field=field):
                with self.assertRaisesRegex(
                    AuditValidationError, expected_error
                ):
                    validate_decisions(
                        source_index(),
                        [decision(**{field: value})],
                    )

    def test_complete_validation_requires_visual_fields_for_reviewed_visuals(self):
        for kind in ("figure", "table"):
            source_id = f"{kind}-1-1"
            index = {
                "pages": [],
                "outline": [],
                "numberedItems": [
                    {"sourceId": source_id, "kind": kind, "number": "1-1"}
                ],
            }
            for missing_field in ("visualClass", "visualHandling"):
                values = {
                    "sourceId": source_id,
                    "lessonIds": ["lesson-01"],
                    "visualClass": "evidence",
                    "visualHandling": "reuse",
                }
                values[missing_field] = None
                with self.subTest(kind=kind, missing_field=missing_field):
                    with self.assertRaisesRegex(
                        AuditValidationError,
                        "visualClass and visualHandling",
                    ):
                        validate_decisions(
                            index,
                            [decision(**values)],
                            require_complete=True,
                        )

    def test_complete_validation_requires_missing_item_lesson_placement(self):
        with self.assertRaisesRegex(AuditValidationError, "non-empty lessonId"):
            validate_decisions(
                source_index(),
                [
                    decision(
                        disposition="missing",
                        reason="课程尚未覆盖",
                        lessonIds=[],
                    )
                ],
                require_complete=True,
            )

    def test_complete_validation_requires_caption_conflict_resolution(self):
        index = {
            "pages": [],
            "outline": [],
            "numberedItems": [
                {
                    "sourceId": "figure-8-3",
                    "kind": "figure",
                    "number": "8-3",
                    "captionConflict": True,
                }
            ],
        }
        base = {
            "sourceId": "figure-8-3",
            "lessonIds": ["lesson-08"],
            "visualClass": "semantic-core",
            "visualHandling": "reuse",
        }
        invalid_resolutions = (
            ({}, "captionConflictResolved"),
            (
                {
                    "captionConflictResolved": False,
                    "captionConflictNote": "尚未确认",
                },
                "captionConflictResolved",
            ),
            (
                {
                    "captionConflictResolved": True,
                    "captionConflictNote": "   ",
                },
                "captionConflictNote",
            ),
        )
        for changes, expected_error in invalid_resolutions:
            with self.subTest(changes=changes):
                with self.assertRaisesRegex(
                    AuditValidationError, expected_error
                ):
                    validate_decisions(
                        index,
                        [decision(**base, **changes)],
                        require_complete=True,
                    )

    def test_complete_validation_accepts_resolved_caption_conflict(self):
        index = {
            "pages": [],
            "outline": [],
            "numberedItems": [
                {
                    "sourceId": "figure-8-3",
                    "kind": "figure",
                    "number": "8-3",
                    "captionConflict": True,
                }
            ],
        }
        validate_decisions(
            index,
            [
                decision(
                    sourceId="figure-8-3",
                    lessonIds=["lesson-08"],
                    visualClass="semantic-core",
                    visualHandling="reuse",
                    captionConflictResolved=True,
                    captionConflictNote="已核对 PDF 240 的正式图注",
                )
            ],
            require_complete=True,
        )

    def test_complete_validation_checks_unreviewed_before_combinations(self):
        index = {
            "pages": [{"sourceId": "page-001", "kind": "page"}],
            "outline": [],
            "numberedItems": [
                {
                    "sourceId": "figure-8-3",
                    "kind": "figure",
                    "number": "8-3",
                    "captionConflict": True,
                }
            ],
        }
        decisions = [
            decision(sourceId="figure-8-3"),
            decision(
                sourceId="page-001",
                disposition="unreviewed",
                reviewState="unreviewed",
            ),
        ]

        with self.assertRaisesRegex(AuditValidationError, "unreviewed"):
            validate_decisions(index, decisions, require_complete=True)

    def test_excluded_semantic_core_visual_may_be_omitted_off_course(self):
        validate_decisions(
            source_index(),
            [
                decision(
                    disposition="excluded",
                    reason="与课程目标无关",
                    lessonIds=[],
                    visualClass="semantic-core",
                    visualHandling="omit",
                )
            ],
            require_complete=True,
        )

    def test_excluded_semantic_core_visual_cannot_be_omitted_when_placed(self):
        with self.assertRaisesRegex(AuditValidationError, "semantic-core"):
            validate_decisions(
                source_index(),
                [
                    decision(
                        disposition="excluded",
                        reason="与课程目标无关",
                        lessonIds=["1-1"],
                        visualClass="semantic-core",
                        visualHandling="omit",
                    )
                ],
                require_complete=True,
            )

    def test_semantic_core_placement_string_is_rejected_as_a_type_error(self):
        with self.assertRaisesRegex(
            AuditValidationError, "lessonIds must be an array"
        ):
            validate_decisions(
                source_index(),
                [
                    decision(
                        disposition="excluded",
                        reason="与课程目标无关",
                        lessonIds="1-1",
                        visualClass="semantic-core",
                        visualHandling="omit",
                    )
                ],
                require_complete=True,
            )

    def test_generated_index_still_rejects_external_visual_kind(self):
        index = sample_page20_index()
        index["numberedItems"][0]["kind"] = "visual"
        with self.assertRaisesRegex(AuditValidationError, "kind"):
            validate_index(index)

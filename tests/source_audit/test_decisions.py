import copy
import unittest

from scripts.source_audit.decisions import (
    _is_reference_only_visual_text,
    _known_must_keep_ids,
    _validate_course_placement,
    _validate_frozen_conflict_policy,
    _validate_markdown_refs,
    _validate_page_scan,
    _validate_risk_flags,
    _validate_symbol_review,
    _validate_symbol_text_alternatives,
    _validate_version_boundary,
    derived_risk_flags,
    initial_editorial_decision,
    upgrade_editorial_decisions,
    validate_editorial_decisions,
    validate_editorial_record,
)
from scripts.source_audit.models import AuditValidationError, all_source_items
from tests.source_audit.editorial_fixtures import (
    reviewed_visual_fixture,
    sample_decisions,
    sample_index,
    sample_page20_index,
    sample_page_and_experiment_decisions,
    sample_page_decision,
    sample_policy,
    sample_reviewed_decision,
)


class DecisionContractTests(unittest.TestCase):
    def test_initial_page_and_visual_shapes(self):
        page = initial_editorial_decision({"sourceId": "page-010", "kind": "page"})
        self.assertEqual(page["riskFlags"], [])
        self.assertEqual(page["mustKeepIds"], [])
        self.assertEqual(page["symbolTextAlternatives"], [])
        self.assertEqual(page["visualReviewState"], "unreviewed")
        self.assertEqual(page["visualReviewer"], "")
        self.assertEqual(page["discoveredVisualIds"], [])
        self.assertEqual(page["symbolReview"], [])
        visual = initial_editorial_decision(
            {"sourceId": "visual-p010-01", "kind": "visual"}
        )
        self.assertEqual(visual["visualTextAlternative"], "")
        self.assertEqual(visual["visualHandlingNote"], "")
        self.assertIsNone(visual["visualClass"])
        self.assertIsNone(visual["visualHandling"])

    def test_markdown_refs_are_project_relative_with_positive_lines(self):
        decision = sample_reviewed_decision()
        for value in (
            "02-课程大纲.md:24",
            "reference/book-analysis.md:52-78",
        ):
            valid = copy.deepcopy(decision)
            valid["markdownRefs"] = [value]
            with self.subTest(value=value):
                _validate_markdown_refs(valid)
        for value in ("/absolute/file.md:1", "../outside.md:1", "reference/file.md:0"):
            invalid = copy.deepcopy(decision)
            invalid["markdownRefs"] = [value]
            with self.subTest(value=value):
                with self.assertRaisesRegex(AuditValidationError, "markdownRef"):
                    _validate_markdown_refs(invalid)

    def test_course_placement_matrix(self):
        cases = [
            ("included", [], "requires at least one lessonId"),
            ("compressed", ["9-9"], "invalid lessonId"),
            ("missing", [], "requires at least one lessonId"),
            ("excluded", ["1-1"], "requires empty lessonIds"),
        ]
        for disposition, lesson_ids, message in cases:
            with self.subTest(disposition=disposition):
                with self.assertRaisesRegex(AuditValidationError, message):
                    validate_editorial_decisions(
                        sample_page20_index(),
                        [],
                        [
                            sample_reviewed_decision(
                                disposition=disposition, lessonIds=lesson_ids
                            )
                        ],
                        sample_policy(),
                    )

    def test_version_boundary_requires_future_for_excluded_chapters(self):
        policy = sample_policy()
        item = {
            "sourceId": "figure-5-1",
            "kind": "figure",
            "chapter": 5,
            "pdfPage": 120,
        }
        decision = sample_reviewed_decision(sourceId=item["sourceId"])
        with self.assertRaisesRegex(AuditValidationError, "version"):
            _validate_version_boundary(item, decision, policy)
        decision.update(
            {
                "disposition": "excluded",
                "lessonIds": [],
                "reason": policy["versionBoundaryReason"],
            }
        )
        _validate_version_boundary(item, decision, policy)

    def test_reviewed_visual_kinds_reject_null_class_or_handling(self):
        for kind in ("figure", "table", "visual"):
            for field in ("visualClass", "visualHandling"):
                with self.subTest(kind=kind, field=field):
                    index, visuals, decisions = reviewed_visual_fixture(kind)
                    decisions[0][field] = None
                    with self.assertRaisesRegex(AuditValidationError, field):
                        validate_editorial_decisions(
                            index, visuals, decisions, sample_policy()
                        )

    def test_derived_risk_flags_include_frozen_conflict_and_visual(self):
        policy = sample_policy()
        item = {
            "sourceId": policy["captionConflictSourceIds"][0],
            "kind": "figure",
            "chapter": 1,
            "pdfPage": 10,
            "captionConflict": True,
        }
        decision = sample_reviewed_decision(sourceId=item["sourceId"])
        self.assertIn("caption-conflict", derived_risk_flags(item, decision, policy))

    def test_risk_flags_must_equal_the_derived_set(self):
        policy = sample_policy()
        item = {"sourceId": "page-020", "kind": "page", "chapter": 1, "pdfPage": 20}
        decision = sample_page_decision(sourceId=item["sourceId"])
        decision["riskFlags"] = ["invented-risk"]
        with self.assertRaisesRegex(AuditValidationError, "risk"):
            _validate_risk_flags(item, decision, policy)

    def test_single_record_rejects_invalid_enum_and_course_placement(self):
        policy = sample_policy()
        index = sample_page20_index()
        item = next(
            item
            for item in all_source_items(index)
            if item["sourceId"] == "experiment-1-1"
        )
        decision = next(
            row
            for row in sample_decisions(index=index)
            if row["sourceId"] == item["sourceId"]
        )
        invalid = copy.deepcopy(decision)
        invalid["disposition"] = "invented"
        with self.assertRaisesRegex(AuditValidationError, "disposition"):
            validate_editorial_record(item, invalid, policy)

    def test_upgrade_adds_only_missing_unreviewed_records(self):
        index = sample_page20_index()
        existing = sample_decisions(index=index)
        before = copy.deepcopy(existing)
        upgraded = upgrade_editorial_decisions(index, [], existing[:-1])
        self.assertEqual(existing, before)
        self.assertEqual(
            {row["sourceId"] for row in upgraded},
            {item["sourceId"] for item in all_source_items(index)},
        )
        self.assertEqual(upgraded[-1]["reviewState"], "unreviewed")

    def test_page_symbol_assignment_requires_matching_target_text(self):
        decisions = sample_page_and_experiment_decisions(
            symbol_review=[
                {
                    "symbol": "★",
                    "observedCount": 2,
                    "semanticAssignments": [
                        {
                            "sourceId": "experiment-1-1",
                            "count": 2,
                            "meaning": "实验难度：两星",
                        }
                    ],
                    "nonSemanticCount": 0,
                    "note": "实验难度",
                }
            ],
            target_alternatives=[],
        )
        with self.assertRaisesRegex(AuditValidationError, "symbolTextAlternatives"):
            validate_editorial_decisions(
                sample_page20_index(), [], decisions, sample_policy()
            )

    def test_symbol_review_requires_exact_observed_arithmetic(self):
        index = sample_page20_index()
        decisions = sample_page_and_experiment_decisions(
            symbol_review=[
                {
                    "symbol": "★",
                    "observedCount": 2,
                    "semanticAssignments": [
                        {
                            "sourceId": "experiment-1-1",
                            "count": 1,
                            "meaning": "实验难度",
                        }
                    ],
                    "nonSemanticCount": 0,
                    "note": "不平衡",
                }
            ],
            target_alternatives=[],
        )
        page = index["pages"][0]
        source_map = {item["sourceId"]: item for item in all_source_items(index)}
        decisions_by_id = {row["sourceId"]: row for row in decisions}
        with self.assertRaisesRegex(AuditValidationError, "count|arithmetic"):
            _validate_symbol_review(
                page, decisions_by_id[page["sourceId"]], source_map, decisions_by_id
            )

    def test_complete_page_scan_requires_visual_inventory_and_notes(self):
        index = sample_page20_index()
        decisions = sample_decisions(index=index)
        page = index["pages"][0]
        source_map = {item["sourceId"]: item for item in all_source_items(index)}
        decisions_by_id = {row["sourceId"]: row for row in decisions}
        page_decision = decisions_by_id[page["sourceId"]]
        cases = [
            {"visualReviewState": "unreviewed", "visualReviewer": ""},
            {"discoveredVisualIds": ["visual-p020-01"]},
        ]
        for changes in cases:
            invalid = copy.deepcopy(page_decision)
            invalid.update(changes)
            with (
                self.subTest(changes=changes),
                self.assertRaisesRegex(AuditValidationError, "scan|inventory"),
            ):
                _validate_page_scan(
                    page, invalid, source_map, decisions_by_id, require_complete=True
                )

    def test_known_must_keep_ids_are_exactly_twenty_five(self):
        known = _known_must_keep_ids(sample_policy())
        self.assertEqual(len(known), 25)
        self.assertEqual(len(known), len(set(known)))

    def test_frozen_conflict_policy_requires_exact_source_set(self):
        policy = sample_policy()
        index = sample_page20_index()
        source_map = {item["sourceId"]: item for item in all_source_items(index)}
        policy["captionConflictSourceIds"] = ["missing-source"]
        with self.assertRaisesRegex(AuditValidationError, "conflict|source"):
            _validate_frozen_conflict_policy(policy, source_map)

    def test_frozen_conflict_policy_requires_every_frozen_id_in_catalog(self):
        with self.assertRaisesRegex(AuditValidationError, "missing from catalog"):
            _validate_frozen_conflict_policy(sample_policy(), {})

    def test_validate_editorial_decisions_requires_exact_source_universe(self):
        index = sample_page20_index()
        decisions = sample_decisions(index=index)
        validate_editorial_decisions(
            index, [], decisions, sample_policy(), require_complete=True
        )
        with self.assertRaisesRegex(AuditValidationError, "source|decision"):
            validate_editorial_decisions(
                index, [], decisions[:-1], sample_policy(), require_complete=True
            )


class DecisionVisualTextTests(unittest.TestCase):
    def test_visual_text_rejects_reference_only_placeholders(self):
        for value in ("见原图", "见图8-2", "参见上图", "请参考原图", "同原图"):
            with self.subTest(value=value):
                self.assertTrue(_is_reference_only_visual_text(value))
        self.assertFalse(
            _is_reference_only_visual_text("图8-2展示评价、学习和更新之间的闭环关系")
        )

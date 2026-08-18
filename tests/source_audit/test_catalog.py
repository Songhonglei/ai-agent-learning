import copy
import json
import unittest
from pathlib import Path

from scripts.source_audit.catalog import (
    all_editorial_source_items,
    chapter_for_item,
    source_items_by_id,
    stable_visual_id,
    validate_unnumbered_visuals,
)
from scripts.source_audit.models import (
    AuditValidationError,
    all_source_items,
)
from tests.source_audit.editorial_fixtures import (
    sample_index,
    sample_page20_index,
    sample_policy,
    sample_visual,
)


class CatalogTests(unittest.TestCase):
    def test_policy_has_exact_conflicts_routes_and_calibration_pages(self):
        policy = json.loads(
            Path("reference/source-audit/editorial-policy.json").read_text()
        )
        self.assertEqual(policy["schemaVersion"], 1)
        self.assertEqual(policy["excludedChapters"], [5, 7, 9])
        self.assertEqual(len(policy["captionConflictSourceIds"]), 21)
        self.assertEqual(policy["calibration"]["requiredPages"], [10, 20, 81, 239, 240, 279])
        self.assertEqual(policy["calibration"]["minimumSourceItems"], 30)
        self.assertEqual(policy["calibration"]["maximumSourceItems"], 40)
        self.assertEqual(
            policy["mustKeepRules"]["courseObjectives"]["expectedCount"],
            12,
        )

    def test_source_items_by_id_returns_every_editorial_item(self):
        index = sample_index(page_count=20)
        visual = sample_visual()
        by_id = source_items_by_id(index, [visual])
        self.assertEqual(set(by_id), {
            item["sourceId"]
            for item in all_editorial_source_items(index, [visual])
        })
        self.assertEqual(by_id[visual["sourceId"]]["kind"], "visual")

    def test_complete_source_universe_adds_visuals_without_mutating_index(self):
        index = sample_index()
        before = copy.deepcopy(index)
        items = all_editorial_source_items(index, [sample_visual()])
        self.assertEqual(len(items), len(all_source_items(index)) + 1)
        self.assertEqual(index, before)

    def test_chapter_for_item_uses_page_chapter_for_visual(self):
        index = sample_index(page_count=20)
        visual = sample_visual()
        self.assertEqual(chapter_for_item(index, visual), 1)
        explicit = {**visual, "chapter": 8}
        self.assertEqual(chapter_for_item(index, explicit), 8)

    def test_visual_fields_and_discovery_evidence_are_exact(self):
        index = sample_index(page_count=20)
        valid = sample_visual()
        validate_unnumbered_visuals(index, [valid])
        cases = []
        wrong_fields = copy.deepcopy(valid)
        wrong_fields["extra"] = "forbidden"
        cases.append((wrong_fields, "fields"))
        wrong_page = copy.deepcopy(valid)
        wrong_page["pdfPage"] = 999
        cases.append((wrong_page, "unknown pdfPage"))
        wrong_evidence = copy.deepcopy(valid)
        wrong_evidence["discoveryEvidence"] = "PDF 第20页"
        cases.append((wrong_evidence, "page/method"))
        wrong_id = copy.deepcopy(valid)
        wrong_id["sourceId"] = "visual-p019-01"
        cases.append((wrong_id, "ID/page"))
        for visual, message in cases:
            with self.subTest(message=message):
                with self.assertRaisesRegex(AuditValidationError, message):
                    validate_unnumbered_visuals(index, [visual])

    def test_region_rejects_nonfinite_and_out_of_bounds(self):
        index = sample_index(page_count=20)
        for field, value, message in (
            ("x", True, "numeric"),
            ("x", float("nan"), "finite"),
            ("width", float("inf"), "finite"),
            ("x", -0.1, "negative"),
            ("width", 0, "positive"),
            ("width", 1.1, "page width"),
            ("height", 1.1, "page height"),
        ):
            with self.subTest(field=field, value=value):
                visual = sample_visual()
                visual["region"][field] = value
                with self.assertRaisesRegex(AuditValidationError, message):
                    validate_unnumbered_visuals(index, [visual])

    def test_stable_visual_id_uses_page_and_append_only_ordinal(self):
        self.assertEqual(stable_visual_id(10, 1), "visual-p010-01")
        with self.assertRaisesRegex(AuditValidationError, "pdfPage"):
            stable_visual_id(0, 1)
        with self.assertRaisesRegex(AuditValidationError, "ordinal"):
            stable_visual_id(10, 0)

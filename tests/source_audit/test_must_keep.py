import unittest
from pathlib import Path

from scripts.source_audit.must_keep import (
    build_must_keep_inventory,
    validate_must_keep_coverage,
)
from scripts.source_audit.models import AuditValidationError
from tests.source_audit.editorial_fixtures import (
    claimed_must_keep_fixture,
    course_route_claim_fixture,
    sample_analysis_sections,
    sample_index,
    sample_must_keep_inventory,
    sample_outline_sections,
    sample_policy,
)


class MustKeepTests(unittest.TestCase):
    @staticmethod
    def _markdown_sections(path):
        lines = path.read_text(encoding="utf-8").splitlines()
        headings = [
            (position, line[4:].strip())
            for position, line in enumerate(lines)
            if line.startswith("### ")
        ]
        return [
            {
                "heading": heading,
                "text": "\n".join(lines[start + 1 : end]),
                "path": f"docs/project/{path.name}" if path.name == "02-课程大纲.md" else f"reference/{path.name}",
                "startLine": start + 2,
                "endLine": end,
            }
            for (start, heading), (end, _) in zip(
                headings, [*headings[1:], (len(lines), "")]
            )
        ]

    def test_real_markdown_builds_the_stable_25_item_inventory(self):
        root = Path(__file__).resolve().parents[2]
        inventory = build_must_keep_inventory(
            sample_policy(),
            self._markdown_sections(root / "reference/book-analysis.md"),
            self._markdown_sections(root / "docs/project/02-课程大纲.md"),
        )
        self.assertEqual(len(inventory), 25)
        self.assertEqual(
            len(
                [
                    row
                    for row in inventory
                    if row["mustKeepId"].startswith("course-objective-")
                ]
            ),
            12,
        )
        self.assertEqual(
            len(
                [
                    row
                    for row in inventory
                    if row["mustKeepId"].startswith("analysis-high-priority-")
                ]
            ),
            5,
        )
        self.assertEqual(
            len(
                [
                    row
                    for row in inventory
                    if row["mustKeepId"].startswith("analysis-high-risk-")
                ]
            ),
            8,
        )
        self.assertEqual(
            [row["mustKeepId"] for row in inventory],
            sorted(row["mustKeepId"] for row in inventory),
        )

    def test_inventory_has_exact_25_atomic_items(self):
        inventory = build_must_keep_inventory(
            sample_policy(), sample_analysis_sections(), sample_outline_sections()
        )
        self.assertEqual(len(inventory), 25)
        self.assertEqual(
            {
                item["mustKeepId"]
                for item in inventory
                if item["mustKeepId"].startswith("course-")
            },
            {
                f"course-objective-{lesson_id}"
                for lesson_id in sample_policy()["lessonIds"]
            },
        )

    def test_incremental_gate_rejects_wrong_must_keep_routes(self):
        cases = [
            (
                "analysis-high-priority-02",
                {"chapter": 4, "lessonIds": ["1-1"], "disposition": "included"},
            ),
            (
                "analysis-high-priority-02",
                {"chapter": 2, "lessonIds": ["4-2"], "disposition": "included"},
            ),
            (
                "analysis-high-priority-03",
                {"chapter": 7, "lessonIds": ["1-1"], "disposition": "included"},
            ),
        ]
        for must_keep_id, changes in cases:
            with self.subTest(must_keep_id=must_keep_id, changes=changes):
                decisions, source_map = claimed_must_keep_fixture(
                    must_keep_id, **changes
                )
                with self.assertRaises(AuditValidationError):
                    validate_must_keep_coverage(
                        sample_must_keep_inventory(),
                        decisions,
                        source_map,
                        sample_index()["outline"],
                        sample_policy(),
                        require_complete=False,
                    )

    def test_complete_gate_rejects_secondary_only_or_unclaimed_items(self):
        for lesson_id, secondary_chapter in (("2-3", 2), ("1-3", 1)):
            with self.subTest(lesson_id=lesson_id):
                decisions, source_map, source_outline = course_route_claim_fixture(
                    lesson_id, secondary_chapter
                )
                with self.assertRaisesRegex(
                    AuditValidationError, "primarySourceRoutes"
                ):
                    validate_must_keep_coverage(
                        sample_must_keep_inventory(),
                        decisions,
                        source_map,
                        source_outline,
                        sample_policy(),
                        require_complete=True,
                    )

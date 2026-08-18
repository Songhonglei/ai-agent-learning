import unittest
from pathlib import Path

from scripts.source_audit.extract_pdf_index import build_source_index


class OriginalPdfIntegrationTests(unittest.TestCase):
    def test_current_pdf_matches_approved_baseline(self):
        manifest, index = build_source_index(
            Path("reference/原始文档.pdf"),
            "reference/原始文档.pdf",
        )
        self.assertEqual(
            manifest["sha256"],
            "27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac",
        )
        self.assertEqual(manifest["pageCount"], 314)
        self.assertEqual(manifest["counts"]["figures"], 120)
        self.assertEqual(manifest["counts"]["tables"], 23)
        self.assertEqual(manifest["counts"]["experiments"], 94)
        self.assertEqual(manifest["counts"]["outlineItems"], 283)
        self.assertFalse([
            page for page in index["pages"] if page["charCount"] == 0
        ])

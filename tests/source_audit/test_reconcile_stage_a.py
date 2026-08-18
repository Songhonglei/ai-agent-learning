import unittest

from scripts.source_audit.reconcile_stage_a import apply_stage_a_amendments


class StageAReconciliationTests(unittest.TestCase):
    def test_reconciliation_appends_a_hash_chained_amendment(self):
        decisions = [{
            "sourceId": "experiment-7-11",
            "reviewState": "reviewed",
            "lessonIds": [],
            "mustKeepIds": [],
            "riskFlags": [],
            "reason": "[版本边界] 留待未来技术人员版",
        }]
        candidate, entries = apply_stage_a_amendments(
            decisions,
            [{"entryType": "genesis", "acceptedDecisionsSha256": "a" * 64}],
            reviewer="reviewer-stage-a-closure",
            reviewer_task_id="/root/stage_a_closure",
            amendments=[{
                "amendmentId": "stage-a-003",
                "sourceId": "experiment-7-11",
                "updates": {"mustKeepIds": ["analysis-high-priority-03"]},
                "reason": "补齐第7章未来技术人员版的必保留论点来源。",
            }],
        )
        self.assertEqual(candidate[0]["mustKeepIds"], ["analysis-high-priority-03"])
        self.assertEqual(entries[0]["baseDecisionsSha256"], "a" * 64)
        self.assertEqual(entries[0]["sourceId"], "experiment-7-11")

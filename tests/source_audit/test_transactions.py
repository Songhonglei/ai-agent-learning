import hashlib
import json
import os
import stat
import tempfile
import unittest
from pathlib import Path
from unittest import mock
from unittest.mock import patch

from scripts.source_audit.transactions import (
    _stage_bytes,
    deterministic_json_bytes,
    sha256_json,
    write_files_transaction,
    write_json_transaction,
)


def _fail_at(real_replace, failure_position):
    calls = {"count": 0}

    def injected_replace(source, target):
        calls["count"] += 1
        if calls["count"] == failure_position:
            raise OSError("replace failed")
        return real_replace(source, target)

    return injected_replace


class TransactionFixture(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.first = self.root / "first.json"
        self.second = self.root / "second.json"
        self.third = self.root / "third.json"
        self.restore_original_fixtures()

    def restore_original_fixtures(self):
        for path, payload, mode in (
            (self.first, b"old-a", 0o640),
            (self.second, b"old-b", 0o600),
            (self.third, b"old-c", 0o644),
        ):
            path.write_bytes(payload)
            os.chmod(path, mode)

    def tearDown(self):
        self.temporary.cleanup()


class TransactionTests(TransactionFixture):
    def test_deterministic_json_bytes_is_sorted_utf8_with_newline(self):
        payload = deterministic_json_bytes({"乙": 2, "a": 1})
        self.assertEqual(
            payload,
            b'{\n  "a": 1,\n  "\\u4e59": 2\n}\n'.replace(
                b"\\u4e59", "乙".encode("utf-8")
            ),
        )

    def test_sha256_json_hashes_deterministic_bytes(self):
        value = {"b": 2, "a": 1}
        self.assertEqual(
            sha256_json(value),
            hashlib.sha256(deterministic_json_bytes(value)).hexdigest(),
        )

    def test_temporary_files_are_staged_beside_target(self):
        target = self.root / "nested" / "state.json"
        temporary = _stage_bytes(target, b"payload", 0o640)
        try:
            self.assertEqual(temporary.parent, target.parent)
            self.assertEqual(temporary.read_bytes(), b"payload")
            self.assertEqual(stat.S_IMODE(temporary.stat().st_mode), 0o640)
        finally:
            temporary.unlink(missing_ok=True)

    def test_failure_at_first_replace_touches_no_target(self):
        before = {self.first: self.first.read_bytes(), self.second: self.second.read_bytes()}
        with patch(
            "scripts.source_audit.transactions.os.replace",
            side_effect=OSError("first replace failed"),
        ):
            with self.assertRaisesRegex(OSError, "first replace failed"):
                write_files_transaction({self.first: b"new-a", self.second: b"new-b"})
        self.assertEqual(
            {self.first: self.first.read_bytes(), self.second: self.second.read_bytes()},
            before,
        )

    def test_rollback_removes_new_target_and_all_temp_files(self):
        new_target = self.root / "new.json"
        with patch(
            "scripts.source_audit.transactions.os.replace",
            side_effect=[None, OSError("second replace failed"), None],
        ):
            with self.assertRaisesRegex(OSError, "second replace failed"):
                write_files_transaction({new_target: b"new", self.second: b"changed"})
        self.assertFalse(new_target.exists())
        self.assertEqual(list(self.root.rglob("*.tmp")), [])

    def test_write_json_transaction_uses_canonical_bytes(self):
        write_json_transaction({self.first: {"b": 2, "a": 1}})
        self.assertEqual(
            self.first.read_bytes(),
            deterministic_json_bytes({"a": 1, "b": 2}),
        )


class TransactionRollbackTests(TransactionFixture):
    def test_each_commit_failure_restores_bytes_and_modes(self):
        real_replace = os.replace
        for failure_position in (1, 2, 3):
            with self.subTest(failure_position=failure_position):
                self.restore_original_fixtures()
                before = {
                    path: (path.read_bytes(), stat.S_IMODE(path.stat().st_mode))
                    for path in (self.first, self.second, self.third)
                }
                with patch(
                    "scripts.source_audit.transactions.os.replace",
                    side_effect=_fail_at(real_replace, failure_position),
                ):
                    with self.assertRaisesRegex(OSError, "replace failed"):
                        write_files_transaction({
                            self.first: b"new-a",
                            self.second: b"new-b",
                            self.third: b"new-c",
                        })
                after = {
                    path: (path.read_bytes(), stat.S_IMODE(path.stat().st_mode))
                    for path in (self.first, self.second, self.third)
                }
                self.assertEqual(after, before)

import json
import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "mcp_server"))
from fixtures import get_evidence, list_evidence_ids, canonical_json

class GovernancePackTests(unittest.TestCase):
    def test_only_fixed_synthetic_fixture_is_listed(self):
        self.assertEqual(list_evidence_ids(), ["EVID-SYNTH-001"])
    def test_unknown_identifier_is_not_found(self):
        self.assertEqual(get_evidence("PRODUCTION-001")["status"], "not_found")
    def test_fixture_is_synthetic_and_not_assessed(self):
        evidence = get_evidence("EVID-SYNTH-001")
        self.assertEqual(evidence["classification"], "synthetic")
        self.assertEqual(evidence["status"], "not_assessed")
        self.assertIn("not evidence about TAMV operations", evidence["content"])
    def test_digest_matches_canonical_record(self):
        import hashlib
        evidence = get_evidence("EVID-SYNTH-001")
        digest = evidence.pop("digest_sha256")
        self.assertEqual(len(digest), 64)
        self.assertEqual(digest, hashlib.sha256(canonical_json(evidence)).hexdigest())
    def test_handoff_schema_and_example_are_parseable(self):
        schema = json.loads((ROOT / "schemas/handoff.schema.json").read_text())
        example = json.loads((ROOT / "templates/handoff.example.json").read_text())
        self.assertEqual(schema["$schema"], "https://json-schema.org/draft/2020-12/schema")
        self.assertFalse(example["constraints"]["external_sharing"])
        self.assertTrue(example["constraints"]["data_minimization"])
        evidence = get_evidence(example["inputs"][0]["evidence_id"])
        self.assertEqual(evidence["digest_sha256"], example["inputs"][0]["digest"])
    def test_adversarial_cases_have_unique_ids(self):
        cases = [json.loads(line) for line in (ROOT / "evals/adversarial-cases.jsonl").read_text().splitlines() if line.strip()]
        ids = [case["case_id"] for case in cases]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertGreaterEqual(len(cases), 8)
        self.assertTrue(all(case.get("expected") for case in cases))
    def test_five_skills_are_versioned(self):
        skills = list((ROOT / "skills").glob("*/SKILL.md"))
        self.assertEqual(len(skills), 5)
        for path in skills:
            text = path.read_text()
            self.assertTrue(text.startswith("---\n"))
            self.assertIn('version: "2.0.0"', text)

if __name__ == "__main__":
    unittest.main()

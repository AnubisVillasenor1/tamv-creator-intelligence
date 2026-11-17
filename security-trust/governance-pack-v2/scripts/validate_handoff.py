#!/usr/bin/env python3
"""Validate the handoff schema and example with a Draft 2020-12 implementation."""
import json
import pathlib
import sys

try:
    from jsonschema import Draft202012Validator, FormatChecker
except ImportError:
    print("ERROR: install requirements-validation.txt before validating JSON Schema", file=sys.stderr)
    raise SystemExit(2)

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "schemas" / "handoff.schema.json"
EXAMPLE_PATH = ROOT / "templates" / "handoff.example.json"


def reject_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=reject_duplicate_keys)


def main():
    try:
        schema = load_json(SCHEMA_PATH)
        example = load_json(EXAMPLE_PATH)
        Draft202012Validator.check_schema(schema)
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        errors = sorted(validator.iter_errors(example), key=lambda err: list(map(str, err.absolute_path)))
        if errors:
            for error in errors:
                location = "$" + "".join(f"[{part!r}]" for part in error.absolute_path)
                print(f"ERROR {location}: {error.message}", file=sys.stderr)
            return 1
        # Negative controls: each must fail schema validation.
        invalid_cases = []
        no_minimization = json.loads(json.dumps(example))
        del no_minimization["constraints"]["data_minimization"]
        invalid_cases.append(("missing data_minimization", no_minimization))
        sharing_enabled = json.loads(json.dumps(example))
        sharing_enabled["constraints"]["external_sharing"] = True
        invalid_cases.append(("external_sharing=true", sharing_enabled))
        bad_digest = json.loads(json.dumps(example))
        bad_digest["inputs"][0]["digest"] = "not-a-digest"
        invalid_cases.append(("malformed digest", bad_digest))
        unknown_field = json.loads(json.dumps(example))
        unknown_field["unreviewed_override"] = True
        invalid_cases.append(("unknown root field", unknown_field))
        for name, candidate in invalid_cases:
            if not any(validator.iter_errors(candidate)):
                print(f"ERROR negative control unexpectedly accepted: {name}", file=sys.stderr)
                return 1
        print("Handoff JSON Schema Draft 2020-12 validation passed; 4 negative controls rejected.")
        return 0
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

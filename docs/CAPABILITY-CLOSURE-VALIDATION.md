# Capability closure validation

This gate keeps the public capability catalog, Genesis closure inventory, and Skills.sh registry aligned. It is a repository consistency check, not a deployment or provider-connectivity test.

## Commands

```sh
bun run ops:closure:test
bun run ops:closure
```

The regression suite exercises six scenarios: valid baseline, duplicate module identifiers, missing evidence paths, a closed module without tests, an uncovered declared capability, and an invalid lifecycle status.

## Enforced invariants

- Every module has a unique identifier, a recognized status, and a non-empty explanatory note.
- Every referenced evidence and test path exists in the repository.
- A module marked `closed` has at least one evidence artifact and one test file.
- Every capability declared by a public skill is covered by at least one closure module.
- Closure modules cannot silently invent capabilities or refer to unknown public skills.
- The four public skill identifiers match between `tamv-genesis/v3/pack.json`, `tamv-genesis/v3/closure.json`, and `skills.sh.json`.

## Lifecycle semantics

| Status | Interpretation |
|---|---|
| `closed` | Local implementation evidence and tests exist; this does not imply external production verification. |
| `contract` | An executable contract may be tested, but a real provider/service is not necessarily connected. |
| `documented` | Published documentation only; not an operational service. |
| `partial` | Work has started, with limitations recorded. |
| `blocked` | Depends on an external, verifiable action or resource. |
| `open` | Recognized work not yet started. |

A passing gate proves inventory consistency and path existence only. It does not execute every test listed, inspect the content of external evidence, prove a cloud integration, sign a release, or authorize promotion to production. Production acceptance still requires the independent gates in [PRODUCTION-EVIDENCE-GATES.md](PRODUCTION-EVIDENCE-GATES.md) and [PRODUCTION-ENVIRONMENT.md](PRODUCTION-ENVIRONMENT.md).

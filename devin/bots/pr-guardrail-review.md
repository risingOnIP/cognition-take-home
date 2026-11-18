# Bot: Guardrail review on every PR

- **Type:** Devin Review, on pull requests (plus the CI conformance tests, which are deterministic)
- **Scope:** `web/src/app/apps/**`, `platform/**`

**Review instructions**
> Check the PR against `devin/knowledge/fintech-guardrails.md`. Flag: writes without `audit(tx, …)` in the same transaction; approval transitions without `makerChecker`; role checks done by name instead of permission; floats for money; unmasked PII in React props; list queries without a row scope; new external calls that move money without `runIdempotent`. Comment with the file and line and the specific rule.

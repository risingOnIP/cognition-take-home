# Bot: Quarterly access review

- **Type:** Devin Automation, scheduled on the 1st of each quarter
- **Repo:** cognition-take-home

**Prompt**
> Against the production database (read-only credentials from secrets), export every group -> role assignment, all segregation-of-duties violations (`findSodViolations`), all `role.grant`/`role.revoke` audit events since the last review, and the audit hash-chain verification result. Write a CSV and markdown summary for Compliance and post it to #compliance-reviews. Do not change any data.

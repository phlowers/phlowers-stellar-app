# 🛡️ CRITICAL SECURITY PROTOCOL - STELLAR

## ANTI-HALLUCINATION GOLDEN RULES
- **ZERO TOLERANCE:** NEVER modify a single line outside the defined scope.
- **NO REFACTORING:** Do not "clean up" or reorganize existing code.
- **STOP & ASK:** If a spec is ambiguous or a Pyodide type is unknown, STOP.
- **RESET:** Treat every new task as a blank slate.

## 1. Skill: The Architect (Planning)
- **Action:** Create a `plan.md` in micro-steps (max 10 lines of code per step).
- **Angular:** Standalone is mandatory. Pyodide must be isolated in `PyodideService`.

## 2. Skill: The Analyst (Diagnosis)
- **Action:** Diagnosis only. File modifications are forbidden.
- **Focus:** Identify whether the error is in Python code, the Worker, or the Angular Service.

## 3. Skill: The Executor (Action - MAXIMUM SECURITY)
- **CONSTRAINT:** Modify only the lines required for the current plan step.
- **PROHIBITION:** Do not touch imports or surrounding code without authorization.
- **REQUIREMENT:** Use `Logger` and `Notification`. No `console.log`.
- **WASM:** Call `.destroy()` on every created `PyProxy` to avoid memory leaks.

## 4. Skill: The Auditor (Critical Review)
- **Action:** Hunt regressions, hidden `any` types, and Signal leaks.
- **Verdict:** Score from 1 to 5. If < 5, the code must be reverted.

## 5. Skill: The Tester (Vitest 100%)
- **Goal:** 100% coverage on Services. 80%+ on Components.
- **Selectors:** `data-testid` only.
- **Mocks:** Mandatory mocks for `PyodideService`, `Logger`, and `Notification`.

## 6. Skill: The Mediator (Rebase/Conflicts)
- **Action:** Code investigator. Analyze global impact before merging.
- **Rule:** "Cumulative Merge" (keep both logics when in doubt).

## 7. Skill: The Cleaner & 8. The Scribe
- Remove dead imports + `git aa && git cs -m "[type]: [msg]" && git push`.

## 8. Skill: The Expert Git Scribe (Security & Traceability)
- **Mandatory Signature:** Every commit MUST be digitally signed (GPG/SSH). Use the `-S` flag.
- **Command:** `git add -A && git commit -S -m "[type]: [message]" && git push`
- **Recommended Alias:** If the `git cs` alias is used, it must include signature (`git config --global alias.cs "commit -S -m"`).
- **Message Standard:** Strict compliance with Conventional Commits (`feat`, `fix`, `refactor`, etc.).

## 9. Skill: The Test Repairer (Vitest Specialist)
**Role:** Emergency responder for broken test suites.
- **Failure Analysis:** First analyze the Vitest error log. Identify whether the failure is due to:
    1. An outdated mock (e.g., `PyodideService` changed).
    2. A missing or renamed `data-testid` selector.
    3. A real business logic regression.
- **Non-Regression Rule:** Do not remove a test or weaken assertions just to make it pass.
- **Mocks & Spies:** Verify that `vi.spyOn` or `vi.mock` remain aligned with real service signatures.
- **Coverage Goal:** If the fix reduces coverage below 100%, you must add tests to compensate.
- **Validation:** After fixing, explain why the test was failing to prevent recurrence.
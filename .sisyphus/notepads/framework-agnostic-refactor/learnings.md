## Task 5 learnings

- Bun's built-in test runner works cleanly in the workspace without extra dependencies.
- Root `bun run test` successfully fans out through Turbo when the package-level `test` script is present.
- Capturing evidence from PowerShell may add a BOM or command prefix line, but the test results still show the expected pass/fail summary.

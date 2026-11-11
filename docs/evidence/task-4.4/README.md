# Task 4.4 – CI Evidence

## Pull request
PR #44 – [Task 4.4 CI pipeline](https://github.com/mhien06/BrewLite_A2/pull/44), merged into `develop`.

## Pipeline
The workflow runs on pull requests targeting `develop` or `main` and executes:

`Install → Lint → Unit Test → Build`

## CI runs
- [Run #3](https://github.com/mhien06/BrewLite_A2/actions/runs/42835474142) — intentional unit-test failure used to verify that CI detects a failing test. The temporary failing test was removed afterward.
- [Run #4](https://github.com/mhien06/BrewLite_A2/actions/runs/42835765409) — all CI steps passed on the final PR commit.

## Branch protection
- `develop` requires pull requests, one approval, and the `CI` status check; [screenshot](branch-protection-develop.png).
- `main` requires pull requests, one approval, and the `CI` status check; [screenshot](branch-protection-main.png).

## Evidence files
- [CI failure](ci-fail.png)
- [CI success](ci-pass.png)
- [Branch protection for develop](branch-protection-develop.png)
- [Branch protection for main](branch-protection-main.png)

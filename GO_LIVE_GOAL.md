# Production Objective

Prove Project Finisher can safely review LIT-GhostTown, understand the current MVP state, create a production-readiness plan, make one small smoke-testable improvement if safe, run acceptance checks, and commit the result only if green.

# One Next Task Only

Create a lightweight production-readiness smoke artifact for LIT-GhostTown that documents what the app currently does, what tests and commands are available, what is missing before consumer-ready production use, and the next safest production task.

Do not implement a large feature in this first live smoke.

# Revenue/User Impact

This moves LIT-GhostTown toward a consumer-ready product where a builder can enter an idea and receive a useful verdict/report that helps them avoid wasting months on the wrong idea.

# Allowed Files

README.md
docs/**
.project-finisher/**
tests/**

# Forbidden Files

.env
.env.*
secret files
credentials
private keys
deployment secrets
unrelated repos
files outside the isolated worktree lane

# Acceptance Commands

npm run check
git diff --check

# Done Criteria

README/codebase reviewed
production-readiness assessment created
at least one useful smoke artifact or tiny verification improvement added
deterministic checks run
no secrets printed or written
no direct mutation to the original repo outside the isolated lane
branch-local commit created only after checks pass
Project Finisher receipt written

# Rollback Rule

If checks fail and cannot be repaired within the repair budget, do not commit. Report the blocker and provide the next exact command.

# Commit Message

Add production readiness smoke checkpoint

# Push Policy

no

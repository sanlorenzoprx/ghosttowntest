# Retire automatic public video jobs

Fresh verdicts and cache hits no longer enqueue the old report-to-eight-card renderer. Cached results no longer retain a stale video-job link. Verdict scoring and source evidence are unchanged.

Authenticated legacy claim, upload and failure endpoints return `410 Gone` before KV/R2 mutation. Old queued/processing status summaries report failed; completed status and MP4 reads remain available. Records and existing video objects are preserved.

Companion ShortsFactory PR #82 removes the polling schedule, tombstones old Python callers, and connects normal production CLI/container execution to accepted StoryPlan/StoryShape packets with measured narration. Do not merge its obsolete voiced-MVP PR #79.

This stops automatic generation; it does not redirect all verdicts into another paid queue. New media production requires an explicit accepted packet and provider budget. No automatic historical backfill is authorized.

Verification includes 10,000 simulated old claims with no KV list/get/put calls, refused stale upload/failure callbacks, authenticated access checks, and preserved completed MP4 reads. This is a retirement regression, not a production throughput benchmark.

Coordinate deployment of this API retirement with the ShortsFactory consumer removal. No production deployment is part of these changes.

# Commit Meta Schema (v3)

Schema id: `bagakit.commit-spec/v3`

## Purpose

Provide fixed metadata keys for commit message retrieval, validation, and cross-workflow context mapping.

## Required Keys

| Key | Description | Allowed Pattern |
| --- | --- | --- |
| `schema` | schema id | must be `bagakit.commit-spec/v3` |
| `kind` | message kind | `commit_message_spec` |
| `generated_at` | generation timestamp | ISO-8601 UTC |
| `session` | commit-spec session id | `<date>-<slug>` |
| `goal_target` | target objective | non-empty string |
| `goal_status` | completion status | `complete|partial|in_progress|blocked` |
| `goal_completion` | done vs remaining | non-empty string |
| `driver` | workflow driver semantic token | `none` or `[a-z][a-z0-9_-]*` |
| `driver_meta` | driver context payload | `none` or `key=value(; key=value)*` |
| `activity_brainstorm` | brainstorm activity | non-empty (`none` allowed) |
| `activity_spec` | spec activity | non-empty (`none` allowed) |
| `activity_skill` | skill activity | non-empty (`none` allowed) |
| `activity_docs` | docs activity | non-empty (`none` allowed) |
| `module_count` | number of module bullets | integer string |

## First-Class Knowledge Activities

The following activities must always be represented explicitly:

- brainstorm,
- spec writing,
- skill adjustment,
- documentation deposition.

Use `none` only when truly not involved.

## Driver Context Policy (Semantic-First)

- Keep standalone-first: `driver=none` and `driver_meta=none` is always valid.
- Keep schema semantic and portable: do not hardcode one key per workflow system.
- Use one generic driver key:
  - `driver`: semantic token (for example `ftharness`, `openspec`, `longrun`, `custom`),
  - `driver_meta`: parseable key-value payload.
- Examples:
  - `driver="ftharness"`, `driver_meta="feat=<id>; task=<id>; status=<...>; completion=<x/y>"`
  - `driver="openspec"`, `driver_meta="change=<id>; status=<...>; completion=<x/y>"`
  - `driver="none"`, `driver_meta="none"`

## Validation Notes

`lint-message` enforces:

- required keys present,
- schema id matches,
- kind lock (`commit_message_spec`),
- `generated_at` ISO-8601 UTC format,
- `session` format `<YYYY-MM-DD>-<slug>`,
- `module_count` is integer and matches `## Changes by Module` bullet count,
- goal status allowed,
- `driver` semantic token valid,
- `driver_meta` parseable,
- `driver=none` requires `driver_meta=none`,
- required GFM sections present:
  - `Purpose`,
  - `Why This Change` (`Before/Change/Gain`),
  - `Goal Status`,
  - `Changes by Module`,
  - `Learnings and Cases`,
  - `Validation`,
  - `Driver Context`,
  - `Knowledge Activities`,
  - `Remaining Work` (`None` or `What/Why Pending/Plan` template),
- no unresolved placeholders.

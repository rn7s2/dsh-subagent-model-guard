# dsh-subagent-model-guard

A DSH Host plugin that refuses subagent delegation which names no explicit child model.

## Why

A subagent inherits the caller's provider and model when the call omits `provider` and `model`. The
Subagent settings page (`Plugins` → `Subagent` → `Model selection`) records an allowlist per Session,
but that list only constrains an *explicit* choice — an inherited parent route is never checked
against it. So a flash-only allowlist still lets children run on the main thread's model.

This guard closes that gap: the call is denied before dispatch unless both fields are present.

## How

`ctx.tools.guard()` registers a synchronous, order-independent denial. Guards run after
`tools/pre-execute` policy and before the tool body, so the official `subagent` tool never starts.

The denial text tells the model what to supply, and points at `list_subagent_models` for the routes
the Session allows. A corrected call passes the guard and is then validated by the official tool
against the Session policy.

## Install

Install the directory as a bundle (DSH **Plugins** → Add plugin, or `plugin_manager`
`install_bundle` with this path). Local installation links the checkout, so later edits here apply
live.

```yaml
- insert:
    - id: subagent-model-guard
      name: '@local/dsh-subagent-model-guard'
      config:
        tools:
          - subagent
```

## Config

| Field | Default | Meaning |
| --- | --- | --- |
| `tools` | `['subagent']` | Delegation tool names that require an explicit route. |
| `message` | built-in text | Replacement refusal sentence. |

## Limits

- Only tools that accept `provider`/`model` belong in `tools`. `subagent_fork` takes no model fields,
  so guarding it would make every fork call fail.
- Scripts run by the `workflow` tool start children outside a tool call and are not guarded.
- The guard enforces presence, not membership: an explicit but disallowed route is still rejected by
  the official tool's Session policy.

## Test

```sh
node --test
```

/**
 * Deny a delegation call that names no explicit child model.
 *
 * A subagent inherits the caller's provider/model when the call omits
 * `provider` and `model`, so a model allowlist alone cannot stop a child from
 * running on the parent's model. This guard makes the route mandatory: the
 * call is refused before dispatch, and the refusal names what to supply.
 *
 * Guards run after `tools/pre-execute` policy and before the tool body, so the
 * decision holds regardless of listener order.
 */

/** Guarded tool names when the row's config supplies none. */
const DEFAULT_TOOLS = ['subagent']

/** Refusal text appended after the tool name. */
const DEFAULT_MESSAGE = 'this delegation names no child model; pass both "provider" and "model"'
  + ' (call `list_subagent_models` for the routes this Session allows)'

/** Whether a parsed argument is a non-empty string. */
function named(value) {
  return typeof value === 'string' && value.length > 0
}

/** Normalize the row's `tools` list. */
function guardedTools(config) {
  const configured = config?.tools
  return new Set(Array.isArray(configured) && configured.length > 0 ? configured : DEFAULT_TOOLS)
}

/**
 * Register the guard for every agent in this profile.
 * @param ctx - plugin context; `tools` is declared as an injection requirement.
 * @param config - the row's `config` from the patch layer.
 * @returns nothing; the guard is an effect of this plugin's context.
 */
export function apply(ctx, config) {
  const tools = guardedTools(config)
  const message = named(config?.message) ? config.message : DEFAULT_MESSAGE
  ctx.effect(() => ctx.tools.guard((exec) => {
    if (!tools.has(exec.name)) return
    const args = exec.arguments
    if (named(args?.provider) && named(args?.model)) return
    return `\`${exec.name}\` refused: ${message}`
  }))
}

export const name = 'subagent-model-guard'
export const inject = ['tools']

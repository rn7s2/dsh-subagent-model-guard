import assert from 'node:assert/strict'
import test from 'node:test'

import { apply } from '../index.js'

/** Mount the plugin against a minimal fake context and expose its guard. */
function mount(config) {
  let guard
  const disposers = []
  const ctx = {
    tools: {
      guard(fn) {
        guard = fn
        return () => { guard = undefined }
      },
    },
    effect(callback) {
      const dispose = callback()
      disposers.push(dispose)
      return dispose
    },
  }
  apply(ctx, config)
  return {
    call(args, name = 'subagent') {
      assert.ok(guard, 'the guard should be registered on mount')
      return guard({ name, arguments: args })
    },
    active() {
      return guard !== undefined
    },
    unmount() {
      for (const dispose of disposers) dispose()
    },
  }
}

test('denies a delegation that names no route', () => {
  const denial = mount().call({ description: 'x', prompt: 'y' })
  assert.equal(typeof denial, 'string')
  assert.match(denial, /`subagent` refused/)
  assert.match(denial, /provider/)
  assert.match(denial, /list_subagent_models/)
})

test('denies a half-specified route', () => {
  const guard = mount()
  assert.equal(typeof guard.call({ provider: 'deepseek-account' }), 'string')
  assert.equal(typeof guard.call({ model: 'deepseek-flash' }), 'string')
})

test('denies empty route values', () => {
  const guard = mount()
  assert.equal(typeof guard.call({ provider: '', model: '' }), 'string')
})

test('allows a fully specified route', () => {
  const guard = mount()
  assert.equal(guard.call({ provider: 'deepseek-account', model: 'deepseek-flash' }), undefined)
})

test('ignores tools outside the configured list', () => {
  const guard = mount()
  assert.equal(guard.call({ prompt: 'y' }, 'subagent_fork'), undefined)
  assert.equal(guard.call({ prompt: 'y' }, 'bash'), undefined)
})

test('honours a custom tool list and message', () => {
  const guard = mount({ tools: ['delegate'], message: 'name a model first' })
  assert.match(guard.call({}, 'delegate'), /name a model first/)
  assert.equal(guard.call({}, 'subagent'), undefined)
})

test('unmount removes the guard', () => {
  const guard = mount()
  assert.equal(guard.active(), true)
  guard.unmount()
  assert.equal(guard.active(), false)
})

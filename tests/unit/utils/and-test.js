
import { assert } from 'chai'
import { describe, it } from 'mocha'
import and from 'ember-changeset-hofs/utils/and'
import Ember from 'ember'

/**
 * @param {Number} ms
 */
function resolveAfter(ms) {
  return new Ember.RSVP.Promise((resolve, reject) => {
    try {
      Ember.run.later(resolve, true, ms)
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Note: ember-changeset treats anything that isn't the
 * value `true` as a failed alidation.
 *
 * @param {Number} ms
 * @param {String} errorMessage
 */
function rejectAfter(ms, errorMessage) {
  return new Ember.RSVP.Promise((resolve, reject) => {
    try {
      Ember.run.later(resolve, errorMessage, ms)
    } catch (err) {
      reject(err)
    }
  })
}

describe('and', function() {
  describe('sync validators', function() {
    it('should work with an argument list', function() {
      const testCases = [
        {
          validators: [() => true, () => 'this is an error message'],
          expected: 'this is an error message',
        },
        {
          validators: [() => true, () => false],
          expected: false
        },
        {
          validators: [() => true, () => true],
          expected: true
        },
      ]

      for (const { validators, expected } of testCases) {
        const validationFn = and(...validators)
        assert.equal(validationFn(), expected)
      }
    })

    it('should short-circuit', function() {
      const didExecute = [false, false, false]
      const validators = [
        () => didExecute[0] = true,
        () => false,
        () => { throw new Error('This validator should not be reached.') },
      ]
      const validationFn = and(...validators)
      validationFn()
      assert.deepEqual(didExecute, [true, false, false])
    })

    it('should work with arbitrary nesting', function() {
      {
        const validators1 = [
          () => 'first error',
          () => 'second error',
          () => 'third error',
        ]

        const validators2 = [
          () => 'fourth error',
          () => 'fifth error',
          () => 'sixth error',
        ]

        const validators3 = [
          () => 'seventh error',
          () => 'eighth error',
          () => 'ninth error',
        ]

        const validationFn = and(
          and(
            and(...validators1),
            and(...validators2)
          ),
          and(...validators3)
        )

        assert.equal(validationFn(), 'first error')
      }

      {
        const validators1 = [
          () => true,
          () => true,
          () => true,
        ]

        const validators2 = [
          () => true,
          () => 'leeroy jenkins',
          () => true,
        ]

        const validators3 = [
          () => true,
          () => true,
          () => true,
        ]

        const validationFn = and(
          and(
            and(...validators1),
            and(...validators2)
          ),
          and(...validators3)
        )

        assert.equal(validationFn(), 'leeroy jenkins')
      }
    })
  })

  describe('async validators', function() {
    it('should work with an argument list', async function() {
      const testCases = [
        {
          validators: [() => resolveAfter(1), () => resolveAfter(2), () => resolveAfter(3)],
          expected: true,
        },
        {
          validators: [() => resolveAfter(1), () => true, () => resolveAfter(3)],
          expected: true,
        },
        {
          validators: [() => resolveAfter(1), () => true, () => rejectAfter(3, 'rip')],
          expected: 'rip',
        },
      ]

      for (const { validators, expected } of testCases) {
        const validationFn = and(...validators)
        const result = await validationFn()
        assert.equal(result, expected)
      }
    })

    it('should short-circuit', async function() {
      const didExecute = [false, false, false]
      const validators = [
        () => resolveAfter(1).then(() => didExecute[0] = true),
        () => resolveAfter(1).then(() => false),
        () => resolveAfter(1).then(() => { throw new Error('This validator should not be reached.') }),
      ]
      const validationFn = and(...validators)
      await validationFn()
      assert.deepEqual(didExecute, [true, false, false])
    })

    it('should work with arbitrary nesting', async function() {
      {
        const validators1 = [
          () => Ember.RSVP.resolve('first error'),
          () => Ember.RSVP.resolve('second error'),
          () => Ember.RSVP.resolve('third error'),
        ]

        const validators2 = [
          () => Ember.RSVP.resolve('fourth error'),
          () => Ember.RSVP.resolve('fifth error'),
          () => Ember.RSVP.resolve('sixth error'),
        ]

        const validators3 = [
          () => Ember.RSVP.resolve('seventh error'),
          () => Ember.RSVP.resolve('eighth error'),
          () => Ember.RSVP.resolve('ninth error'),
        ]

        const validationFn = and(
          and(
            and(...validators1),
            and(...validators2)
          ),
          and(...validators3)
        )

        assert.equal(await validationFn(), 'first error')
      }

      {
        const validators1 = [
          () => Ember.RSVP.resolve(true),
          () => Ember.RSVP.resolve(true),
          () => Ember.RSVP.resolve(true),
        ]

        const validators2 = [
          () => Ember.RSVP.resolve(true),
          () => Ember.RSVP.resolve('leeroy jenkins'),
          () => Ember.RSVP.resolve(true),
        ]

        const validators3 = [
          () => Ember.RSVP.resolve(true),
          () => Ember.RSVP.resolve(true),
          () => Ember.RSVP.resolve(true),
        ]

        const validationFn = and(
          and(
            and(...validators1),
            and(...validators2)
          ),
          and(...validators3)
        )

        assert.equal(await validationFn(), 'leeroy jenkins')
      }
    })

    it('should pass arguments to validators', function() {
      {
        const validators = [
          (key, newValue, oldValue, changes, object) => [key, newValue, oldValue, changes, object],
          (key, newValue) => true,
          (key, newValue) => true,
        ]

        const validationFn = and(...validators)
        assert.deepEqual(validationFn(1, 2, 3, 4, 5), [1, 2, 3, 4, 5])
      }

      {
        const validators = [
          (key, newValue) => true,
          (key, newValue, oldValue, changes, object) => [key, newValue, oldValue, changes, object],
          (key, newValue) => true,
        ]

        const validationFn = and(...validators)
        assert.deepEqual(validationFn(1, 2, 3, 4, 5), [1, 2, 3, 4, 5])
      }
    })
  })
})

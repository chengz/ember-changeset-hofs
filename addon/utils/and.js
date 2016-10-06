
import isPromise from 'ember-changeset/utils/is-promise'
import Ember from 'ember'

function notTrue(value) {
  return Ember.typeOf(value) !== 'boolean' || !value
}

function handleResult(result) {
  if (notTrue(result)) throw result
  return true
}

/**
 * Accepts an array of ember-changeset-validations
 * validation functions.
 */
export default function and(...validators) {
  return (key, newValue, oldValue, changes, object) => {
    for (let i = 0; i < validators.length; i++) {
      const validation = validators[i](...arguments)

      if (isPromise(validation)) {
        let promise = validation.then(handleResult)

        for (let j = i+1; j < validators.length; j++) {
          promise = promise
            .then(() => validators[j](key, newValue, oldValue, changes, object))
            .then(handleResult)
        }

        return promise.catch(err => err)
      }

      if (notTrue(validation)) return validation
    }

    return true
  }
}


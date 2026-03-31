/**
 * Mock for electron-store in test environment.
 * electron-store depends on electron which isn't available during testing.
 */
class MockStore {
  constructor(options = {}) {
    this._data = {}
    this._options = options
  }

  get(key) {
    return this._data[key]
  }

  set(key, value) {
    if (typeof key === 'object') {
      Object.assign(this._data, key)
    } else {
      this._data[key] = value
    }
  }

  delete(key) {
    delete this._data[key]
  }

  get store() {
    return { ...this._data }
  }
}

export default MockStore

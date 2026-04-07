/**
 * MinHeap — binary min-heap priority queue.
 * Used by A* for the open set. O(log n) push/pop.
 * @template T
 */
export class MinHeap {
  constructor(compareFn) {
    /** @type {T[]} */
    this._data = []
    this._compare = compareFn
  }

  get size() { return this._data.length }

  isEmpty() { return this._data.length === 0 }

  /** @param {T} item */
  push(item) {
    this._data.push(item)
    this._bubbleUp(this._data.length - 1)
  }

  /** @returns {T} */
  pop() {
    const top = this._data[0]
    const last = this._data.pop()
    if (this._data.length > 0) {
      this._data[0] = last
      this._sinkDown(0)
    }
    return top
  }

  /** @returns {T} */
  peek() { return this._data[0] }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this._compare(this._data[i], this._data[parent]) < 0) {
        ;[this._data[i], this._data[parent]] = [this._data[parent], this._data[i]]
        i = parent
      } else break
    }
  }

  _sinkDown(i) {
    const n = this._data.length
    while (true) {
      let smallest = i
      const l = 2 * i + 1
      const r = 2 * i + 2
      if (l < n && this._compare(this._data[l], this._data[smallest]) < 0) smallest = l
      if (r < n && this._compare(this._data[r], this._data[smallest]) < 0) smallest = r
      if (smallest !== i) {
        ;[this._data[i], this._data[smallest]] = [this._data[smallest], this._data[i]]
        i = smallest
      } else break
    }
  }
}

/** Storage en memoria para tests, con opción de simular la cuota llena. */
export class MemoryStorage implements Storage {
  private items = new Map<string, string>()
  full = false

  get length() {
    return this.items.size
  }
  clear() {
    this.items.clear()
  }
  getItem(key: string) {
    return this.items.get(key) ?? null
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.items.delete(key)
  }
  setItem(key: string, value: string) {
    if (this.full) throw new DOMException('Cuota llena', 'QuotaExceededError')
    this.items.set(key, value)
  }
}

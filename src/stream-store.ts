export class TextStreamStore {
  private text = "";
  private listeners = new Set<() => void>();
  private timer: number | null = null;
  private lastEmit = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.text;

  append(delta: string) {
    this.text += delta;
    if (this.timer !== null) {
      return;
    }
    const wait = Math.max(0, 32 - (performance.now() - this.lastEmit));
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.lastEmit = performance.now();
      this.listeners.forEach((listener) => listener());
    }, wait);
  }

  reset() {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.text = "";
    this.lastEmit = performance.now();
    this.listeners.forEach((listener) => listener());
  }
}

export const streamStore = new TextStreamStore();
export const reasoningStore = new TextStreamStore();

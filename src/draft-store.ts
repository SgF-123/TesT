export type DraftUpdater = string | ((current: string) => string);

export class DraftStore {
  private text: string;
  private listeners = new Set<() => void>();

  constructor(initialText = "") {
    this.text = initialText;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.text;

  update = (updater: DraftUpdater) => {
    const next =
      typeof updater === "function" ? updater(this.text) : updater;
    if (next === this.text) {
      return;
    }
    this.text = next;
    this.listeners.forEach((listener) => listener());
  };
}

import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("TesT renderer error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="app-crash-fallback" role="alert">
        <section className="app-crash-card">
          <span className="app-crash-icon" aria-hidden="true">
            <TriangleAlert size={20} />
          </span>
          <div className="app-crash-copy">
            <h1>界面遇到异常</h1>
            <p>
              会话数据没有被修改。重新载入界面通常可以恢复；如果反复出现，
              请打开日志确认具体组件。
            </p>
            {this.state.error.message && (
              <pre>{this.state.error.message}</pre>
            )}
          </div>
          <button
            type="button"
            className="app-crash-reload"
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={13} />
            重新载入
          </button>
        </section>
      </main>
    );
  }
}

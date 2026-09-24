import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Keeps a render error in one region from unmounting the whole app.
 * `resetKey` (the current route) clears the error when the user navigates away.
 */
export class ErrorBoundary extends Component<
  { resetKey: string; fallback: ReactNode; children: ReactNode },
  { failedKey: string | null }
> {
  state = { failedKey: null as string | null };

  static getDerivedStateFromError() {
    return { failedKey: '__pending__' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ failedKey: this.props.resetKey });
    console.error('Theo view failed to render:', error, info.componentStack);
  }

  render() {
    const { failedKey } = this.state;
    const failed = failedKey === '__pending__' || failedKey === this.props.resetKey;
    return failed ? this.props.fallback : this.props.children;
  }
}

import { Component } from 'react';

/**
 * React error boundary — catches render/lifecycle errors from children
 * and displays a styled fallback UI instead of crashing the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-iron-950 p-6" role="alert">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
              <span className="text-3xl" aria-hidden="true">💥</span>
            </div>
            <h2 className="text-lg font-semibold text-iron-200 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-iron-400 mb-4">
              The application hit an unexpected error and couldn't recover.
            </p>
            {this.state.error && (
              <p className="text-xs text-red-400/80 font-mono mb-6 bg-iron-900/50 rounded-lg p-3 border border-iron-800/50 break-all" aria-live="assertive">
                {this.state.error.message || String(this.state.error)}
              </p>
            )}
            <button
              onClick={this.handleRetry}
              aria-label="Try again after error"
              className="px-5 py-2.5 bg-soul-500/15 hover:bg-soul-500/25 text-soul-400 text-sm font-medium rounded-xl border border-soul-500/30 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

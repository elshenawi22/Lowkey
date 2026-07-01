import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[LOWKEY] Error caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream flex items-center justify-center px-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl text-charcoal font-light tracking-[0.2em]">LOWKEY</h1>
            <p className="mt-6 text-stone text-sm font-light">حدث خطأ غير متوقع</p>
            <p className="mt-1 text-stone/50 text-xs font-light">Something went wrong</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.history.pushState(null, '', '/'); window.location.reload(); }}
              className="btn-luxury mt-8"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

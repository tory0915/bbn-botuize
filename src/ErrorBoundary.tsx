import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50 p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Something went wrong.</h1>
          <p className="text-sm text-slate-500 mb-4 bg-white p-4 rounded-md border border-slate-200">
            {this.state.errorMsg}
          </p>
          <button
            className="px-6 py-3 bg-black text-white rounded-md text-sm font-semibold hover:bg-slate-800 transition-colors"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

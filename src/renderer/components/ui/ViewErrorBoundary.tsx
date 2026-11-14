import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  viewName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ViewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ViewErrorBoundary] Error in view "${this.props.viewName || 'Unknown'}":`, error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-background text-foreground text-center select-none overflow-y-auto">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-none flex items-center justify-center mb-4 text-rose-500">
            <AlertTriangle className="h-8 w-8 stroke-[2.5]" />
          </div>

          <span className="text-[10px] font-mono font-bold text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-none mb-2 border border-rose-500/20">
            RUNTIME EXCEPTION CAUGHT
          </span>

          <h2 className="text-base font-extrabold uppercase tracking-wider text-foreground">
            {this.props.viewName ? `${this.props.viewName} Screen Error` : 'Screen Display Interrupted'}
          </h2>

          <p className="text-xs text-muted-foreground max-w-md mt-1.5 leading-relaxed">
            An unexpected error occurred while rendering this view. The application core remains protected and stable.
          </p>

          {this.state.error && (
            <div className="mt-4 p-3 bg-secondary/80 border border-border rounded-none text-left max-w-lg w-full font-mono text-[11px] text-foreground overflow-x-auto select-text">
              <span className="font-bold text-rose-500 block mb-1">Error: {this.state.error.name}</span>
              <p className="text-muted-foreground whitespace-pre-wrap">{this.state.error.message}</p>
            </div>
          )}

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={this.handleReload}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#FFC000] hover:bg-[#917300] text-black font-extrabold rounded-none text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Screen</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-none font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Reload Workspace</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

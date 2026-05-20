"use client";
import { Component } from "react";
import { Card, CardContent } from "./ui/card";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.props.onError) this.props.onError(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="text-destructive font-semibold">
                {this.props.name ?? "Component"} Error
              </div>
              <div className="text-sm text-muted-foreground max-w-md">
                {this.state.error?.message ?? "An unexpected error occurred"}
              </div>
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={this.handleRetry}
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

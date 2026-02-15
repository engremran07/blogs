/**
 * ============================================================================
 * MODULE:   editor/utils/ErrorBoundary.tsx
 * PURPOSE:  React Error Boundary for the Rich Text Editor.
 *           Catches crashes in the editor and renders a recoverable fallback.
 * ============================================================================
 */

'use client';

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import logger from './logger';

export interface EditorErrorBoundaryProps {
  /** Content to render on crash. Defaults to a simple error message. */
  fallbackUI?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class EditorErrorBoundary extends Component<EditorErrorBoundaryProps, State> {
  static displayName = 'EditorErrorBoundary';

  constructor(props: EditorErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('RichTextEditor crashed', {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallbackUI) return this.props.fallbackUI;
      return (
        <div
          role="alert"
          style={{
            padding: '16px',
            border: '1px solid #ef5350',
            borderRadius: '8px',
            backgroundColor: '#fff5f5',
            color: '#c62828',
            fontSize: '14px',
          }}
        >
          <strong>Editor Error:</strong> An unexpected error occurred.
          <br />
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            style={{
              marginTop: '8px',
              padding: '6px 12px',
              border: '1px solid #c62828',
              borderRadius: '4px',
              background: 'white',
              color: '#c62828',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Try to recover
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default EditorErrorBoundary;

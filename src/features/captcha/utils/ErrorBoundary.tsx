/**
 * ============================================================================
 * MODULE:   captcha/utils/ErrorBoundary.tsx
 * PURPOSE:  React Error Boundary that catches provider crashes and invokes
 *           the fallback callback so the orchestrator can switch providers.
 * ============================================================================
 */

'use client';

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import logger from './logger';

export interface CaptchaErrorBoundaryProps {
  /** Called when a child component throws. */
  onError: () => void;
  /** Unique label for logging (e.g. provider name). */
  providerName?: string;
  /** Content rendered while the error is active. Defaults to `null`. */
  fallbackUI?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class CaptchaErrorBoundary extends Component<CaptchaErrorBoundaryProps, State> {
  static displayName = 'CaptchaErrorBoundary';

  constructor(props: CaptchaErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const { onError, providerName = 'unknown' } = this.props;
    logger.error(`Provider "${providerName}" crashed`, {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
    onError();
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallbackUI ?? null;
    }
    return this.props.children;
  }
}

export default CaptchaErrorBoundary;

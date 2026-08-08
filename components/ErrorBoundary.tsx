import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createErrorBoundary() {
  return class ErrorBoundaryInner extends React.Component<Props, State> {
    declare state: State;
    declare props: Props;

    constructor(props: Props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
      console.error('[AfriVoice] ErrorBoundary:', error, info);
    }

    handleReset = () => {
      try { localStorage.removeItem('afrivoice_history_v1'); } catch { /* noop */ }
      window.location.reload();
    };

    render() {
      if (this.state.hasError) {
        return (
          <div style={{
            minHeight: '100vh', background: '#09090B', color: '#f4f4f5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif'
          }}>
            <div style={{
              maxWidth: 440, width: '100%', padding: 32, borderRadius: 36,
              background: '#14151C', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)', textAlign: 'center'
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, background: 'rgba(245,158,11,0.1)',
                color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, margin: '0 auto 24px'
              }}>⚠️</div>

              <span style={{
                display: 'inline-block', fontSize: 10, fontWeight: 900, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: '#F59E0B', background: 'rgba(245,158,11,0.1)',
                padding: '4px 12px', borderRadius: 999, marginBottom: 12
              }}>Protection Système Active</span>

              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.03em' }}>
                Une petite interruption est survenue
              </h2>
              <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.7, marginBottom: 24 }}>
                L'application a rencontré un incident temporaire. Cliquez ci-dessous pour relancer votre studio en toute sécurité.
              </p>

              {this.state.error?.message && (
                <div style={{
                  padding: '10px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace',
                  fontSize: 10, color: '#6B7280', textAlign: 'left', marginBottom: 24,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {this.state.error.message}
                </div>
              )}

              <button
                onClick={this.handleReset}
                style={{
                  width: '100%', padding: '16px 0', borderRadius: 16, background: '#D4FF00',
                  color: '#000', fontWeight: 900, fontSize: 11, letterSpacing: '0.15em',
                  textTransform: 'uppercase', border: 'none', cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(212,255,0,0.2)', transition: 'transform 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                🔄 Redémarrer le Studio
              </button>
            </div>
          </div>
        );
      }

      return this.props.children;
    }
  };
}

const ErrorBoundary = createErrorBoundary();
export default ErrorBoundary;

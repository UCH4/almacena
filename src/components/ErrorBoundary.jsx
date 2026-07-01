import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', padding: '40px', textAlign: 'center', color: 'var(--text2)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: 'var(--text)', marginBottom: '8px', fontSize: '18px' }}>
            Algo salió mal
          </h2>
          <p style={{ fontSize: '13px', marginBottom: '24px', maxWidth: '400px', lineHeight: '1.5' }}>
            Ocurrió un error inesperado. No perdiste tus datos, están seguros en la nube.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            🔄 Recargar la app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

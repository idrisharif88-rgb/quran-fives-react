import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ margin: 'auto', padding: '2rem', color: '#c72c41', backgroundColor: '#1a1a1a', minHeight: '100vh', fontFamily: 'sans-serif', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem' }}>عذراً، حدث خطأ ما.</h1>
          <p style={{ fontSize: '1.2rem' }}>نرجو تحديث الصفحة والمحاولة مرة أخرى.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', borderRadius: '5px', border: 'none', background: '#007bff', color: 'white', cursor: 'pointer', fontSize: '1rem', marginTop: '1rem' }}>تحديث الصفحة</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

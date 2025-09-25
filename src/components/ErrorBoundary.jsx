import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorTime: null
    };
  }

  static getDerivedStateFromError(error) {
    console.log('ErrorBoundary captured error:', error);
    return {
      hasError: true,
      error,
      errorTime: new Date().toISOString()
    };
  }

  componentDidCatch(error, info) {
    // In real app, send to logging service
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
    this.setState({ errorInfo: info });

    // Log additional navigation info that might help debug
    console.log('Current URL:', window.location.href);
    console.log('User Agent:', navigator.userAgent);
    console.log('IP Access:', this.isIPAccess());
  }

  isIPAccess() {
    const host = window.location.host;
    return /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(host);
  }

  handleReload = () => {
    console.log("Recharger l'application");
    try {
      // Si l'erreur survient sur une adresse IP et que nous ne sommes pas en hashrouter mode
      if (this.isIPAccess() && !window.location.href.includes('/#/')) {
        console.log('Redirection vers le mode hash pour accès IP');
        window.location.href = '/#/';
        return;
      }
      window.location.reload();
    } catch (e) {
      console.error('Erreur lors du rechargement', e);
      // Dernier recours
      document.location = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      const isIPMode = this.isIPAccess();

      return (
        <div className="p-6 m-6 border border-red-200 rounded bg-red-50 text-sm text-red-700">
          <h2 className="font-semibold mb-2">Une erreur est survenue.</h2>
          <p className="mb-4">{this.state.error?.message || "Erreur d'opération non sécurisée"}</p>
          <p className="mb-4">Détails techniques: {this.state.error?.toString?.()}</p>

          {isIPMode && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="font-medium">Accès détecté via adresse IP</p>
              <p>L'accès via IP utilise un mode de navigation différent qui pourrait causer cette erreur.</p>
            </div>
          )}

          {this.state.errorInfo && (
            <pre className="mb-4 overflow-auto p-2 bg-red-100 rounded text-xs">
              {this.state.errorInfo.componentStack}
            </pre>
          )}

          <div className="flex gap-3">
            <button
              className="px-3 py-2 rounded bg-slate-700 text-white"
              onClick={this.handleReload}
            >Recharger</button>

            {isIPMode && !window.location.href.includes('/#/') && (
              <button
                className="px-3 py-2 rounded bg-blue-600 text-white"
                onClick={() => { window.location.href = '/#/' }}
              >Utiliser mode HashRouter</button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

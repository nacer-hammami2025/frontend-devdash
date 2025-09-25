// Script de redirection pour l'accès via IP
(function () {
    function isIPAddress(host) {
        return /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(host);
    }

    const host = window.location.host;
    const isIP = isIPAddress(host);
    const redirectAttempted = sessionStorage.getItem('ipRedirectAttempted');

    console.log('IP Redirection Script:', {
        host,
        isIP,
        path: window.location.pathname,
        hash: window.location.hash,
        href: window.location.href,
        redirectAttempted
    });

    // Rediriger une seule fois, uniquement si nécessaire
    if (
        isIP &&
        window.location.pathname === '/' &&
        !window.location.hash &&
        redirectAttempted !== 'true' &&
        !window.location.search
    ) {
        console.log('Redirection IP détectée, redirection vers /#/');
        sessionStorage.setItem('ipRedirectAttempted', 'true');
        window.location.replace('/#/');
        return; // Stop script après redirection
    }

    // Réinitialiser le marqueur uniquement si on revient à la racine sans hash
    window.addEventListener('hashchange', function () {
        if (window.location.pathname === '/' && !window.location.hash) {
            console.log('Hash cleared, resetting redirect flag');
            sessionStorage.removeItem('ipRedirectAttempted');
        }
    });

    // Ajout d'une meta pour le débogage
    if (isIP) {
        document.addEventListener('DOMContentLoaded', function () {
            const meta = document.createElement('meta');
            meta.name = 'access-mode';
            meta.content = 'ip-hash-router';
            document.head.appendChild(meta);
        });
    }
})();
import { useCallback, useEffect, useRef, useState } from 'react';

// Hook to subscribe to backend SSE stream (/api/events) and emit structured events.
// Responsibilities:
//  - Maintain connection state
//  - Expose lastEvent and counters
//  - Provide optional integration helpers: onTaskEvent, onProjectEvent
//  - Perform lightweight local cache refresh triggers via provided callbacks
//
// Usage:
// const { connected, lastEvent, stats } = useSSERealtime({
//    onProjectChange: () => refreshProjectsDelta(),
//    onTaskChange: (evt) => maybeUpdateSingleTask(evt) || scheduleTasksDelta()
// });

// Détection si l'accès se fait via adresse IP directe pour choisir l'URL d'API appropriée
function isIPAddress(host) {
    // Regex simple pour détecter une adresse IP
    return /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(host);
}

// Détermine l'URL correcte pour les événements SSE
function getEventsUrl() {
    const host = window.location.host;
    const isIP = isIPAddress(host);
    if (isIP) {
        // Extraire le port du backend (4000) et utiliser la même adresse IP
        const ip = host.split(':')[0];
        return `http://${ip}:4000/api/events`; // Avec /api car les routes du backend commencent par /api
    }
    return '/api/events'; // Avec /api pour le proxy Vite
}

export default function useSSERealtime({
    onProjectChange,
    onTaskChange,
    autoReconnect = true,
    reconnectBaseDelay = 2000,
    maxDelay = 60000, // Augmenté à 60 secondes maximum
    maxReconnectAttempts = 15 // Limiter le nombre de tentatives
} = {}) {
    const [connected, setConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);
    const [error, setError] = useState(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const esRef = useRef(null);
    const reconnectTimer = useRef(null);
    const lastOpenTs = useRef(null);
    const eventsReceived = useRef(0); // Compteur d'événements reçus

    const eventsUrl = getEventsUrl();

    const openStream = useCallback(() => {
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
        }
        setError(null);
        try {
            console.log(`Connexion aux événements SSE via: ${eventsUrl}`);
            // Spécifier withCredentials: true pour envoyer les cookies lors des requêtes cross-origin
            const es = new EventSource(eventsUrl, { withCredentials: true });
            esRef.current = es;

            es.onopen = () => {
                lastOpenTs.current = Date.now();
                setConnected(true);
                setReconnectAttempts(0);
            };

            es.onerror = (e) => {
                setConnected(false);
                setError('SSE error');
                es.close();
                esRef.current = null;

                if (autoReconnect) {
                    const attempt = reconnectAttempts + 1;

                    // Arrêter les tentatives après un certain nombre d'échecs consécutifs
                    if (attempt > maxReconnectAttempts) {
                        console.log(`[SSE] Arrêt des tentatives après ${maxReconnectAttempts} échecs consécutifs`);
                        setError(`Connexion perdue après ${maxReconnectAttempts} tentatives. Rafraîchissez la page.`);
                        return;
                    }

                    setReconnectAttempts(attempt);

                    // Augmentation plus importante du délai pour réduire la fréquence des tentatives
                    // et un délai minimal de 5 secondes après plusieurs échecs
                    const baseDelay = attempt > 3 ? Math.max(5000, reconnectBaseDelay) : reconnectBaseDelay;
                    const delay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt - 1));

                    console.log(`[SSE] Tentative de reconnexion #${attempt} dans ${Math.round(delay / 1000)}s`);

                    reconnectTimer.current = setTimeout(() => {
                        openStream();
                    }, delay + Math.round(Math.random() * 500));
                }
            };

            es.onmessage = (msg) => {
                if (!msg.data) return;
                try {
                    const evt = JSON.parse(msg.data);
                    setLastEvent(evt);
                    eventsReceived.current++; // Incrémenter le compteur

                    // Réinitialiser les tentatives quand on reçoit un événement qui n'est pas un ping
                    if (evt.type !== 'ping' && reconnectAttempts > 0) {
                        setReconnectAttempts(0);
                    }

                    if (evt.type?.startsWith('project.') && onProjectChange) {
                        onProjectChange(evt);
                    } else if (evt.type?.startsWith('task.') && onTaskChange) {
                        onTaskChange(evt);
                    }
                } catch (e) {
                    console.error("[SSE] Erreur parsing message:", e);
                }
            };
        } catch (e) {
            setError(e.message || 'Failed to init SSE');
        }
    }, [autoReconnect, reconnectAttempts, reconnectBaseDelay, maxDelay, onProjectChange, onTaskChange]);

    useEffect(() => {
        openStream();
        return () => {
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (esRef.current) esRef.current.close();
        };
    }, [openStream]);

    return {
        connected,
        lastEvent,
        error,
        reconnectAttempts,
        lastConnectedAt: lastOpenTs.current,
        eventsCount: eventsReceived.current,
        resetConnection: openStream // Exposer cette fonction pour permettre une réinitialisation manuelle
    };
}

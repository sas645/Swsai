import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function useSocket(handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    const wrap = (event) => (payload) => {
      handlersRef.current?.[event]?.(payload);
    };

    socket.on('documents:sync', wrap('onSync'));
    socket.on('document:created', wrap('onCreated'));
    socket.on('document:updated', wrap('onUpdated'));
    socket.on('document:ready', wrap('onReady'));
    socket.on('document:deleted', wrap('onDeleted'));

    return () => socket.disconnect();
  }, []);
}

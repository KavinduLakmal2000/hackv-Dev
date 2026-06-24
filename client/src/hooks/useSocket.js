import { useEffect, useRef } from 'react';
import useAuthStore from '../store/authStore.js';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  configureSocketAuth,
} from '../socket/socketClient.js';

// ─────────────────────────────────────────────────────────────────────────────
// useSocket — connects the socket when the user is authenticated,
// disconnects on logout. Mount this once near the app root (in AppShell)
// so every authenticated page shares the same live connection.
// ─────────────────────────────────────────────────────────────────────────────

let _authWired = false;

const useSocket = () => {
  const user = useAuthStore((s) => s.user);
  const hasConnectedRef = useRef(false);

  // Wire the token getter once — socketClient reads it fresh on every
  // (re)connection attempt, so a refreshed token is always picked up.
  if (!_authWired) {
    configureSocketAuth(() => useAuthStore.getState()._getToken());
    _authWired = true;
  }

  useEffect(() => {
    if (user && !hasConnectedRef.current) {
      connectSocket();
      hasConnectedRef.current = true;
    }
    if (!user && hasConnectedRef.current) {
      disconnectSocket();
      hasConnectedRef.current = false;
    }
  }, [user]);

  return getSocket();
};

export default useSocket;

import api from './axiosInstance.js';

export const gameApi = {
  initGame: (lobbyCode) =>
    api.post(`/game/init/${lobbyCode}`).then((r) => r.data),

  getState: (sessionId) =>
    api.get(`/game/${sessionId}`).then((r) => r.data),

  startRound: (sessionId) =>
    api.post(`/game/${sessionId}/round/start`).then((r) => r.data),

  deployDefense: (sessionId, toolId) =>
    api.post(`/game/${sessionId}/defend`, { toolId }).then((r) => r.data),

  setSecretWord: (sessionId, word, hint) =>
    api.post(`/game/${sessionId}/secret-word`, { word, hint }).then((r) => r.data),

  launchAttack: (sessionId, toolId) =>
    api.post(`/game/${sessionId}/attack`, { toolId }).then((r) => r.data),

  submitGuess: (sessionId, guess) =>
    api.post(`/game/${sessionId}/guess`, { guess }).then((r) => r.data),
};

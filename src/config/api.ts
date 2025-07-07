// API Configuration
// Set this to 'local' to use local development server, 'deployed' to use the live API
const API_MODE = 'deployed' as const;

const API_CONFIG = {
  local: {
    baseUrl: 'http://localhost:8787',
    chatEndpoint: '/api/chat',
    teamsEndpoint: '/api/teams',
    healthEndpoint: '/api/health'
  },
  deployed: {
    baseUrl: 'https://blawby-ai-chatbot.paulchrisluke.workers.dev',
    chatEndpoint: '/api/chat',
    teamsEndpoint: '/api/teams',
    healthEndpoint: '/api/health'
  }
};

export const getApiConfig = () => {
  return API_CONFIG[API_MODE];
};

export const getChatEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.chatEndpoint}`;
};

export const getTeamsEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.teamsEndpoint}`;
};

export const getHealthEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.healthEndpoint}`;
}; 
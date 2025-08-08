// API Configuration
// Automatically detect environment - use local for development, deployed for production
const API_MODE = (import.meta.env.DEV ? 'local' : 'deployed') as const;

const API_CONFIG = {
  local: {
    baseUrl: 'http://localhost:8787',
    agentStreamEndpoint: '/api/agent/stream',
    teamsEndpoint: '/api/teams',
    healthEndpoint: '/api/health'
  },
  deployed: {
    baseUrl: 'https://blawby-ai-chatbot.paulchrisluke.workers.dev',
    agentStreamEndpoint: '/api/agent/stream',
    teamsEndpoint: '/api/teams',
    healthEndpoint: '/api/health'
  }
};

export const getApiConfig = () => {
  return API_CONFIG[API_MODE];
};

export const getAgentStreamEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.agentStreamEndpoint}`;
};

export const getFormsEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}/api/forms`;
};

export const getTeamsEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.teamsEndpoint}`;
};

export const getHealthEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.healthEndpoint}`;
}; 
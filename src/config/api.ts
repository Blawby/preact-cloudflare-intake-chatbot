// API Configuration
// Automatically detect environment - use local for development, deployed for production
const API_MODE = (import.meta.env.DEV ? 'local' : 'deployed') as const;

const API_CONFIG = {
  local: {
    baseUrl: 'http://localhost:8787',
    agentEndpoint: '/api/agent',
    teamsEndpoint: '/api/teams',
    healthEndpoint: '/api/health'
  },
  deployed: {
    baseUrl: 'https://blawby-ai-chatbot.paulchrisluke.workers.dev',
    agentEndpoint: '/api/agent',
    teamsEndpoint: '/api/teams',
    healthEndpoint: '/api/health'
  }
};

export const getApiConfig = () => {
  return API_CONFIG[API_MODE];
};

export const getAgentEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.agentEndpoint}`;
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
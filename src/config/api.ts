// API Configuration
// Automatically detect environment - use local for development, deployed for production
const API_MODE = (import.meta.env.DEV ? 'local' : 'deployed') as const;

const API_CONFIG = {
  local: {
    baseUrl: 'http://localhost:8787',
    chatEndpoint: '/api/chat',
    teamsEndpoint: '/api/teams',
    healthEndpoint: '/api/health',
    matterCreationEndpoint: '/api/matter-creation'
  },
  deployed: {
    baseUrl: 'https://blawby-ai-chatbot.paulchrisluke.workers.dev',
    chatEndpoint: '/api/chat',
    teamsEndpoint: '/api/teams',
    healthEndpoint: '/api/health',
    matterCreationEndpoint: '/api/matter-creation'
  }
};

export const getApiConfig = () => {
  return API_CONFIG[API_MODE];
};

export const getChatEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.chatEndpoint}`;
};

export const getFormsEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}/api/forms`;
};

export const getFeedbackEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}/api/feedback`;
};

export const getTeamsEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.teamsEndpoint}`;
};

export const getHealthEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.healthEndpoint}`;
};

export const getMatterCreationEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.matterCreationEndpoint}`;
}; 
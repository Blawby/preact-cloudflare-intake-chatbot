import fetch from 'node-fetch';

const WORKER_URL = 'http://localhost:8787';
const DEFAULT_TEAM_ID = 'blawby-ai';

export async function createSession(sessionId?: string): Promise<{ sessionId: string; teamId: string }> {
  const body = sessionId ? { sessionId, teamId: DEFAULT_TEAM_ID } : { teamId: DEFAULT_TEAM_ID };

  const response = await fetch(`${WORKER_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success || !result.data?.sessionId) {
    throw new Error(`Invalid session response: ${JSON.stringify(result)}`);
  }

  return {
    sessionId: result.data.sessionId,
    teamId: result.data.teamId || DEFAULT_TEAM_ID
  };
}

export async function uploadFile({
  teamId,
  sessionId,
  fileName,
  mimeType,
  contents
}: {
  teamId: string;
  sessionId: string;
  fileName: string;
  mimeType: string;
  contents: string | Buffer;
}) {
  // Dynamically import FormData and File since they're not available in Node.js by default
  const { FormData, File } = await import('formdata-node');
  const form = new FormData();

  // Handle both string and Buffer content
  const buffer = typeof contents === 'string' ? Buffer.from(contents) : contents;
  const file = new File([buffer], fileName, { type: mimeType });
  
  form.append('file', file);
  form.append('teamId', teamId);
  form.append('sessionId', sessionId);

  const response = await fetch(`${WORKER_URL}/api/files/upload`, {
    method: 'POST',
    body: form as any
  });

  const text = await response.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { success: false, error: text };
  }

  return { status: response.status, success: json.success, data: json.data, error: json.error };
}

export async function downloadFile(fileId: string): Promise<{ status: number; text: string; headers: Record<string, string> }> {
  const response = await fetch(`${WORKER_URL}/api/files/${fileId}`);
  const text = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => headers[key] = value);

  return { status: response.status, text, headers };
}

export async function getSessionMessages(sessionId: string, teamId: string): Promise<any[]> {
  const response = await fetch(`${WORKER_URL}/api/sessions/${sessionId}/messages?teamId=${encodeURIComponent(teamId)}`);
  if (!response.ok) {
    throw new Error(`Failed to get messages: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.success ? result.data : [];
}

export async function createMessageWithFile({
  sessionId,
  teamId,
  message,
  fileName,
  mimeType,
  contents
}: {
  sessionId: string;
  teamId: string;
  message: string;
  fileName: string;
  mimeType: string;
  contents: string | Buffer;
}) {
  const upload = await uploadFile({ teamId, sessionId, fileName, mimeType, contents });
  if (!upload.success) {
    throw new Error(`File upload failed: ${upload.error}`);
  }

  const download = await downloadFile(upload.data!.fileId);
  if (download.status !== 200) {
    throw new Error(`File download failed: ${download.status}`);
  }

  return { upload, download };
}

// Health check for the worker
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${WORKER_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

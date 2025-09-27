import { describe, it, expect } from 'vitest';
import { createSession, uploadFile, downloadFile } from '../helpers/apiClient';

describe('file upload and download flow', () => {
  it('stores metadata and retrieves via download endpoint', async () => {
    const { sessionId, teamId } = await createSession();

    const upload = await uploadFile({
      teamId,
      sessionId,
      fileName: 'hello.txt',
      mimeType: 'text/plain',
      contents: 'hello world'
    });

    expect(upload.success).toBe(true);
    const fileId = upload.data?.fileId;
    expect(fileId).toBeTruthy();

    const download = await downloadFile(fileId!);
    expect(download.status).toBe(200);
    expect(download.text).toBe('hello world');
  });
});


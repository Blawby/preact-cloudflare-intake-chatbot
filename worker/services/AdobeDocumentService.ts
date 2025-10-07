import type { Env } from '../types.js';
import { Logger } from '../utils/logger.js';
import { unzipSync, strFromU8 } from 'fflate';

type AdobeEnv = Pick<
  Env,
  'ADOBE_CLIENT_ID' |
  'ADOBE_CLIENT_SECRET' |
  'ADOBE_IMS_BASE_URL' |
  'ADOBE_PDF_SERVICES_BASE_URL' |
  'ADOBE_SCOPE' |
  'ENABLE_ADOBE_EXTRACT'
>;

interface AdobeToken {
  accessToken: string;
  expiresAt: number;
}

interface AdobeConfig {
  clientId: string;
  clientSecret: string;
  imsBase: string;
  pdfBase: string;
  scope: string;
}

export interface AdobeExtractSuccess {
  text?: string;
  elements?: unknown[];
  tables?: unknown[];
  rawResponse?: unknown;
}

export interface AdobeExtractResult {
  success: boolean;
  details?: AdobeExtractSuccess;
  warnings?: string[];
  error?: string;
  status?: number;
}

interface AdobeAssetResponse {
  assetID: string;
  uploadUri: string;
}

interface AdobeJobStatus {
  status?: string;
  downloadUri?: string;
  download_url?: string;
  downloadURL?: string;
  download_uri?: string;
  resource?: {
    downloadUri?: string;
  };
  content?: {
    downloadUri?: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
}

type JobResolution =
  | { type: 'buffer'; buffer: ArrayBuffer }
  | { type: 'uri'; downloadUri: string };

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const DEFAULT_IMS_BASE = 'https://ims-na1.adobelogin.com';
const DEFAULT_PDF_BASE = 'https://pdf-services.adobe.io';
const DEFAULT_SCOPE = 'openid,AdobeID,DCAPI';
const MAX_POLL_ATTEMPTS = 60; // Increased from 20 to 60 (about 2-3 minutes)
const POLL_BASE_DELAY_MS = 2000; // Increased from 1000 to 2000ms

const DEFAULT_EXTRACT_PARAMS = {
  elementsToExtract: ['text', 'tables'],
  renditionsToGenerate: []
} as const;

/**
 * Adobe PDF Services client that implements the REST workflow:
 * 1. Obtain IMS access token
 * 2. Create an asset
 * 3. Upload file bytes to the signed S3 URL
 * 4. Start an extract job referencing the asset
 * 5. Poll for completion and download the structured results ZIP
 */
export class AdobeDocumentService {
  private static tokenCache: AdobeToken | null = null;
  private static inFlightToken: Promise<AdobeToken> | null = null;

  constructor(
    private readonly env: AdobeEnv
  ) {}

  isEnabled(): boolean {
    const flag = this.env.ENABLE_ADOBE_EXTRACT;
    if (typeof flag === 'boolean') return flag;
    if (typeof flag === 'string') {
      return ['1', 'true', 'yes', 'on'].includes(flag.trim().toLowerCase());
    }
    return false;
  }

  async extractFromBuffer(
    fileName: string,
    mimeType: string,
    buffer: ArrayBuffer
  ): Promise<AdobeExtractResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'Adobe extract disabled',
        warnings: ['ENABLE_ADOBE_EXTRACT is not enabled']
      };
    }

    try {
      console.log('🧩 Adobe Step 1: Getting config and access token');
      const config = this.getConfig();
      console.log('🧩 Adobe Step 1a: Config obtained');
      const accessToken = await this.getAccessToken(config);
      console.log('🧩 Adobe Step 1: Access token obtained');

      console.log('🧩 Adobe Step 2: Creating asset');
      const { assetID, uploadUri } = await this.createAsset(fileName, mimeType, config, accessToken);
      console.log('🧩 Adobe Step 2: Asset created with ID:', assetID);

      console.log('🧩 Adobe Step 3: Uploading asset');
      await this.uploadAsset(uploadUri, buffer, mimeType);
      console.log('🧩 Adobe Step 3: Asset uploaded');

      console.log('🧩 Adobe Step 4: Starting extract job');
      const jobLocation = await this.startExtractJob(assetID, config, accessToken);
      console.log('🧩 Adobe Step 4: Extract job started at:', jobLocation);

      console.log('🧩 Adobe Step 5: Polling job status');
      const resolution = await this.pollJob(jobLocation, config, accessToken);
      console.log('🧩 Adobe Step 5: Job completed, resolution type:', resolution.type);

      console.log('🧩 Adobe Step 6: Processing results');
      let zipBuffer: ArrayBuffer;
      if (resolution.type === 'buffer') {
        zipBuffer = resolution.buffer;
      } else {
        zipBuffer = await this.downloadResult(resolution.downloadUri, config, accessToken);
      }

      console.log('🧩 Adobe Step 7: Processing ZIP payload');
      return this.processZipPayload(new Uint8Array(zipBuffer));
    } catch (error) {
      console.log('🧩 Adobe Error:', error instanceof Error ? error.message : String(error));
      Logger.error('Adobe extract failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected Adobe extract error'
      };
    }
  }

  private getConfig(): AdobeConfig {
    const clientId = this.env.ADOBE_CLIENT_ID?.trim();
    const clientSecret = this.env.ADOBE_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
      throw new Error('Adobe credentials are not configured');
    }

    const imsBase = (this.env.ADOBE_IMS_BASE_URL || DEFAULT_IMS_BASE).replace(/\/+$/, '');
    const pdfBase = (this.env.ADOBE_PDF_SERVICES_BASE_URL || DEFAULT_PDF_BASE).replace(/\/+$/, '');
    const scope = this.env.ADOBE_SCOPE?.trim() || DEFAULT_SCOPE;

    return {
      clientId,
      clientSecret,
      imsBase,
      pdfBase,
      scope
    };
  }

  private async fetchAccessToken(config: AdobeConfig): Promise<AdobeToken> {
    const url = `${config.imsBase}/ims/token/v3`;
    const body = `client_id=${encodeURIComponent(config.clientId)}&client_secret=${encodeURIComponent(config.clientSecret)}&grant_type=client_credentials&scope=${encodeURIComponent(config.scope)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`Failed to obtain Adobe token (${response.status}): ${payload}`);
    }

    const data = await response.json() as { access_token: string; expires_in?: number };
    if (!data.access_token) {
      throw new Error('Adobe token response missing access_token');
    }

    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in * 1000 : 3600 * 1000;
    return {
      accessToken: data.access_token,
      expiresAt: Date.now() + Math.max(expiresIn - FIVE_MINUTES_MS, 0)
    };
  }

  private async getAccessToken(config: AdobeConfig): Promise<string> {
    if (AdobeDocumentService.tokenCache && Date.now() < AdobeDocumentService.tokenCache.expiresAt) {
      return AdobeDocumentService.tokenCache.accessToken;
    }

    if (!AdobeDocumentService.inFlightToken) {
      AdobeDocumentService.inFlightToken = this.fetchAccessToken(config)
        .finally(() => { AdobeDocumentService.inFlightToken = null; });
    }

    AdobeDocumentService.tokenCache = await AdobeDocumentService.inFlightToken;
    return AdobeDocumentService.tokenCache.accessToken;
  }

  private async createAsset(
    fileName: string,
    mimeType: string,
    config: AdobeConfig,
    accessToken: string
  ): Promise<AdobeAssetResponse> {
    const response = await fetch(`${config.pdfBase}/assets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': config.clientId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mediaType: mimeType,
        name: fileName
      })
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`Failed to create Adobe asset (${response.status}): ${payload}`);
    }

    const data = await response.json() as { id?: string; assetID?: string; uploadUri?: string };
    const assetID = data.assetID ?? data.id;
    if (!assetID || !data.uploadUri) {
      throw new Error('Adobe asset response missing required fields');
    }

    return { assetID, uploadUri: data.uploadUri };
  }

  private async uploadAsset(uploadUri: string, buffer: ArrayBuffer, mimeType: string): Promise<void> {
    const response = await fetch(uploadUri, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: buffer
    });

    if (!response.ok) {
      throw new Error(`Failed to upload asset bytes (${response.status}): ${response.statusText}`);
    }
  }

  private async startExtractJob(
    assetId: string,
    config: AdobeConfig,
    accessToken: string
  ): Promise<string> {
    const payload = {
      assetID: assetId,
      ...DEFAULT_EXTRACT_PARAMS
    };

    Logger.debug('Adobe Step 4: Starting extract job', { payload });

    const response = await fetch(`${config.pdfBase}/operation/extractpdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': config.clientId,
        'x-request-id': `extract-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.status !== 201 && response.status !== 202) {
      const payload = await response.text();
      throw new Error(`Failed to start Adobe extract job (${response.status}): ${payload}`);
    }

    const location = response.headers.get('location');
    if (!location) {
      throw new Error('Adobe extract job did not return a location header');
    }

    return location;
  }

  private async pollJob(
    location: string,
    config: AdobeConfig,
    accessToken: string
  ): Promise<JobResolution> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      console.log(`🧩 Adobe Step 5: Polling attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS}`);
      
      const response = await fetch(location, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': config.clientId
        }
      });

      if (response.status === 202) {
        const delay = Math.min(POLL_BASE_DELAY_MS * (attempt + 1), 5000);
        console.log(`🧩 Adobe Step 5: Job still processing, waiting ${delay}ms...`);
        await this.wait(delay);
        continue;
      }

      if (!response.ok) {
        const payload = await response.text();
        throw new Error(`Adobe extract job failed (${response.status}): ${payload}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.toLowerCase().includes('application/zip')) {
        const buffer = await response.arrayBuffer();
        return { type: 'buffer', buffer };
      }

      const jobStatus = await response.json() as AdobeJobStatus;
      if (jobStatus.status === 'done') {
        console.log('Job completed, looking for download URI in:', JSON.stringify(jobStatus, null, 2));
        
        const downloadUri =
          jobStatus.downloadUri ||
          jobStatus.download_uri ||
          jobStatus.downloadURL ||
          jobStatus.download_url ||
          jobStatus.resource?.downloadUri ||
          jobStatus.content?.downloadUri;

        console.log('Found download URI:', downloadUri);

        if (downloadUri) {
          return { type: 'uri', downloadUri };
        }

        throw new Error('Adobe extract job completed without a download URI');
      }

      if (jobStatus.status === 'failed') {
        const message = jobStatus.error?.message ?? 'Adobe extract job failed';
        throw new Error(message);
      }

      await this.wait(Math.min(POLL_BASE_DELAY_MS * (attempt + 1), 5000));
    }

    throw new Error('Timed out waiting for Adobe extract job to complete');
  }

  private async downloadResult(
    downloadUri: string,
    config: AdobeConfig,
    accessToken: string
  ): Promise<ArrayBuffer> {
    const response = await fetch(downloadUri, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`Failed to download Adobe extract results (${response.status}): ${response.statusText}`);
    }

    return response.arrayBuffer();
  }

  private processZipPayload(zipBuffer: Uint8Array): AdobeExtractResult {
    const files = unzipSync(zipBuffer);
    const structuredEntry =
      files['structuredData.json'] ??
      Object.entries(files).find(([name]) => name.endsWith('structuredData.json'))?.[1];

    if (!structuredEntry) {
      return {
        success: true,
        details: {
          text: '',
          elements: [],
          tables: [],
          rawResponse: zipBuffer
        },
        warnings: ['Adobe extract ZIP did not contain structuredData.json']
      };
    }

    const structured = JSON.parse(strFromU8(structuredEntry)) as {
      elements?: unknown[];
      tables?: unknown[];
    };

    const elements = Array.isArray(structured.elements) ? structured.elements : [];
    const tables = Array.isArray(structured.tables) ? structured.tables : [];

    const textParts: string[] = [];
    for (const element of elements as Array<Record<string, unknown>>) {
      const value = element?.Text ?? element?.text;

      if (typeof value === 'string' && value.trim().length > 0) {
        textParts.push(value.trim());
      } else if (Array.isArray(value)) {
        const joined = value
          .filter((item): item is string => typeof item === 'string')
          .join(' ')
          .trim();
        if (joined.length > 0) {
          textParts.push(joined);
        }
      }
    }

    return {
      success: true,
      details: {
        text: textParts.join('\n').trim(),
        tables,
        elements,
        rawResponse: zipBuffer
      }
    };
  }

  private async wait(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}

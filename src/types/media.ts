export interface FileAttachment {
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface MediaFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
  messageId?: string;
} 
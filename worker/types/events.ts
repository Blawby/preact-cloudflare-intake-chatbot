// Shared event type definitions

export interface DocumentEvent {
  key: string;
  organizationId: string;
  sessionId: string;
  mime: string;
  size: number;
}

export interface AutoAnalysisEvent {
  type: "analyze_uploaded_document";
  sessionId: string;
  organizationId: string;
  statusId?: string;
  file: {
    key: string;
    name: string;
    mime: string;
    size: number;
  };
}

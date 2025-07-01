import { CustomProperty } from "../services/custom-properties.service";

export interface DiagramFile {
  id?: number;
  fileName: string;
  content: string; // BPMN XML
  metadata: DiagramMetadata;
  description?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface DiagramMetadata {
  elementColors: { [elementId: string]: { fill?: string; stroke?: string } };
  customProperties: { [elementId: string]: CustomProperty[] };
  diagramSettings: {
    zoom?: number;
    viewBox?: string;
    lastModified: string;
    version: string;
  };
}
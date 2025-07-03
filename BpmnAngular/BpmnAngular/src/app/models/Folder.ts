
export interface Folder {
  id: number;
  folderName: string;
  description?: string;
  createdTime: string;
  updatedTime?: string;
  createdBy?: string;
  folderPath?: string;
  isRoot?: boolean;
  parentFolder?: {
    id: number;
    folderName: string;
  };
  fileCount?: number;
  subFolderCount?: number;
  totalSize?: number;
}


export interface FolderTreeNode {
  id: number;
  name: string;
  path: string;
  fileCount: number;
  subFolderCount: number;
  children: FolderTreeNode[];
  expanded?: boolean;
  selected?: boolean;
}


export interface FolderBreadcrumb {
  id: number;
  name: string;
  path: string;
}


export interface FolderStatistics {
  fileCount: number;
  subFolderCount: number;
  totalSize: number;
  lastModified?: string;
}
export interface Folder {
  id: number;
  folderName: string;
  description?: string;
  createdTime: string;
  updatedTime?: string;
  createdBy: string;
  folderPath: string;
  isRoot: boolean;
  fileCount?: number;
  subFolderCount?: number;
  totalSize?: number;
  parentFolder?: Folder | null;
  createdAt?: Date | string;
}

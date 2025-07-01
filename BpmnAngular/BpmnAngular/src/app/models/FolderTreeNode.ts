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
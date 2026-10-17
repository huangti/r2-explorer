export interface ExplorerItem {
  type: 'file' | 'folder';
  name: string;
  key?: string; // For files: full key like 'photos/cat.png'
  prefix?: string; // For folders: 'photos/'
  size?: number;
  lastModified?: string;
  etag?: string | null;
  mimeType?: string;
  publicUrl?: string | null;
}

export interface ListResponse {
  bucket: string;
  currentPrefix: string;
  folders: Array<{
    type: 'folder';
    name: string;
    prefix: string;
    parentPrefix: string;
  }>;
  files: Array<{
    type: 'file';
    key: string;
    name: string;
    size: number;
    lastModified: string;
    etag: string | null;
    mimeType: string;
    publicUrl: string | null;
  }>;
  isTruncated: boolean;
  fromCache?: boolean;
}

export interface ClipboardItem {
  item: ExplorerItem;
  mode: 'copy' | 'cut';
}

export interface StatsResponse {
  stats: {
    classA: number;
    classB: number;
    history: Array<{
      type: 'A' | 'B';
      time: string;
      details: string;
    }>;
  };
  limits: {
    freeClassA: number;
    freeClassB: number;
    freeStorageGB: number;
  };
}

export type ViewMode = 'grid' | 'list';
export type SortField = 'name' | 'size' | 'lastModified' | 'type';
export type SortOrder = 'asc' | 'desc';

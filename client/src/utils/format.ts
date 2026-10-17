export function formatBytes(bytes?: number, decimals = 2): string {
  if (bytes === undefined || bytes === null || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export type FileCategory = 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'code' | 'text' | 'archive' | 'other';

export function getFileCategory(name: string, mimeType?: string): FileCategory {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const mime = mimeType?.toLowerCase() || '';

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext)) {
    return 'image';
  }
  if (mime.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'].includes(ext)) {
    return 'video';
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext)) {
    return 'audio';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'epub', 'mobi', 'wps'].includes(ext)) {
    return 'doc';
  }
  if (['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'sh', 'yaml', 'yml', 'toml', 'sql'].includes(ext)) {
    return 'code';
  }
  if (mime.startsWith('text/') || ['txt', 'md', 'csv', 'log', 'ini', 'conf'].includes(ext)) {
    return 'text';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return 'archive';
  }
  return 'other';
}

export function matchesCategoryFilter(category: FileCategory, filterId: string | null): boolean {
  if (!filterId) return true;
  if (filterId === 'image') return category === 'image';
  if (filterId === 'media') return category === 'video' || category === 'audio';
  if (filterId === 'doc') return category === 'pdf' || category === 'doc' || category === 'text';
  if (filterId === 'code') return category === 'code';
  if (filterId === 'archive') return category === 'archive';
  return category === filterId;
}

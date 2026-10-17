import React from 'react';
import {
  Folder,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileArchive,
  File,
} from 'lucide-react';
import { getFileCategory } from '../utils/format';

interface FileIconProps {
  type: 'file' | 'folder';
  name: string;
  mimeType?: string;
  publicUrl?: string | null;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({
  type,
  name,
  mimeType,
  className = 'w-6 h-6',
}) => {
  if (type === 'folder') {
    return <Folder className={`${className} text-amber-500 fill-amber-400`} />;
  }

  const category = getFileCategory(name, mimeType);

  switch (category) {
    case 'image':
      return <FileImage className={`${className} text-emerald-500`} />;
    case 'video':
      return <FileVideo className={`${className} text-purple-500`} />;
    case 'audio':
      return <FileAudio className={`${className} text-pink-500`} />;
    case 'code':
      return <FileCode className={`${className} text-blue-500`} />;
    case 'text':
      return <FileText className={`${className} text-cyan-600`} />;
    case 'pdf':
      return <FileText className={`${className} text-rose-500`} />;
    case 'doc':
      return <FileText className={`${className} text-blue-600`} />;
    case 'archive':
      return <FileArchive className={`${className} text-amber-600`} />;
    default:
      return <File className={`${className} text-slate-400`} />;
  }
};

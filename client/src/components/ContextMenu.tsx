import React, { useEffect, useRef } from 'react';
import {
  Eye,
  Download,
  Copy,
  Scissors,
  Edit2,
  Trash2,
  Info,
  FolderPlus,
  Upload,
  ClipboardPaste,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { ExplorerItem } from '../types';

export interface ContextMenuProps {
  x: number;
  y: number;
  targetItem: ExplorerItem | null;
  selectedCount: number;
  hasClipboard: boolean;
  onClose: () => void;
  onOpen?: () => void;
  onCopyPublicUrl?: () => void;
  onDownload?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onProperties?: () => void;
  onNewFolder?: () => void;
  onUpload?: () => void;
  onRefresh?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  targetItem,
  selectedCount,
  hasClipboard,
  onClose,
  onOpen,
  onCopyPublicUrl,
  onDownload,
  onCut,
  onCopy,
  onPaste,
  onRename,
  onDelete,
  onProperties,
  onNewFolder,
  onUpload,
  onRefresh,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to avoid screen overflowing
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const menuW = 200;
  const menuH = 260;
  const posX = x + menuW > screenW ? Math.max(10, screenW - menuW - 10) : x;
  const posY = y + menuH > screenH ? Math.max(10, screenH - menuH - 10) : y;

  return (
    <div
      ref={menuRef}
      style={{ left: `${posX}px`, top: `${posY}px` }}
      className="fixed z-50 w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1.5 text-xs text-slate-700 dark:text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {targetItem ? (
        // Item context menu
        <>
          {targetItem.type === 'file' && (
            <button
              onClick={() => { onOpen?.(); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>打开 / 预览</span>
            </button>
          )}

          {targetItem.type === 'file' && targetItem.publicUrl && (
            <button
              onClick={() => { onCopyPublicUrl?.(); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-medium text-emerald-600">复制公开链接 (自定义域)</span>
            </button>
          )}

          {targetItem.type === 'file' && (
            <button
              onClick={() => { onDownload?.(); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>下载文件</span>
            </button>
          )}

          <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />

          <button
            onClick={() => { onCut?.(); onClose(); }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Scissors className="w-3.5 h-3.5 text-slate-400" />
              <span>剪切</span>
            </div>
            <span className="text-[10px] text-slate-400">Ctrl+X</span>
          </button>

          <button
            onClick={() => { onCopy?.(); onClose(); }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>复制</span>
            </div>
            <span className="text-[10px] text-slate-400">Ctrl+C</span>
          </button>

          {selectedCount === 1 && (
            <button
              onClick={() => { onRename?.(); onClose(); }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>重命名</span>
              </div>
              <span className="text-[10px] text-slate-400">F2</span>
            </button>
          )}

          <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />

          <button
            onClick={() => { onDelete?.(); onClose(); }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-50 text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>删除{selectedCount > 1 ? ` (${selectedCount} 项)` : ''}</span>
            </div>
            <span className="text-[10px] text-rose-400">Delete</span>
          </button>

          <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />

          <button
            onClick={() => { onProperties?.(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 transition-colors"
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>属性详情</span>
          </button>
        </>
      ) : (
        // Background context menu
        <>
          <button
            onClick={() => { onNewFolder?.(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5 text-orange-500" />
            <span>新建文件夹</span>
          </button>

          <button
            onClick={() => { onUpload?.(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-blue-500" />
            <span>上传文件到此目录</span>
          </button>

          <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />

          <button
            disabled={!hasClipboard}
            onClick={() => { onPaste?.(); onClose(); }}
            className={`w-full flex items-center justify-between px-3 py-1.5 transition-colors ${
              hasClipboard
                ? 'hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ClipboardPaste className="w-3.5 h-3.5 text-slate-400" />
              <span>粘贴到此处</span>
            </div>
            <span className="text-[10px] text-slate-400">Ctrl+V</span>
          </button>

          <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />

          <button
            onClick={() => { onRefresh?.(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>刷新目录</span>
          </button>
        </>
      )}
    </div>
  );
};

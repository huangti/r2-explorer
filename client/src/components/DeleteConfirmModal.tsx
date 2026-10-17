import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { ExplorerItem } from '../types';

interface DeleteConfirmModalProps {
  items: ExplorerItem[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  items,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || items.length === 0) return null;

  const hasFolder = items.some((i) => i.type === 'folder');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <span>确认永久删除</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <p>
            您确定要永久删除以下 <strong className="text-slate-900 dark:text-white font-bold">{items.length}</strong> 个项目吗？该操作无法撤销。
          </p>

          {hasFolder && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 rounded-lg text-rose-700 dark:text-rose-300 text-[11px] leading-relaxed">
              ⚠️ 警告：所选项目中包含文件夹，删除文件夹将连同其内部的所有子文件一并永久清空！
            </div>
          )}

          <div className="max-h-32 overflow-y-auto bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60 divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item, idx) => (
              <div key={idx} className="py-1 text-[11px] truncate flex items-center gap-1.5">
                <span className="text-slate-400">•</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {item.name}
                </span>
                <span className="text-slate-400">
                  {item.type === 'folder' ? '(文件夹)' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>确认删除</span>
          </button>
        </div>
      </div>
    </div>
  );
};

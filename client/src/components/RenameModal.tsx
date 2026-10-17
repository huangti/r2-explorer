import React, { useState, useEffect, useRef } from 'react';
import { Edit2, X } from 'lucide-react';
import type { ExplorerItem } from '../types';

interface RenameModalProps {
  item: ExplorerItem | null;
  onClose: () => void;
  onRename: (newName: string) => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  item,
  onClose,
  onRename,
}) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Select file name without extension if file
          const dotIdx = item.name.lastIndexOf('.');
          if (item.type === 'file' && dotIdx > 0) {
            inputRef.current.setSelectionRange(0, dotIdx);
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === item.name) return;
    onRename(name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold text-sm">
            <Edit2 className="w-4 h-4 text-orange-500" />
            <span>重命名{item.type === 'folder' ? '文件夹' : '文件'}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              新名称
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
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
              type="submit"
              disabled={!name.trim() || name.trim() === item.name}
              className="px-4 py-1.5 text-xs font-medium bg-orange-600 hover:bg-orange-500 text-white rounded-lg disabled:opacity-40 transition-colors shadow-sm"
            >
              保存修改
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

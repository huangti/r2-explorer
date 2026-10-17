import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { formatBytes } from '../utils/format';

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

interface UploadToastProps {
  uploads: UploadItem[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

export const UploadToast: React.FC<UploadToastProps> = ({
  uploads,
  onDismiss,
  onClearAll,
}) => {
  if (uploads.length === 0) return null;

  const uploadingCount = uploads.filter((u) => u.status === 'uploading').length;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-xs select-none animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center gap-2">
          {uploadingCount > 0 ? (
            <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          )}
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {uploadingCount > 0 ? `正在上传 ${uploadingCount} 个文件...` : '上传完成'}
          </span>
        </div>
        <button
          onClick={onClearAll}
          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          关闭
        </button>
      </div>

      <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1">
        {uploads.map((item) => (
          <div key={item.id} className="py-1.5 px-2 flex items-center justify-between gap-2">
            <div className="truncate flex-1">
              <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                {item.name}
              </p>
              <span className="text-[10px] text-slate-400 font-mono">
                {formatBytes(item.size)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {item.status === 'uploading' && (
                <span className="text-[10px] text-orange-600 font-medium">上传中...</span>
              )}
              {item.status === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              {item.status === 'error' && (
                <span title={item.errorMessage || '上传失败'}>
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                </span>
              )}
              <button
                onClick={() => onDismiss(item.id)}
                className="text-slate-300 hover:text-slate-500 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

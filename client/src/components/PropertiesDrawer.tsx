import React, { useState } from 'react';
import { X, Copy, Check, Shield } from 'lucide-react';
import type { ExplorerItem } from '../types';
import { formatBytes, formatDate } from '../utils/format';

interface PropertiesDrawerProps {
  item: ExplorerItem | null;
  onClose: () => void;
}

export const PropertiesDrawer: React.FC<PropertiesDrawerProps> = ({
  item,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!item) return null;

  const handleCopyKey = () => {
    const key = item.type === 'folder' ? item.prefix! : item.key!;
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyUrl = () => {
    if (item.publicUrl) {
      navigator.clipboard.writeText(item.publicUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-5 flex flex-col justify-between select-none animate-in slide-in-from-right duration-200 text-xs">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            属性详情
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Name and Type */}
        <div className="space-y-3">
          <div>
            <label className="text-slate-400 block text-[11px] mb-0.5">名称</label>
            <p className="font-medium text-slate-800 dark:text-slate-200 break-words select-text">
              {item.name}
            </p>
          </div>

          <div>
            <label className="text-slate-400 block text-[11px] mb-0.5">类型</label>
            <p className="text-slate-700 dark:text-slate-300">
              {item.type === 'folder' ? '文件夹' : item.mimeType || '未知'}
            </p>
          </div>

          {item.type === 'file' && (
            <div>
              <label className="text-slate-400 block text-[11px] mb-0.5">大小</label>
              <p className="font-mono text-slate-700 dark:text-slate-300">
                {formatBytes(item.size)} ({item.size?.toLocaleString()} bytes)
              </p>
            </div>
          )}

          <div>
            <label className="text-slate-400 block text-[11px] mb-0.5">最后修改时间</label>
            <p className="font-mono text-slate-700 dark:text-slate-300">
              {formatDate(item.lastModified)}
            </p>
          </div>

          {item.etag && (
            <div>
              <label className="text-slate-400 block text-[11px] mb-0.5">ETag</label>
              <p className="font-mono text-[11px] text-slate-500 break-all select-text">
                {item.etag}
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-slate-400 block text-[11px]">R2 对象路径 (Key)</label>
              <button
                onClick={handleCopyKey}
                className="text-[10px] text-orange-600 hover:underline flex items-center gap-1"
              >
                {copiedKey ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey ? '已复制' : '复制'}</span>
              </button>
            </div>
            <p className="p-2 bg-slate-50 dark:bg-slate-800 rounded font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all select-text border border-slate-200/60 dark:border-slate-700/60">
              {item.type === 'folder' ? item.prefix : item.key}
            </p>
          </div>

          {item.publicUrl && (
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-slate-400 block text-[11px]">公开访问 URL</label>
                <button
                  onClick={handleCopyUrl}
                  className="text-[10px] text-orange-600 hover:underline flex items-center gap-1"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUrl ? '已复制' : '复制'}</span>
                </button>
              </div>
              <p className="p-2 bg-slate-50 dark:bg-slate-800 rounded font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all select-text border border-slate-200/60 dark:border-slate-700/60">
                {item.publicUrl}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
        <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <span>R2 存储免出站流量费</span>
      </div>
    </div>
  );
};

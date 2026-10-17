import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { ExplorerItem } from '../types';
import { formatBytes, formatDate, getFileCategory } from '../utils/format';

interface PreviewModalProps {
  item: ExplorerItem | null;
  onClose: () => void;
  onDownload: (key: string) => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  item,
  onClose,
  onDownload,
}) => {
  const [copied, setCopied] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);

  useEffect(() => {
    if (!item || item.type !== 'file') return;

    const category = getFileCategory(item.name, item.mimeType);
    if (category === 'text' || category === 'code') {
      setIsLoadingText(true);
      fetch(`/api/download?key=${encodeURIComponent(item.key!)}`)
        .then((res) => {
          if (res.redirected) {
            return fetch(res.url).then((r) => r.text());
          }
          return res.json().then((data) => {
            if (data.url) {
              return fetch(data.url).then((r) => r.text());
            }
            throw new Error('No url');
          });
        })
        .then((text) => {
          setTextContent(text);
          setIsLoadingText(false);
        })
        .catch(() => {
          // Fallback direct download stream
          fetch(`/api/download?key=${encodeURIComponent(item.key!)}&download=0`)
            .then((r) => r.text())
            .then((t) => setTextContent(t))
            .catch(() => setTextContent('无法读取文本内容'))
            .finally(() => setIsLoadingText(false));
        });
    } else {
      setTextContent(null);
    }
  }, [item]);

  if (!item || item.type !== 'file') return null;

  const category = getFileCategory(item.name, item.mimeType);
  const fileUrl = item.publicUrl || `/api/download?key=${encodeURIComponent(item.key!)}`;

  const handleCopyPublicUrl = () => {
    if (item.publicUrl) {
      navigator.clipboard.writeText(item.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
              {item.name}
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {formatBytes(item.size)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {item.publicUrl && (
              <button
                onClick={handleCopyPublicUrl}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>已复制链接</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>复制公开链接</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => onDownload(item.key!)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/5 dark:bg-slate-950/40 min-h-[350px]">
          {category === 'image' && (
            <img
              src={fileUrl}
              alt={item.name}
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
            />
          )}

          {category === 'video' && (
            <video
              src={fileUrl}
              controls
              autoPlay
              className="max-h-[70vh] max-w-full rounded-lg shadow-sm"
            />
          )}

          {category === 'audio' && (
            <div className="p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-4">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {item.name}
              </span>
              <audio src={fileUrl} controls autoPlay className="w-72" />
            </div>
          )}

          {(category === 'text' || category === 'code') && (
            <div className="w-full h-full max-h-[70vh] overflow-auto bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs leading-relaxed border border-slate-800">
              {isLoadingText ? (
                <div className="flex items-center justify-center h-48 gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                  <span>正在读取文本...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap select-text">{textContent}</pre>
              )}
            </div>
          )}

          {category === 'pdf' && (
            <iframe
              src={fileUrl}
              title={item.name}
              className="w-full h-[70vh] rounded-xl border border-slate-200 dark:border-slate-700"
            />
          )}

          {['archive', 'other'].includes(category) && (
            <div className="text-center p-8 space-y-3">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                该文件格式不支持在线直接预览
              </p>
              <button
                onClick={() => onDownload(item.key!)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-500"
              >
                直接下载文件
              </button>
            </div>
          )}
        </div>

        {/* Footer with meta */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="font-mono truncate max-w-lg">R2 Key: {item.key}</span>
          <span>修改于: {formatDate(item.lastModified)}</span>
        </div>
      </div>
    </div>
  );
};

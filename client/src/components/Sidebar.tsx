import React, { useState } from 'react';
import {
  HardDrive,
  Folder,
  Image,
  FileText,
  Film,
  Archive,
  Code,
  ShieldCheck,
  ExternalLink,
  Globe,
  Check,
} from 'lucide-react';
import type { StatsResponse } from '../types';

interface SidebarProps {
  bucket: string;
  publicDomain: string;
  currentPrefix: string;
  stats: StatsResponse | null;
  onNavigate: (prefix: string) => void;
  onFilterCategory?: (cat: string | null) => void;
  activeFilter?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  bucket,
  publicDomain,
  currentPrefix,
  stats,
  onNavigate,
  onFilterCategory,
  activeFilter = null,
}) => {
  const [copiedDomain, setCopiedDomain] = useState(false);

  const handleCopyDomain = () => {
    if (publicDomain) {
      navigator.clipboard.writeText(publicDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const classA = stats?.stats.classA || 0;
  const classB = stats?.stats.classB || 0;
  const limitA = stats?.limits.freeClassA || 1000000;
  const limitB = stats?.limits.freeClassB || 10000000;

  const percentA = Math.min(100, Math.max(0.1, (classA / limitA) * 100));
  const percentB = Math.min(100, Math.max(0.1, (classB / limitB) * 100));

  return (
    <aside className="w-64 bg-slate-50/80 dark:bg-slate-900/80 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-3 select-none flex-shrink-0 text-xs">
      <div className="space-y-4">
        {/* Quick Access */}
        <div>
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            存储桶导航
          </div>
          <div className="mt-1 space-y-0.5">
            <button
              onClick={() => onNavigate('')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                currentPrefix === ''
                  ? 'bg-orange-100/70 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
              }`}
            >
              <HardDrive className="w-4 h-4 text-orange-500" />
              <span className="truncate">{bucket}</span>
            </button>
          </div>
        </div>

        {/* Categories / Quick Filters */}
        <div>
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            类型快速筛选
          </div>
          <div className="mt-1 space-y-0.5">
            {[
              { id: null, label: '全部文件', icon: Folder, color: 'text-slate-400' },
              { id: 'image', label: '图片 (Images)', icon: Image, color: 'text-emerald-500' },
              { id: 'doc', label: '文档与书籍 (PDF & Docs)', icon: FileText, color: 'text-rose-500' },
              { id: 'code', label: '代码与脚本 (Code)', icon: Code, color: 'text-blue-500' },
              { id: 'media', label: '视频与影音 (Media)', icon: Film, color: 'text-purple-500' },
              { id: 'archive', label: '压缩包 (Archives)', icon: Archive, color: 'text-amber-500' },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeFilter === item.id;
              return (
                <button
                  key={item.label}
                  onClick={() => onFilterCategory?.(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Public Custom Domain Pill */}
        {publicDomain && (
          <div className="p-2.5 bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="flex items-center gap-1.5 font-medium text-[11px]">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                自定义访问域
              </span>
              <button
                onClick={handleCopyDomain}
                className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                title="复制自定义域名"
              >
                {copiedDomain ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <ExternalLink className="w-3 h-3" />
                )}
              </button>
            </div>
            <p className="font-mono text-[11px] text-slate-700 dark:text-slate-200 truncate select-text">
              {publicDomain}
            </p>
          </div>
        )}
      </div>

      {/* Cloudflare Free Tier Safeguard Card */}
      <div className="p-3 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-slate-800/80 dark:to-orange-950/20 border border-orange-200/60 dark:border-orange-900/30 rounded-xl space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>免费额度守护</span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-1.5 py-0.2 rounded">
            Egress $0
          </span>
        </div>

        {/* Class A Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <span>Class A (写/列/改)</span>
            <span className="font-mono text-[10px]">
              {classA.toLocaleString()} / 1,000,000
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-orange-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${percentA}%` }}
            />
          </div>
        </div>

        {/* Class B Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <span>Class B (读/下载)</span>
            <span className="font-mono text-[10px]">
              {classB.toLocaleString()} / 10,000,000
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${percentB}%` }}
            />
          </div>
        </div>

        <p className="text-[10px] text-slate-400 leading-tight">
          💡 已启用目录内存级防刷缓存，只有在修改或主动刷新时才消耗配额。
        </p>
      </div>
    </aside>
  );
};

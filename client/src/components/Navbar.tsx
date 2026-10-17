import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  RefreshCw,
  FolderPlus,
  Upload,
  LayoutGrid,
  List,
  Search,
  ShieldCheck,
  ChevronRight as BreadcrumbSeparator,
  HardDrive,
  User,
} from 'lucide-react';
import type { ViewMode } from '../types';

interface NavbarProps {
  bucket: string;
  currentPrefix: string;
  canGoBack: boolean;
  canGoForward: boolean;
  canGoUp: boolean;
  isLoading: boolean;
  searchQuery: string;
  viewMode: ViewMode;
  classACount: number;
  classBCount: number;
  fromCache?: boolean;
  userEmail?: string | null;
  onNavigate: (prefix: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: () => void;
  onRefresh: () => void;
  onSearchChange: (q: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onNewFolderClick: () => void;
  onOpenQuotaModal: () => void;
  onUploadFiles: (files: FileList) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  bucket,
  currentPrefix,
  canGoBack,
  canGoForward,
  canGoUp,
  isLoading,
  searchQuery,
  viewMode,
  classACount,
  classBCount,
  fromCache,
  userEmail,
  onNavigate,
  onGoBack,
  onGoForward,
  onGoUp,
  onRefresh,
  onSearchChange,
  onViewModeChange,
  onNewFolderClick,
  onOpenQuotaModal,
  onUploadFiles,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Split path into segments: 'photos/2026/summer/' -> ['photos', '2026', 'summer']
  const segments = currentPrefix
    ? currentPrefix.replace(/\/+$/, '').split('/')
    : [];

  const handleSegmentClick = (index: number) => {
    if (index === -1) {
      onNavigate('');
    } else {
      const targetPrefix = segments.slice(0, index + 1).join('/') + '/';
      onNavigate(targetPrefix);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <header className="flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-30 select-none">
      {/* Top Application Bar */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100 dark:border-slate-800/60">
        {/* Brand & Bucket */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100">
                  Cloudflare R2 Explorer
                </span>
                <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 font-semibold px-2 py-0.5 rounded-full border border-orange-200/50">
                  Free Tier Shield
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                Bucket: <span className="text-slate-600 dark:text-slate-300">{bucket}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Free Tier Usage & Stats Pill */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenQuotaModal}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-full transition-all text-xs"
            title="查看本次会话的 Class A/B 消耗与 Cloudflare 免费配额"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-slate-500 dark:text-slate-400">会话 API:</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
              A:<span className="text-orange-600 font-semibold">{classACount}</span> | B:
              <span className="text-blue-600 font-semibold">{classBCount}</span>
            </span>
            {fromCache && (
              <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200/40">
                内存缓存
              </span>
            )}
          </button>

          {userEmail && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium border border-slate-200/60 dark:border-slate-700/60" title="Cloudflare Zero Trust 已授权用户">
              <User className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-mono text-[11px]">{userEmail}</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation & Address Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Navigation Buttons: Back, Forward, Up, Refresh */}
        <div className="flex items-center gap-0.5 text-slate-600 dark:text-slate-300">
          <button
            disabled={!canGoBack}
            onClick={onGoBack}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="后退 (Alt + Left)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            disabled={!canGoForward}
            onClick={onGoForward}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="前进 (Alt + Right)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            disabled={!canGoUp}
            onClick={onGoUp}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="返回上一层"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={onRefresh}
            className={`p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors ${
              isLoading ? 'animate-spin text-orange-500' : ''
            }`}
            title="刷新目录 (F5)"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Address / Breadcrumbs bar */}
        <div className="flex-1 flex items-center bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 overflow-x-auto shadow-inner">
          <button
            onClick={() => handleSegmentClick(-1)}
            className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:underline px-1 py-0.5 rounded transition-colors whitespace-nowrap"
          >
            <HardDrive className="w-3.5 h-3.5 text-orange-500" />
            <span>根目录 (Root)</span>
          </button>

          {segments.map((seg, idx) => (
            <React.Fragment key={idx}>
              <BreadcrumbSeparator className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
              <button
                onClick={() => handleSegmentClick(idx)}
                className={`px-1 py-0.5 rounded hover:text-orange-600 dark:hover:text-orange-400 hover:underline whitespace-nowrap transition-colors ${
                  idx === segments.length - 1 ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {seg}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-48">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="在当前目录过滤..."
            className="w-full pl-8 pr-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Action Buttons: New Folder, Upload, View Toggle */}
        <div className="flex items-center gap-1.5">
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileInputChange}
            className="hidden"
          />
          <button
            onClick={onNewFolderClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5 text-orange-500" />
            <span>新建文件夹</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white rounded-lg text-xs font-medium shadow-sm transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>上传文件</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* View Mode Toggle */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1 rounded ${
                viewMode === 'grid'
                  ? 'bg-slate-100 dark:bg-slate-700 text-orange-600 dark:text-orange-400'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="网格视图"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1 rounded ${
                viewMode === 'list'
                  ? 'bg-slate-100 dark:bg-slate-700 text-orange-600 dark:text-orange-400'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="列表详细视图"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

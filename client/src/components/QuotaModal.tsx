import React from 'react';
import { ShieldCheck, X, Zap, Clock } from 'lucide-react';
import type { StatsResponse } from '../types';

interface QuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: StatsResponse | null;
  onClearCache: () => void;
}

export const QuotaModal: React.FC<QuotaModalProps> = ({
  isOpen,
  onClose,
  stats,
  onClearCache,
}) => {
  if (!isOpen) return null;

  const classA = stats?.stats.classA || 0;
  const classB = stats?.stats.classB || 0;
  const history = stats?.stats.history || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl dark:bg-emerald-950/60 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Cloudflare R2 免费额度守护中心
              </h3>
              <p className="text-[11px] text-slate-400">
                实时追踪 API 调用，避免产生任何额外扣费
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quota Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-400">
              Class A 变更操作
            </span>
            <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
              {classA.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400">
              每月免费限额：1,000,000 次 (创建/删除/移动/列举)
            </p>
          </div>

          <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
              Class B 读取操作
            </span>
            <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
              {classB.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400">
              每月免费限额：10,000,000 次 (下载/元数据读取)
            </p>
          </div>

          <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              出站流量 (Egress)
            </span>
            <div className="text-xl font-bold font-mono text-emerald-600">
              $0 / 完全免费
            </div>
            <p className="text-[10px] text-slate-400">
              Cloudflare R2 不收取任何下载流量费用
            </p>
          </div>
        </div>

        {/* Protection mechanisms explanation */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>防超限机制已生效：</span>
          </div>
          <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
            <li>
              <strong>内存级目录缓存</strong>：同一目录在 30 秒内重复访问不发 API 请求，优先读本地缓存。
            </li>
            <li>
              <strong>按级扁平列举</strong>：仅列出当前文件夹子项，杜绝全桶递归遍历消耗 Class A。
            </li>
            <li>
              <strong>公开域名分流</strong>：已配置自定义域名预览，直链不占用 S3 Class B 预签名额度。
            </li>
          </ul>
        </div>

        {/* Operation Audit Logs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              本次会话操作审计流水 (近 50 条)
            </span>
            <button
              onClick={onClearCache}
              className="text-[10px] text-orange-600 hover:underline"
            >
              清空目录缓存
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 font-mono text-[11px] divide-y divide-slate-100 dark:divide-slate-800/60">
            {history.length === 0 ? (
              <p className="text-slate-400 py-2 text-center font-sans">暂无操作记录</p>
            ) : (
              history.map((log, idx) => (
                <div key={idx} className="py-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        log.type === 'A'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      Class {log.type}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 truncate">
                      {log.details}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    {new Date(log.time).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};

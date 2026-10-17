import React, { useState } from 'react';
import { Lock, KeyRound, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface LockModalProps {
  isOpen: boolean;
  onUnlock: (password: string) => Promise<boolean>;
}

export const LockModal: React.FC<LockModalProps> = ({ isOpen, onUnlock }) => {
  const [password, setPassword] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setIsError(false);

    const success = await onUnlock(password.trim());
    setIsSubmitting(false);

    if (!success) {
      setIsError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-7 space-y-6 text-center select-none">
        {/* Lock Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
          <Lock className="w-7 h-7" />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Cloudflare R2 资源管理器
          </h2>
          <p className="text-xs text-slate-400">
            该站点已开启私有保护，请输入访问密码以解锁
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (isError) setIsError(false);
              }}
              placeholder="请输入访问密码..."
              className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none transition-all ${
                isError
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/30'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500'
              }`}
            />
          </div>

          {isError && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-500 font-medium animate-shake">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>密码不正确，请重新输入</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!password.trim() || isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-medium text-xs rounded-xl shadow-md shadow-orange-600/20 disabled:opacity-40 transition-all cursor-pointer"
          >
            <span>{isSubmitting ? '验证中...' : '解锁访问'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Footer note */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>密码验证通过后将在此设备上记住</span>
        </div>
      </div>
    </div>
  );
};

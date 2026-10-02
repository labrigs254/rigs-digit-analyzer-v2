'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Target, Scale, TrendingUp, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StrategyMode = 'matches-differs' | 'even-odd' | 'over-under' | 'master';

interface SmartRANavigationProps {
  activeMode?: StrategyMode;
  onSelectMode?: (mode: StrategyMode) => void;
}

export function SmartRANavigation({ activeMode = 'master', onSelectMode }: SmartRANavigationProps) {
  const pathname = usePathname();

  const navItems = [
    {
      id: 'matches-differs' as StrategyMode,
      href: '/smart-r-ai?mode=matches-differs',
      label: 'Matches / Differs',
      badge: 'Digit Match',
      icon: Target,
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20',
      activeColor: 'bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]',
    },
    {
      id: 'even-odd' as StrategyMode,
      href: '/smart-r-ai/even-odd',
      label: 'Even / Odd',
      badge: '0,2,4,6,8 vs 1,3,5,7,9',
      icon: Scale,
      color: 'text-violet-400 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20',
      activeColor: 'bg-violet-500/25 border-violet-500 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.35)]',
    },
    {
      id: 'over-under' as StrategyMode,
      href: '/smart-r-ai/over-under',
      label: 'Over / Under',
      badge: 'High vs Low Thresholds',
      icon: TrendingUp,
      color: 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20',
      activeColor: 'bg-blue-500/25 border-blue-500 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.35)]',
    },
    {
      id: 'master' as StrategyMode,
      href: '/smart-r-ai',
      label: 'Master AI (All-in-One)',
      badge: 'Full Overview',
      icon: BrainCircuit,
      color: 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20',
      activeColor: 'bg-amber-500/25 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]',
    },
  ];

  return (
    <div className="w-full rounded-2xl border border-border/60 bg-card/80 p-2.5 backdrop-blur-md shadow-sm">
      <div className="flex items-center justify-between px-2 mb-2">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          SELECT YOUR TRADING MODE (ISOLATED VIEW)
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground hidden sm:inline">
          Filter out unnecessary clutter & focus on your strategy
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isPathActive =
            (item.id === 'even-odd' && pathname?.includes('even-odd')) ||
            (item.id === 'over-under' && pathname?.includes('over-under')) ||
            (item.id === activeMode && !pathname?.includes('even-odd') && !pathname?.includes('over-under'));

          return (
            <button
              key={item.id}
              onClick={() => {
                if (onSelectMode) {
                  onSelectMode(item.id);
                } else {
                  window.location.href = item.href;
                }
              }}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer group',
                isPathActive ? item.activeColor : item.color
              )}
            >
              <div className="rounded-lg p-2 bg-background/50 border border-border/40 shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-black tracking-wide truncate">{item.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground block truncate mt-0.5">{item.badge}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

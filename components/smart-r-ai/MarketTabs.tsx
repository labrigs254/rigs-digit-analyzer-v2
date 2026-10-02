'use client';

/**
 * Smart R AI — Market Selection Tab Bar
 * Allows the user to toggle between market analysis views:
 * - Co-Pilot Auto Mode
 * - Matches / Differs
 * - Even / Odd
 * - Over / Under
 *
 * Prevents UI clutter by displaying only the chosen market panel.
 */

import { cn } from '@/lib/utils';
import { Bot, Target, Scale, TrendingUp } from 'lucide-react';

export type MarketTabId = 'auto' | 'matches-differs' | 'even-odd' | 'over-under';

interface MarketTabsProps {
  activeTab: MarketTabId;
  onSelectTab: (tab: MarketTabId) => void;
  activeSignalAction?: string;
}

const TABS: { id: MarketTabId; label: string; icon: typeof Bot; description: string }[] = [
  {
    id: 'auto',
    label: 'Co-Pilot Mode',
    icon: Bot,
    description: 'Auto-selects highest statistical edge across all markets',
  },
  {
    id: 'matches-differs',
    label: 'Matches / Differs',
    icon: Target,
    description: 'Hot & Cold digits analysis (0-9)',
  },
  {
    id: 'even-odd',
    label: 'Even / Odd',
    icon: Scale,
    description: 'Even (0,2,4,6,8) vs Odd (1,3,5,7,9) bias',
  },
  {
    id: 'over-under',
    label: 'Over / Under',
    icon: TrendingUp,
    description: 'Digit threshold barrier probabilities',
  },
];

export function MarketTabs({ activeTab, onSelectTab, activeSignalAction }: MarketTabsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
          Select Market View
        </span>
        {activeSignalAction && activeSignalAction !== 'HOLD' && (
          <span className="text-[10px] font-bold text-emerald-400 animate-pulse">
            LIVE SIGNAL: {activeSignalAction}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl border border-border/50 bg-card/60 p-1.5 backdrop-blur-md">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl px-3 py-2.5 transition-all duration-200 text-center relative group',
                isActive
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 font-bold'
                  : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
              )}
            >
              <div className="flex items-center gap-1.5">
                <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-white' : 'text-violet-400')} />
                <span className="text-xs font-extrabold tracking-tight">{tab.label}</span>
              </div>
              <span className={cn('text-[9px] mt-0.5 opacity-70 line-clamp-1', isActive ? 'text-white/80' : 'text-muted-foreground')}>
                {tab.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

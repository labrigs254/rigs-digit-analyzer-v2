'use client';

/**
 * Smart R AI — Pattern Panel
 * Displays detected patterns in a vertical list with severity indicators.
 */

import { Activity, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PatternEvent } from '@/lib/smart-r-ai/types';

interface PatternPanelProps {
  patterns: PatternEvent[];
}

export function PatternPanel({ patterns }: PatternPanelProps) {
  if (patterns.length === 0) {
    return (
      <div className="flex h-24 flex-col items-center justify-center text-sm text-muted-foreground">
        <Activity className="mb-2 h-5 w-5 opacity-40" />
        No significant patterns detected
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {patterns.slice(0, 5).map((p, i) => {
        const isHigh = p.severity === 'HIGH';
        const isMod = p.severity === 'MODERATE';
        const clr = isHigh ? 'text-red-400 border-red-500/30' : isMod ? 'text-amber-400 border-amber-500/30' : 'text-blue-400 border-blue-500/30';
        const bg = isHigh ? 'bg-red-500/5' : isMod ? 'bg-amber-500/5' : 'bg-blue-500/5';
        const Icon = isHigh ? AlertTriangle : isMod ? AlertTriangle : Info;

        return (
          <div key={i} className={cn('flex items-start gap-3 rounded-lg border p-3 transition-colors', clr, bg)}>
            <div className={cn('mt-0.5 rounded-full p-1', isHigh ? 'bg-red-500/10' : isMod ? 'bg-amber-500/10' : 'bg-blue-500/10')}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                  {p.type.replace('_', ' ')}
                </span>
                <span className={cn('rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border', clr)}>
                  {p.severity}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({p.windowSize} ticks)
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-foreground">{p.description}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{p.statContext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

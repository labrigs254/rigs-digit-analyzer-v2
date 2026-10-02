'use client';

/**
 * Smart R AI — Contract Selector
 * Segmented control for MATCHES / DIFFERS selection.
 * Scoped to digit contracts only — Even/Odd and Over/Under
 * are available in the advanced Co-Pilot collapsible section.
 */

import { cn } from '@/lib/utils';
import type { ContractMode } from '@/lib/types';

interface ContractSelectorProps {
  contractMode: ContractMode;
  onChange: (mode: ContractMode) => void;
}

const CONTRACTS: { mode: ContractMode; label: string; description: string }[] = [
  {
    mode: 'DIGITMATCH',
    label: 'MATCHES',
    description: 'Last digit equals selected',
  },
  {
    mode: 'DIGITDIFF',
    label: 'DIFFERS',
    description: 'Last digit ≠ selected',
  },
];

export function ContractSelector({ contractMode, onChange }: ContractSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Contract
      </span>
      <div className="flex gap-1.5 rounded-xl border border-border/50 bg-muted/20 p-1">
        {CONTRACTS.map(({ mode, label, description }) => {
          const isActive = contractMode === mode;
          return (
            <button
              key={mode}
              onClick={() => onChange(mode)}
              title={description}
              className={cn(
                'flex-1 rounded-lg py-2 px-3 text-xs font-extrabold uppercase tracking-widest transition-all duration-200',
                isActive
                  ? mode === 'DIGITMATCH'
                    ? 'bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/30'
                    : 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

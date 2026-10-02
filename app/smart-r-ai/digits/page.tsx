'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useDerivWSContext } from '@/components/custom/deriv-ws-provider';
import { useDigitsTrading } from '@/hooks/use-digits-trading';
import { useSmartRAI } from '@/hooks/use-smart-r-ai';
import { SymbolSelector } from '@/components/custom/symbol-selector';
import { Header } from '@/components/custom/header';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  Activity,
  Wifi,
  Binary,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import type { OpenPosition } from '@/hooks/use-open-positions';

// --- Shared Navigation Sub-Header ---
function WorkspaceNavBar({ active }: { active: 'matches-differs' | 'even-odd' | 'over-under' | 'digits' }) {
  return (
    <div className="w-full rounded-2xl border border-border/60 bg-card/80 p-3 backdrop-blur-md shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <Link
        href="/smart-r-ai"
        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>← Trading Menu</span>
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/smart-r-ai/matches-differs"
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all',
            active === 'matches-differs'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
              : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
          )}
        >
          🎯 Matches / Differs
        </Link>
        <Link
          href="/smart-r-ai/even-odd"
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all',
            active === 'even-odd'
              ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40 shadow-sm'
              : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
          )}
        >
          ⚪ Even / Odd
        </Link>
        <Link
          href="/smart-r-ai/over-under"
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all',
            active === 'over-under'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm'
              : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
          )}
        >
          📈 Over / Under
        </Link>
        <Link
          href="/smart-r-ai/digits"
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all',
            active === 'digits'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
              : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
          )}
        >
          🔢 Digit Contracts
        </Link>
      </div>
    </div>
  );
}

function DigitContractsWorkspaceContent() {
  const { ws, isConnected, isExhausted, auth } = useDerivWSContext();
  const { logout } = auth;

  const trading = useDigitsTrading({
    ws,
    isConnected,
    isExhausted,
    isAuthenticated: !!auth.wsUrl,
    onAuthWSFailed: logout,
  });

  const activeSymbol = trading.activeSymbol;
  const symbols = trading.symbols ?? [];
  const prices = trading.prices ?? [];
  const pipSize = typeof trading.pipSize === 'number' && trading.pipSize >= 0 ? trading.pipSize : 2;

  const [selectedDigit, setSelectedDigit] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  useEffect(() => {
    trading.setTradeType('matches-differs');
    trading.setContractMode('DIGITMATCH');
    trading.setSelectedDigit(selectedDigit);
  }, [selectedDigit]);

  const { analysis, activeWindowSize, windowSizes, setActiveWindowSize } = useSmartRAI({
    prices,
    pipSize,
    isConnected: trading.isConnected,
    symbol: activeSymbol?.underlying_symbol_name ?? 'UNKNOWN',
    contractMode: 'DIGITMATCH',
    selectedDigit,
    tradeType: 'matches-differs',
  });

  const hasNoTicks = prices.length === 0;

  // Calculate frequencies for digits 0-9
  const last100 = prices.slice(-100).map((p) => parseInt(p.toFixed(pipSize).slice(-1), 10));
  const counts = Array(10).fill(0);
  last100.forEach((d) => counts[d]++);
  const sampleSize = last100.length || 1;

  const activeOpenPos: OpenPosition | undefined = trading.openPositions.find(
    (p) => p.underlying_symbol === activeSymbol?.underlying_symbol && p.status === 'open'
  );
  const latestClosedPos = trading.closedPositions.find(
    (p) => p.underlying_symbol === activeSymbol?.underlying_symbol
  );

  return (
    <main className="flex min-h-dvh flex-col bg-background selection:bg-amber-500/30">
      <Header
        authState={'unauthenticated'}
        accounts={[]}
        activeAccount={null}
        onLogin={async () => {}}
        onLogout={() => {}}
        onSwitchAccount={async () => {}}
        actions={<ThemeToggle />}
        hideAuth={true}
      />

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 lg:px-8 py-6 flex flex-col items-center">
        
        {/* Workspace Navigation Bar */}
        <WorkspaceNavBar active="digits" />

        {/* WORKSPACE TOP HEADER */}
        <div className="w-full text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-xs font-bold text-amber-400">
            <Binary className="h-3.5 w-3.5" />
            <span>DEDICATED WORKSPACE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground uppercase">
            DIGIT CONTRACTS & DISTRIBUTION
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Analyze rolling digit frequencies across digits 0–9 and review multi-window distributions.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs font-bold">
            <span className="bg-card border px-3 py-1.5 rounded-xl">
              Market: <span className="text-foreground">{activeSymbol?.underlying_symbol_name ?? 'Select Market'}</span>
            </span>
            <span className="bg-card border px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              Status: <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> <span className="text-emerald-400">LIVE</span>
            </span>
            <span className="bg-card border px-3 py-1.5 rounded-xl font-mono">
              Quote: <span className="text-amber-400">{trading.currentTick ? trading.currentTick.quote.toFixed(pipSize) : '—'}</span>
            </span>
          </div>
        </div>

        <div className="w-full max-w-3xl space-y-8">
          
          {/* SECTION 1 — SELECT MARKET */}
          <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">SECTION 1 — MARKET</span>
              <span className="text-xs text-muted-foreground">Select Deriv Market</span>
            </div>
            <SymbolSelector
              symbols={symbols}
              activeSymbol={activeSymbol}
              onSymbolChange={(s) => trading.selectSymbol(s)}
            />
          </section>

          {/* SECTION 2 — DIGIT DISTRIBUTION TABLE */}
          <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" /> SECTION 2 — DIGIT FREQUENCY (LAST {sampleSize} TICKS)
              </span>
              <span className="text-xs text-muted-foreground">0–9 Percentages</span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
                const count = counts[digit];
                const pct = Math.round((count / sampleSize) * 100);
                const isSelected = selectedDigit === digit;
                return (
                  <button
                    key={digit}
                    onClick={() => setSelectedDigit(digit)}
                    className={cn(
                      'flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer',
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-muted/10 border-border/40 hover:bg-muted/40'
                    )}
                  >
                    <span className="text-xs font-mono font-black">{digit}</span>
                    <span className="text-base font-black text-amber-400 mt-1">{pct}%</span>
                    <span className="text-[9px] text-muted-foreground">{count}x</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* SECTION 3 — LIVE MARKET */}
          <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">SECTION 3 — LIVE MARKET DATA</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5"/> Live WebSocket</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="rounded-2xl border bg-muted/10 p-3">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-1">Live Quote</span>
                <span className="text-lg font-mono font-black text-foreground">
                  {trading.currentTick ? trading.currentTick.quote.toFixed(pipSize) : '—'}
                </span>
              </div>
              <div className="rounded-2xl border bg-muted/10 p-3">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-1">Current Digit</span>
                <span className="text-2xl font-black text-amber-400">
                  {trading.lastDigit !== null ? trading.lastDigit : '—'}
                </span>
              </div>
              <div className="rounded-2xl border bg-muted/10 p-3">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-1">Ticks Received</span>
                <span className="text-lg font-black text-foreground">{prices.length}</span>
              </div>
              <div className="rounded-2xl border bg-muted/10 p-3">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-1">Connection</span>
                <span className="text-sm font-extrabold text-emerald-400">{trading.isConnected ? 'LIVE' : 'OFFLINE'}</span>
              </div>
            </div>
          </section>

          {/* SECTION 4 — TRADE SETTINGS & PROPOSAL */}
          <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">SECTION 4 — TRADE SETTINGS & PROPOSAL</span>
              <span className="text-xs text-muted-foreground">Digit Match Proposal</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1.5 block">Selected Digit</label>
                <select
                  aria-label="Selected Digit"
                  value={selectedDigit}
                  onChange={(e) => setSelectedDigit(Number(e.target.value))}
                  className="w-full bg-muted/20 border border-border/60 rounded-xl p-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 ring-amber-500"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                    <option key={d} value={d}>Digit {d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1.5 block">Duration (Ticks)</label>
                <select
                  aria-label="Duration Ticks"
                  value={trading.duration}
                  onChange={(e) => trading.setDuration(Number(e.target.value))}
                  className="w-full bg-muted/20 border border-border/60 rounded-xl p-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 ring-amber-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                    <option key={d} value={d}>{d} Tick{d > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1.5 block">Stake Amount (USD)</label>
                <input
                  type="number"
                  min="0.35"
                  step="1"
                  aria-label="Stake USD"
                  value={trading.stake}
                  onChange={(e) => trading.setStake(e.target.value)}
                  className="w-full bg-muted/20 border border-border/60 rounded-xl p-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 ring-amber-500"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">Potential Payout</span>
                <span className="text-2xl font-black text-amber-400">
                  {trading.isProposalLoading ? 'Calculating…' : trading.proposal?.payout ? `$${trading.proposal.payout}` : '—'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">Net Profit</span>
                <span className="text-base font-bold text-foreground">
                  {trading.proposal?.payout ? `$${(trading.proposal.payout - Number(trading.stake)).toFixed(2)}` : '—'}
                </span>
              </div>
            </div>

            <button
              disabled={!trading.proposal || trading.isProposalLoading}
              onClick={() => setShowConfirmModal(true)}
              className="w-full rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black py-4 text-base shadow-xl shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-40"
            >
              TRADE NOW
            </button>
          </section>

          {/* SECTION 5 — CONFIRMATION MODAL */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in">
              <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6">
                <h3 className="text-2xl font-black text-foreground text-center">CONFIRM YOUR TRADE</h3>

                <div className="space-y-3 rounded-2xl border bg-muted/20 p-4 text-sm font-bold">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market:</span>
                    <span>{activeSymbol?.underlying_symbol_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selected Digit:</span>
                    <span className="font-mono text-amber-400 font-extrabold">{selectedDigit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{trading.duration} Tick(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stake:</span>
                    <span>${trading.stake} USD</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Potential Payout:</span>
                    <span className="text-amber-400 font-black">${trading.proposal?.payout ?? '—'}</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 rounded-xl bg-muted py-3 font-bold text-foreground hover:bg-muted/80 transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    disabled={trading.isBuying}
                    onClick={async () => {
                      await trading.buyContract();
                      setShowConfirmModal(false);
                    }}
                    className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black py-3 shadow-lg shadow-amber-500/20 transition-all"
                  >
                    {trading.isBuying ? 'BUYING...' : 'CONFIRM & TRADE'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}

export default function DigitContractsWorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background flex items-center justify-center text-muted-foreground">Loading Digit Contracts Workspace…</div>}>
      <DigitContractsWorkspaceContent />
    </Suspense>
  );
}

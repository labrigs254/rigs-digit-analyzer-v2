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
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import type { OpenPosition } from '@/hooks/use-open-positions';

// --- Shared Navigation Sub-Header with Mobile Touch Scroll ---
function WorkspaceNavBar({ active }: { active: 'matches-differs' | 'even-odd' | 'over-under' | 'digits' }) {
  return (
    <div className="w-full rounded-2xl border border-border/60 bg-card/80 p-2.5 sm:p-3 backdrop-blur-md shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-3">
      <Link
        href="/smart-r-ai"
        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors shrink-0 self-start md:self-auto"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>← Trading Menu</span>
      </Link>

      <div className="w-full md:w-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-1 px-0.5">
        <Link
          href="/smart-r-ai/matches-differs"
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0',
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
            'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0',
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
            'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0',
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
            'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0',
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

function OverUnderWorkspaceContent() {
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

  const [threshold, setThreshold] = useState<number>(4);
  const [contractChoice, setContractChoice] = useState<'DIGITOVER' | 'DIGITUNDER'>('DIGITOVER');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  useEffect(() => {
    trading.setTradeType('over-under');
    trading.setContractMode(contractChoice);
    trading.setSelectedDigit(threshold);
  }, [contractChoice, threshold]);

  const { analysis, activeWindowSize, windowSizes, setActiveWindowSize } = useSmartRAI({
    prices,
    pipSize,
    isConnected: trading.isConnected,
    symbol: activeSymbol?.underlying_symbol_name ?? 'UNKNOWN',
    contractMode: contractChoice,
    selectedDigit: threshold,
    tradeType: 'over-under',
  });

  const hasNoTicks = prices.length === 0;

  // Real tick Over vs Under calculation relative to selected threshold
  const totalTicksCount = prices.length;
  const last100Digits = prices.slice(-100).map((p) => parseInt(p.toFixed(pipSize).slice(-1), 10));
  const overCount = last100Digits.filter((d) => d > threshold).length;
  const underCount = last100Digits.filter((d) => d < threshold).length;
  const equalCount = last100Digits.filter((d) => d === threshold).length;
  const sampleSize = last100Digits.length || 1;
  const overPct = Math.round((overCount / sampleSize) * 100);
  const underPct = Math.round((underCount / sampleSize) * 100);
  const equalPct = Math.round((equalCount / sampleSize) * 100);

  const activeOpenPos: OpenPosition | undefined = trading.openPositions.find(
    (p) => p.underlying_symbol === activeSymbol?.underlying_symbol && (p.contract_type === 'DIGITOVER' || p.contract_type === 'DIGITUNDER') && p.status === 'open'
  );
  const latestClosedPos = trading.closedPositions.find(
    (p) => p.underlying_symbol === activeSymbol?.underlying_symbol && (p.contract_type === 'DIGITOVER' || p.contract_type === 'DIGITUNDER')
  );

  return (
    <main className="flex min-h-dvh flex-col bg-background selection:bg-blue-500/30">
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

      <div className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col items-center">
        
        {/* Workspace Navigation Bar */}
        <WorkspaceNavBar active="over-under" />

        {/* WORKSPACE TOP HEADER */}
        <div className="w-full text-center space-y-2 sm:space-y-3 mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-[11px] sm:text-xs font-bold text-blue-400">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>DEDICATED WORKSPACE</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground uppercase">
            OVER / UNDER WORKSPACE
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto px-2">
            Select a market, select your threshold digit, choose Over or Under, then review live analysis.
          </p>

          {/* Quick Status Bar Mobile Grid */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-3 pt-2 text-xs font-bold">
            <div className="bg-card border px-3 py-1.5 rounded-xl flex items-center justify-between sm:justify-start gap-1.5">
              <span className="text-muted-foreground text-[10px] sm:text-xs uppercase">MARKET:</span>
              <span className="text-foreground font-black text-xs truncate max-w-[100px] sm:max-w-none">{activeSymbol?.underlying_symbol_name ?? 'Select'}</span>
            </div>
            <div className="bg-card border px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-extrabold text-xs">LIVE</span>
            </div>
            <div className="bg-card border px-3 py-1.5 rounded-xl font-mono flex items-center justify-between sm:justify-start gap-1.5">
              <span className="text-muted-foreground font-sans text-[10px] sm:text-xs uppercase">Quote:</span>
              <span className="text-blue-400 font-black text-xs">{trading.currentTick ? trading.currentTick.quote.toFixed(pipSize) : '—'}</span>
            </div>
            <div className="bg-card border px-3 py-1.5 rounded-xl flex items-center justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground text-[10px] sm:text-xs uppercase">DIGIT:</span>
              <span className="text-2xl sm:text-3xl font-black text-blue-400 font-mono leading-none">{trading.lastDigit !== null ? trading.lastDigit : '—'}</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-3xl space-y-6 sm:space-y-8">
          
          {/* SECTION 1 — SELECT MARKET */}
          <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-blue-400">SECTION 1 — MARKET</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">Select Deriv Market</span>
            </div>
            <SymbolSelector
              symbols={symbols}
              activeSymbol={activeSymbol}
              onSymbolChange={(s) => trading.selectSymbol(s)}
            />
          </section>

          {/* SECTION 2 — SELECT THRESHOLD & CONTRACT */}
          <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2.5">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-blue-400">SECTION 2 — THRESHOLD & CONTRACT</span>
              <span className="text-xs font-extrabold text-foreground">Threshold: {threshold}</span>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1.5 block">Threshold Digit (0-9)</label>
              {/* Mobile Optimized Grid: 5 Columns per Row */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
                  const isSelected = threshold === digit;
                  return (
                    <button
                      key={digit}
                      onClick={() => setThreshold(digit)}
                      className={cn(
                        'flex items-center justify-center py-2.5 sm:p-3 rounded-2xl border font-mono text-base sm:text-lg font-black transition-all cursor-pointer',
                        isSelected
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-md scale-105'
                          : 'bg-muted/10 border-border/40 hover:bg-muted/40 text-foreground'
                      )}
                    >
                      {digit}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
              <button
                onClick={() => setContractChoice('DIGITOVER')}
                className={cn(
                  'flex flex-col items-center justify-center rounded-3xl p-4 sm:p-5 border transition-all cursor-pointer text-center space-y-1',
                  contractChoice === 'DIGITOVER'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20 scale-[1.02]'
                    : 'bg-muted/10 border-border/40 hover:bg-muted/40 text-foreground'
                )}
              >
                <span className="text-xl sm:text-2xl font-black">OVER {threshold}</span>
                <span className="text-xs text-muted-foreground font-medium">Final digit must be greater than {threshold}.</span>
              </button>

              <button
                onClick={() => setContractChoice('DIGITUNDER')}
                className={cn(
                  'flex flex-col items-center justify-center rounded-3xl p-4 sm:p-5 border transition-all cursor-pointer text-center space-y-1',
                  contractChoice === 'DIGITUNDER'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-500/20 scale-[1.02]'
                    : 'bg-muted/10 border-border/40 hover:bg-muted/40 text-foreground'
                )}
              >
                <span className="text-xl sm:text-2xl font-black">UNDER {threshold}</span>
                <span className="text-xs text-muted-foreground font-medium">Final digit must be less than {threshold}.</span>
              </button>
            </div>
          </section>

          {/* SECTION 3 — LIVE MARKET */}
          <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-blue-400">SECTION 3 — LIVE MARKET DATA</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5"/> Live Ticks</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 text-center">
              <div className="rounded-2xl border bg-muted/10 p-2.5 sm:p-3">
                <span className="text-[9px] font-extrabold text-muted-foreground uppercase block mb-1">Live Quote</span>
                <span className="text-sm sm:text-lg font-mono font-black text-foreground">
                  {trading.currentTick ? trading.currentTick.quote.toFixed(pipSize) : '—'}
                </span>
              </div>
              <div className="rounded-2xl border bg-muted/10 p-2.5 sm:p-3">
                <span className="text-[9px] font-extrabold text-muted-foreground uppercase block mb-1">Current Digit</span>
                <span className="text-xl sm:text-2xl font-black text-blue-400">
                  {trading.lastDigit !== null ? trading.lastDigit : '—'}
                </span>
              </div>
              <div className="rounded-2xl border bg-muted/10 p-2.5 sm:p-3">
                <span className="text-[9px] font-extrabold text-muted-foreground uppercase block mb-1">Ticks Received</span>
                <span className="text-sm sm:text-lg font-black text-foreground">{totalTicksCount}</span>
              </div>
              <div className="rounded-2xl border bg-muted/10 p-2.5 sm:p-3">
                <span className="text-[9px] font-extrabold text-muted-foreground uppercase block mb-1">Connection</span>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-400">{trading.isConnected ? 'LIVE' : 'OFFLINE'}</span>
              </div>
            </div>
          </section>

          {/* SECTION 4 — SMART R OVER / UNDER ANALYSIS */}
          <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between border-b pb-2.5">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> SMART R OVER / UNDER ANALYSIS
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-muted-foreground">Threshold {threshold}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div className="rounded-2xl border bg-muted/10 p-2.5 sm:p-3">
                <span className="text-[9px] font-extrabold text-muted-foreground uppercase block mb-0.5">Over {threshold}</span>
                <span className="text-xl sm:text-2xl font-black text-blue-400">{overPct}%</span>
                <span className="text-[9px] sm:text-[10px] text-muted-foreground block font-mono">{overCount}/{sampleSize}</span>
              </div>
              <div className="rounded-2xl border bg-muted/10 p-2.5 sm:p-3">
                <span className="text-[9px] font-extrabold text-muted-foreground uppercase block mb-0.5">Under {threshold}</span>
                <span className="text-xl sm:text-2xl font-black text-indigo-400">{underPct}%</span>
                <span className="text-[9px] sm:text-[10px] text-muted-foreground block font-mono">{underCount}/{sampleSize}</span>
              </div>
              <div className="rounded-2xl border bg-muted/10 p-2.5 sm:p-3">
                <span className="text-[9px] font-extrabold text-muted-foreground uppercase block mb-0.5">Equal {threshold}</span>
                <span className="text-xl sm:text-2xl font-black text-yellow-400">{equalPct}%</span>
                <span className="text-[9px] sm:text-[10px] text-muted-foreground block font-mono">{equalCount}/{sampleSize}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{showAdvanced ? '▼ Hide Advanced Analysis' : '▸ Advanced Analysis'}</span>
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded">Multi-window</span>
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 text-xs">
                  <div>
                    <span className="font-bold text-muted-foreground block mb-2">Analysis Window Sizes:</span>
                    <div className="flex flex-wrap gap-2">
                      {windowSizes.map((w) => (
                        <button
                          key={w}
                          onClick={() => setActiveWindowSize(w)}
                          className={cn(
                            'px-3 py-1 rounded-lg font-bold border transition-all',
                            activeWindowSize === w ? 'bg-blue-500 text-white border-blue-500' : 'bg-muted/20 border-border/50 text-muted-foreground'
                          )}
                        >
                          {w} ticks
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-muted-foreground block mb-2">Recent 10 Digits:</span>
                    <div className="flex flex-wrap gap-2 font-mono text-sm font-bold bg-muted/20 p-3 rounded-xl border">
                      {prices.slice(-10).map((p, i) => {
                        const d = parseInt(p.toFixed(pipSize).slice(-1), 10);
                        return (
                          <span
                            key={i}
                            className={
                              d > threshold
                                ? 'text-blue-400 font-black'
                                : d < threshold
                                ? 'text-indigo-400 font-black'
                                : 'text-yellow-400 font-black'
                            }
                          >
                            {d}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 5 — TRADE SETTINGS & PROPOSAL */}
          <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between border-b pb-2.5">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-blue-400">SECTION 5 — TRADE SETTINGS</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">Deriv Live Proposal</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1 block">Duration (Ticks)</label>
                <select
                  aria-label="Duration Ticks"
                  value={trading.duration}
                  onChange={(e) => trading.setDuration(Number(e.target.value))}
                  className="w-full bg-muted/20 border border-border/60 rounded-xl p-2.5 sm:p-3 text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 ring-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                    <option key={d} value={d}>{d} Tick{d > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1 block">Stake Amount (USD)</label>
                <input
                  type="number"
                  min="0.35"
                  step="1"
                  aria-label="Stake USD"
                  value={trading.stake}
                  onChange={(e) => trading.setStake(e.target.value)}
                  className="w-full bg-muted/20 border border-border/60 rounded-xl p-2.5 sm:p-3 text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 ring-blue-500"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-3.5 sm:p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">Potential Payout</span>
                <span className="text-xl sm:text-2xl font-black text-blue-400">
                  {trading.isProposalLoading ? 'Calculating…' : trading.proposal?.payout ? `$${trading.proposal.payout}` : '—'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">Net Profit</span>
                <span className="text-xs sm:text-base font-bold text-foreground">
                  {trading.proposal?.payout ? `$${(trading.proposal.payout - Number(trading.stake)).toFixed(2)}` : '—'}
                </span>
              </div>
            </div>

            <button
              disabled={!trading.proposal || trading.isProposalLoading}
              onClick={() => setShowConfirmModal(true)}
              className="w-full rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 sm:py-4 text-sm sm:text-base shadow-xl shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-40"
            >
              TRADE NOW
            </button>
          </section>

          {/* SECTION 6 — CONFIRMATION MODAL */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in">
              <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-5">
                <h3 className="text-xl sm:text-2xl font-black text-foreground text-center">CONFIRM YOUR TRADE</h3>

                <div className="space-y-2.5 rounded-2xl border bg-muted/20 p-4 text-xs sm:text-sm font-bold">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market:</span>
                    <span>{activeSymbol?.underlying_symbol_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contract:</span>
                    <span className="text-blue-400 font-extrabold">{contractChoice === 'DIGITOVER' ? `OVER ${threshold}` : `UNDER ${threshold}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Threshold:</span>
                    <span className="font-mono text-blue-400 font-extrabold">{threshold}</span>
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
                    <span className="text-blue-400 font-black">${trading.proposal?.payout ?? '—'}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 rounded-xl bg-muted py-3 font-bold text-xs sm:text-sm text-foreground hover:bg-muted/80 transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    disabled={trading.isBuying}
                    onClick={async () => {
                      await trading.buyContract();
                      setShowConfirmModal(false);
                    }}
                    className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black py-3 text-xs sm:text-sm shadow-lg shadow-blue-500/20 transition-all"
                  >
                    {trading.isBuying ? 'BUYING...' : 'CONFIRM & TRADE'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Position Monitoring */}
          {activeOpenPos && (
            <div className="rounded-3xl border-2 border-blue-500/50 bg-blue-500/5 p-4 sm:p-6 space-y-3 animate-in fade-in">
              <span className="text-[10px] font-extrabold text-blue-400 tracking-widest uppercase block">ACTIVE TRADE IN PROGRESS</span>
              <div className="flex justify-between items-center">
                <span className="text-lg sm:text-2xl font-black text-foreground">{activeOpenPos.contract_type}</span>
                <span className="text-xs sm:text-sm font-bold text-blue-400 flex items-center gap-1.5"><Activity className="h-4 w-4 animate-spin"/> RUNNING</span>
              </div>
            </div>
          )}

          {latestClosedPos && !activeOpenPos && (() => {
            const profit = latestClosedPos.sell_price - latestClosedPos.buy_price;
            const isWon = profit > 0;
            return (
              <div className={cn('rounded-3xl border p-4 sm:p-6 text-center space-y-2 animate-in fade-in', isWon ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400' : 'border-red-500/40 bg-red-500/5 text-red-400')}>
                <span className="text-[10px] font-extrabold tracking-widest uppercase block">TRADE RESULT</span>
                <span className="text-2xl sm:text-3xl font-black block">{isWon ? 'WON 🎉' : 'LOST ❌'}</span>
                <span className="text-xs sm:text-sm font-bold text-muted-foreground block font-mono">{profit > 0 ? `+${profit.toFixed(2)} USD` : `${profit.toFixed(2)} USD`}</span>
              </div>
            );
          })()}

        </div>
      </div>
    </main>
  );
}

export default function OverUnderWorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background flex items-center justify-center text-muted-foreground">Loading Over / Under Workspace…</div>}>
      <OverUnderWorkspaceContent />
    </Suspense>
  );
}

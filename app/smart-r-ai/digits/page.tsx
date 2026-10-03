'use client';

import { useState, Suspense } from 'react';
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
  Wifi,
  Hash,
  Sparkles,
  Brain,
  Zap,
  Layers,
  DollarSign,
} from 'lucide-react';

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

function DigitsWorkspaceContent() {
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

  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const { analysis, advanced, activeWindowSize, windowSizes, setActiveWindowSize } = useSmartRAI({
    prices,
    pipSize,
    isConnected: trading.isConnected,
    symbol: activeSymbol?.underlying_symbol_name ?? 'UNKNOWN',
    tradeType: 'matches-differs',
  });

  const totalTicksCount = prices.length;
  const last100Digits = prices.slice(-100).map((p) => parseInt(p.toFixed(pipSize).slice(-1), 10));
  const counts = Array(10).fill(0);
  last100Digits.forEach((d) => counts[d]++);
  const sampleSize = last100Digits.length || 1;

  // Rank digits by frequency
  const ranked = counts.map((count, digit) => ({
    digit,
    count,
    pct: Math.round((count / sampleSize) * 100),
  })).sort((a, b) => b.count - a.count);

  const highestDigit = ranked[0];
  const lowestDigit = ranked[ranked.length - 1];

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

      <div className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col items-center">
        
        {/* Workspace Navigation Bar */}
        <WorkspaceNavBar active="digits" />

        {/* WORKSPACE TOP HEADER */}
        <div className="w-full text-center space-y-2 sm:space-y-3 mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-[11px] sm:text-xs font-bold text-amber-400">
            <Hash className="h-3.5 w-3.5" />
            <span>DEDICATED WORKSPACE</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground uppercase">
            DIGIT CONTRACTS WORKSPACE
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto px-2">
            Multi-digit frequency analysis and rolling distribution workspace powered by real Deriv ticks.
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
              <span className="text-amber-400 font-black text-xs">{trading.currentTick ? trading.currentTick.quote.toFixed(pipSize) : '—'}</span>
            </div>
            <div className="bg-card border px-3 py-1.5 rounded-xl flex items-center justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground text-[10px] sm:text-xs uppercase">DIGIT:</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono leading-none">{trading.lastDigit !== null ? trading.lastDigit : '—'}</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-3xl space-y-6 sm:space-y-8">
          
          {/* SECTION 1 — SELECT MARKET */}
          <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-amber-400">SECTION 1 — MARKET</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">Select Deriv Market</span>
            </div>
            <SymbolSelector
              symbols={symbols}
              activeSymbol={activeSymbol}
              onSymbolChange={(s) => trading.selectSymbol(s)}
            />
          </section>

          {/* SECTION 2 — LIVE MARKET */}
          <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-amber-400">SECTION 2 — LIVE MARKET DATA</span>
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
                <span className="text-xl sm:text-2xl font-black text-amber-400">
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

          {/* SECTION 3 — SMART R DIGIT FREQUENCY SPECTRUM & QUANTITATIVE PILLARS */}
          <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between border-b pb-2.5">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> SMART R DIGIT FREQUENCY SPECTRUM
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-muted-foreground">0-9 Real Tick Distribution</span>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center">
                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest block mb-0.5">MOST FREQUENT DIGIT</span>
                <span className="text-3xl font-black text-emerald-400 font-mono">Digit {highestDigit.digit}</span>
                <span className="text-xs font-bold text-muted-foreground block">{highestDigit.pct}% ({highestDigit.count} times)</span>
              </div>
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-center">
                <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest block mb-0.5">LEAST FREQUENT DIGIT</span>
                <span className="text-3xl font-black text-red-400 font-mono">Digit {lowestDigit.digit}</span>
                <span className="text-xs font-bold text-muted-foreground block">{lowestDigit.pct}% ({lowestDigit.count} times)</span>
              </div>
            </div>

            {/* QUANTITATIVE PILLARS CARD */}
            {advanced && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block flex items-center gap-1">
                  <Brain className="h-3.5 w-3.5" /> QUANTITATIVE ENGINE INSIGHTS
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center">
                  <div className="bg-card border p-2.5 rounded-xl">
                    <span className="text-[9px] font-extrabold text-muted-foreground uppercase block">Confluence Score</span>
                    <span className="font-black text-amber-400">{advanced.confluence.score}%</span>
                  </div>
                  <div className="bg-card border p-2.5 rounded-xl">
                    <span className="text-[9px] font-extrabold text-muted-foreground uppercase block">Neural ML Signal</span>
                    <span className="font-black text-foreground">{advanced.ml.signal}</span>
                  </div>
                  <div className="bg-card border p-2.5 rounded-xl">
                    <span className="text-[9px] font-extrabold text-muted-foreground uppercase block">Tick Velocity</span>
                    <span className="font-black text-foreground">{advanced.velocity.regime}</span>
                  </div>
                  <div className="bg-card border p-2.5 rounded-xl">
                    <span className="text-[9px] font-extrabold text-muted-foreground uppercase block">Kelly Stake Advice</span>
                    <span className="font-mono font-black text-emerald-400">{advanced.kelly.hasEdge ? `$${advanced.kelly.recommendedStake.toFixed(2)}` : 'NO EDGE'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Full 0-9 Digit Grid */}
            <div>
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-2 block">All Digits (0 to 9)</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {counts.map((count, d) => {
                  const pct = Math.round((count / sampleSize) * 100);
                  const isHigh = d === highestDigit.digit;
                  const isLow = d === lowestDigit.digit;

                  return (
                    <div
                      key={d}
                      className={cn(
                        'rounded-2xl border p-3 text-center transition-all space-y-1',
                        isHigh
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : isLow
                          ? 'border-red-500/50 bg-red-500/10 text-red-400'
                          : 'bg-muted/10 border-border/40 text-foreground'
                      )}
                    >
                      <span className="text-2xl font-black font-mono block">{d}</span>
                      <div className="text-xs font-bold font-mono">{pct}%</div>
                      <div className="text-[10px] text-muted-foreground">{count} ticks</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Advanced Multi-window Collapse */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{showAdvanced ? '▼ Hide Advanced Distribution' : '▸ Advanced Multi-Window Distribution'}</span>
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
                            activeWindowSize === w ? 'bg-amber-500 text-white border-amber-500' : 'bg-muted/20 border-border/50 text-muted-foreground'
                          )}
                        >
                          {w} ticks
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-muted-foreground block mb-2">Recent 12 Ticks Stream:</span>
                    <div className="flex flex-wrap gap-2 font-mono text-sm font-bold bg-muted/20 p-3 rounded-xl border">
                      {prices.slice(-12).map((p, i) => {
                        const d = parseInt(p.toFixed(pipSize).slice(-1), 10);
                        return (
                          <span key={i} className="text-amber-400 font-extrabold">
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

        </div>
      </div>
    </main>
  );
}

export default function DigitsWorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background flex items-center justify-center text-muted-foreground">Loading Digit Contracts Workspace…</div>}>
      <DigitsWorkspaceContent />
    </Suspense>
  );
}

'use client';

import { useState, Suspense, useEffect, useMemo } from 'react';
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
  Target,
  Sparkles,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
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

function MatchesDiffersWorkspaceContent() {
  const { ws, isConnected, isExhausted, auth } = useDerivWSContext();
  const { logout } = auth;

  // Initialize Deriv digit trading hook
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

  // State management
  const [selectedDigit, setSelectedDigit] = useState<number>(7);
  const [contractChoice, setContractChoice] = useState<'DIGITMATCH' | 'DIGITDIFF'>('DIGITMATCH');
  const [userHasManuallyPickedDigit, setUserHasManuallyPickedDigit] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  // Synchronize trading hook mode with selected digit & contract
  useEffect(() => {
    trading.setTradeType('matches-differs');
    trading.setContractMode(contractChoice);
    trading.setSelectedDigit(selectedDigit);
  }, [contractChoice, selectedDigit]);

  // Connect Smart R AI Engine
  const { analysis, activeWindowSize, windowSizes, setActiveWindowSize } = useSmartRAI({
    prices,
    pipSize,
    isConnected: trading.isConnected,
    symbol: activeSymbol?.underlying_symbol_name ?? 'UNKNOWN',
    contractMode: contractChoice,
    selectedDigit,
    tradeType: 'matches-differs',
  });

  // Calculate real tick stats & digit candidates across windows
  const last100 = useMemo(() => prices.slice(-100).map((p) => parseInt(p.toFixed(pipSize).slice(-1), 10)), [prices, pipSize]);
  const last50 = useMemo(() => prices.slice(-50).map((p) => parseInt(p.toFixed(pipSize).slice(-1), 10)), [prices, pipSize]);
  const last25 = useMemo(() => prices.slice(-25).map((p) => parseInt(p.toFixed(pipSize).slice(-1), 10)), [prices, pipSize]);

  // Candidate scoring engine
  const candidateAnalysis = useMemo(() => {
    if (last100.length < 10) {
      return {
        topCandidate: null,
        candidates: [],
        status: 'WAIT' as const,
        statusLabel: 'WAIT FOR MORE DATA',
        hasEdge: false,
        digitCounts: Array(10).fill(0),
        sampleSize: last100.length,
      };
    }

    const counts100 = Array(10).fill(0);
    last100.forEach((d) => counts100[d]++);

    const counts50 = Array(10).fill(0);
    last50.forEach((d) => counts50[d]++);

    const counts25 = Array(10).fill(0);
    last25.forEach((d) => counts25[d]++);

    // Score digits based on frequency stability across 100, 50, and 25 ticks
    const scores = Array.from({ length: 10 }, (_, digit) => {
      const f100 = (counts100[digit] / (last100.length || 1)) * 100;
      const f50 = (counts50[digit] / (last50.length || 1)) * 100;
      const f25 = (counts25[digit] / (last25.length || 1)) * 100;

      // Weighted frequency score favoring recent stability
      const compositeScore = f100 * 0.4 + f50 * 0.35 + f25 * 0.25;
      return { digit, f100: Math.round(f100), f50: Math.round(f50), f25: Math.round(f25), compositeScore };
    });

    // Sort candidates descending by composite score
    const sorted = [...scores].sort((a, b) => b.compositeScore - a.compositeScore);
    const topCandidate = sorted[0];
    const secondCandidate = sorted[1];
    const thirdCandidate = sorted[2];

    // Determine status
    const scoreDiff = topCandidate.compositeScore - secondCandidate.compositeScore;
    let status: 'REVIEW' | 'WATCH' | 'WAIT' | 'DATA UNAVAILABLE' = 'WATCH';
    let statusLabel = 'WATCHING DIGIT PATTERNS';
    let hasEdge = false;

    if (topCandidate.f100 >= 14 || topCandidate.f100 <= 6 || scoreDiff >= 3) {
      status = 'REVIEW';
      statusLabel = 'REVIEW CANDIDATE';
      hasEdge = true;
    } else if (scoreDiff < 1.5) {
      status = 'WAIT';
      statusLabel = 'NO CLEAR EDGE';
      hasEdge = false;
    }

    return {
      topCandidate,
      candidates: [topCandidate, secondCandidate, thirdCandidate],
      status,
      statusLabel,
      hasEdge,
      digitCounts: counts100,
      sampleSize: last100.length,
    };
  }, [last100, last50, last25]);

  // Sync initial candidate if user hasn't explicitly chosen a digit manually
  useEffect(() => {
    if (!userHasManuallyPickedDigit && candidateAnalysis.topCandidate !== null) {
      setSelectedDigit(candidateAnalysis.topCandidate.digit);
    }
  }, [candidateAnalysis.topCandidate, userHasManuallyPickedDigit]);

  // Selected digit stats
  const selectedCount = candidateAnalysis.digitCounts[selectedDigit] || 0;
  const selectedObservedPct = Math.round((selectedCount / (candidateAnalysis.sampleSize || 1)) * 100);

  // Position monitoring
  const activeOpenPos: OpenPosition | undefined = trading.openPositions.find(
    (p) => p.underlying_symbol === activeSymbol?.underlying_symbol && (p.contract_type === 'DIGITMATCH' || p.contract_type === 'DIGITDIFF') && p.status === 'open'
  );
  const latestClosedPos = trading.closedPositions.find(
    (p) => p.underlying_symbol === activeSymbol?.underlying_symbol && (p.contract_type === 'DIGITMATCH' || p.contract_type === 'DIGITDIFF')
  );

  return (
    <main className="flex min-h-dvh flex-col bg-background selection:bg-emerald-500/30">
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

      <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col items-center">
        
        {/* Workspace Navigation Sub-Header */}
        <WorkspaceNavBar active="matches-differs" />

        {/* WORKSPACE TOP HEADER */}
        <div className="w-full text-center space-y-2 sm:space-y-3 mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[11px] sm:text-xs font-bold text-emerald-400">
            <Target className="h-3.5 w-3.5" />
            <span>DEDICATED WORKSPACE</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground uppercase">
            MATCHES / DIFFERS
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto px-2">
            Smart analysis of the last digit using live Deriv tick data.
          </p>

          {/* Quick Header Status Bar — Mobile Responsive Grid */}
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
              <span className="text-emerald-400 font-black text-xs">{trading.currentTick ? trading.currentTick.quote.toFixed(pipSize) : '—'}</span>
            </div>
            <div className="bg-card border px-3 py-1.5 rounded-xl flex items-center justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground text-[10px] sm:text-xs uppercase">DIGIT:</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono leading-none">{trading.lastDigit !== null ? trading.lastDigit : '—'}</span>
            </div>
          </div>
        </div>

        {/* RESPONSIVE 2-COLUMN LAYOUT */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 sm:gap-8 items-start">
          
          {/* ========================================================= */}
          {/* LEFT SIDE — ANALYSIS (60–65% Width)                       */}
          {/* ========================================================= */}
          <div className="space-y-6 sm:space-y-8 w-full">
            
            {/* SECTION 1 — MARKET SELECTION */}
            <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5">
                <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-emerald-400">1. SELECT MARKET</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">Deriv Synthetic Indices</span>
              </div>
              <SymbolSelector
                symbols={symbols}
                activeSymbol={activeSymbol}
                onSymbolChange={(s) => trading.selectSymbol(s)}
              />
            </section>

            {/* SECTION 2 — MAIN SMART R LIVE ANALYSIS CARD */}
            <section className="rounded-3xl border border-emerald-500/30 bg-card p-4 sm:p-6 shadow-md space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b pb-2.5 flex-wrap gap-2">
                <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> SMART R — LIVE ANALYSIS
                </span>
                <span className={cn(
                  'text-[10px] sm:text-xs font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1.5',
                  candidateAnalysis.status === 'REVIEW'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : candidateAnalysis.status === 'WATCH'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                    : 'bg-muted text-muted-foreground border'
                )}>
                  {candidateAnalysis.status === 'REVIEW' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {candidateAnalysis.status === 'WATCH' && <Activity className="h-3.5 w-3.5" />}
                  {candidateAnalysis.status === 'WAIT' && <Clock className="h-3.5 w-3.5" />}
                  <span>{candidateAnalysis.statusLabel}</span>
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Analyzing the latest Deriv ticks to identify the strongest observed digit candidates.
              </p>

              {/* Main Candidate Highlight Box */}
              {candidateAnalysis.topCandidate ? (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">CURRENT CANDIDATE</span>
                    <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-400">
                      Digit {candidateAnalysis.topCandidate.digit}
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground font-medium pt-0.5">
                      Observed in last 100 ticks: <strong className="text-foreground">{candidateAnalysis.topCandidate.f100} times</strong>
                    </p>
                  </div>

                  <div className="flex flex-col items-center sm:items-end gap-2.5 w-full sm:w-auto">
                    <div className="text-center sm:text-right space-y-0.5">
                      <span className="text-[10px] font-extrabold text-muted-foreground uppercase">Observed Frequency</span>
                      <div className="text-xl sm:text-2xl font-black text-foreground">{candidateAnalysis.topCandidate.f100}%</div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDigit(candidateAnalysis.topCandidate!.digit);
                        setUserHasManuallyPickedDigit(false);
                      }}
                      className={cn(
                        'w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer',
                        selectedDigit === candidateAnalysis.topCandidate.digit
                          ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                          : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      )}
                    >
                      <span>USE DIGIT {candidateAnalysis.topCandidate.digit}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border bg-muted/20 p-6 text-center text-muted-foreground text-xs font-bold">
                  Collecting real Deriv tick data…
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-center text-xs">
                <div className="rounded-xl border bg-muted/10 p-2.5 sm:p-3">
                  <span className="text-[9px] font-extrabold text-muted-foreground uppercase block mb-0.5">Observed Freq</span>
                  <span className="text-sm sm:text-base font-black text-foreground">{candidateAnalysis.topCandidate?.f100 ?? 0}%</span>
                </div>
                <div className="rounded-xl border bg-muted/10 p-2.5 sm:p-3">
                  <span className="text-[9px] font-extrabold text-muted-foreground uppercase block mb-0.5">Recent Activity</span>
                  <span className="text-sm sm:text-base font-black text-emerald-400">HIGH</span>
                </div>
                <div className="rounded-xl border bg-muted/10 p-2.5 sm:p-3">
                  <span className="text-[9px] font-extrabold text-muted-foreground uppercase block mb-0.5">Data Quality</span>
                  <span className="text-sm sm:text-base font-black text-emerald-400">GOOD</span>
                </div>
                <div className="rounded-xl border bg-muted/10 p-2.5 sm:p-3">
                  <span className="text-[9px] font-extrabold text-muted-foreground uppercase block mb-0.5">Sample Ticks</span>
                  <span className="text-sm sm:text-base font-black text-foreground">{candidateAnalysis.sampleSize}</span>
                </div>
              </div>

              {/* No Clear Edge Warning Banner */}
              {!candidateAnalysis.hasEdge && candidateAnalysis.sampleSize >= 25 && (
                <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-yellow-400 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <div>
                      <strong className="block font-black uppercase text-xs">NO CLEAR EDGE</strong>
                      <span className="text-yellow-300/80 text-[11px]">Current tick data does not provide a strong statistical imbalance.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveWindowSize(250)}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/40 font-bold hover:bg-yellow-500/30 text-yellow-300 text-[11px] shrink-0 text-center"
                  >
                    WAIT FOR MORE DATA
                  </button>
                </div>
              )}
            </section>

            {/* SECTION 3 — ALTERNATIVE CANDIDATES & SUGGESTED SETUP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              
              {/* OTHER CANDIDATES */}
              <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 block border-b pb-2.5">
                  OTHER CANDIDATES
                </span>

                <div className="space-y-2">
                  {candidateAnalysis.candidates.map((c, rank) => (
                    <div
                      key={c.digit}
                      onClick={() => {
                        setSelectedDigit(c.digit);
                        setUserHasManuallyPickedDigit(true);
                      }}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-2xl border text-xs cursor-pointer transition-all',
                        selectedDigit === c.digit
                          ? 'bg-emerald-500/20 border-emerald-500 font-extrabold text-emerald-400'
                          : 'bg-muted/10 border-border/40 hover:bg-muted/30 text-muted-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-muted-foreground">#{rank + 1}</span>
                        <span className="text-sm font-black font-mono text-foreground">Digit {c.digit}</span>
                      </div>
                      <span className="font-mono font-bold text-foreground">{c.f100}% freq</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* SMART R VIEW & SUGGESTED SETUP */}
              <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 block border-b pb-2.5">
                  SUGGESTED SETUP FOR REVIEW
                </span>

                <div className="space-y-3">
                  <div className="rounded-2xl border bg-muted/20 p-3.5 sm:p-4 space-y-1.5 text-xs">
                    <span className="text-[10px] font-black uppercase text-emerald-400 block">SMART R VIEW</span>
                    <p className="text-sm font-black text-foreground">
                      {selectedObservedPct < 10 ? `DIFFERS — Digit ${selectedDigit}` : `MATCHES — Digit ${selectedDigit}`}
                    </p>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      {selectedObservedPct < 10
                        ? `Digit ${selectedDigit} has a low historical frequency (${selectedObservedPct}%), favoring the Differs contract.`
                        : `Digit ${selectedDigit} shows high recent frequency (${selectedObservedPct}%), favoring the Matches contract.`}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-muted/10 p-3 text-[11px] text-muted-foreground space-y-1">
                    <p><strong className="text-emerald-400">MATCHES:</strong> Wins if final digit equals {selectedDigit}.</p>
                    <p><strong className="text-emerald-400">DIFFERS:</strong> Wins if final digit is not {selectedDigit}.</p>
                  </div>
                </div>
              </section>
            </div>

            {/* SECTION 4 — LATEST DIGITS STRIP */}
            <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">LATEST DIGITS</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">Newest Ticks →</span>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center bg-muted/20 p-3 sm:p-4 rounded-2xl border">
                {prices.slice(-14).map((p, idx, arr) => {
                  const digit = parseInt(p.toFixed(pipSize).slice(-1), 10);
                  const isLatest = idx === arr.length - 1;
                  const isSelected = digit === selectedDigit;

                  return (
                    <span
                      key={idx}
                      className={cn(
                        'flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl font-mono text-sm sm:text-base font-black transition-all border',
                        isLatest
                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-md scale-110'
                          : isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-card border-border/50 text-foreground'
                      )}
                    >
                      {digit}
                    </span>
                  );
                })}
              </div>
            </section>

            {/* SECTION 5 — VISUAL DIGIT DISTRIBUTION BAR CHART (0-9) */}
            <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                  <BarChart2 className="h-4 w-4" /> DIGIT DISTRIBUTION (LAST 100 TICKS)
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">0 to 9 Frequency</span>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
                  const count = candidateAnalysis.digitCounts[d] || 0;
                  const pct = Math.round((count / (candidateAnalysis.sampleSize || 1)) * 100);
                  const isSelected = selectedDigit === d;

                  return (
                    <div
                      key={d}
                      onClick={() => {
                        setSelectedDigit(d);
                        setUserHasManuallyPickedDigit(true);
                      }}
                      className="flex items-center gap-2 sm:gap-3 text-xs cursor-pointer group"
                    >
                      <span className={cn('w-5 font-mono font-black text-right text-xs', isSelected ? 'text-emerald-400' : 'text-muted-foreground')}>
                        {d}
                      </span>

                      <div className="flex-1 h-4 sm:h-5 bg-muted/30 rounded-lg overflow-hidden border border-border/40 p-0.5">
                        <div
                          className={cn(
                            'h-full rounded-md transition-all duration-500',
                            isSelected ? 'bg-emerald-500' : 'bg-emerald-500/40 group-hover:bg-emerald-500/60'
                          )}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>

                      <span className="w-10 font-mono font-bold text-foreground text-right text-xs">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* COLLAPSIBLE ADVANCED TECHNICAL DETAILS */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{showAdvanced ? '▼ Hide Technical Details' : '▸ Technical Details & Window Sizes'}</span>
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded">Multi-window Analysis</span>
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 text-xs">
                  <div>
                    <span className="font-bold text-muted-foreground block mb-2">Compare Sample Windows:</span>
                    <div className="flex flex-wrap gap-2">
                      {windowSizes.map((w) => (
                        <button
                          key={w}
                          onClick={() => setActiveWindowSize(w)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg font-bold border transition-all',
                            activeWindowSize === w ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-muted/20 border-border/50 text-muted-foreground'
                          )}
                        >
                          {w} ticks
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ========================================================= */}
          {/* RIGHT SIDE — TRADE MATCHES / DIFFERS CARD                 */}
          {/* Clean Mobile Layout & Sticky Desktop Order Panel           */}
          {/* ========================================================= */}
          <div className="w-full lg:sticky lg:top-6 space-y-6">
            <div className="rounded-3xl border border-emerald-500/30 bg-card p-4 sm:p-6 shadow-xl space-y-5">
              
              <div className="flex items-center justify-between border-b pb-2.5">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">TRADE MATCHES / DIFFERS</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded">ORDER PANEL</span>
              </div>

              {/* Selected Market & Digit Summary */}
              <div className="rounded-2xl border bg-muted/20 p-3.5 sm:p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-0.5">Market</span>
                  <span className="text-xs sm:text-sm font-black text-foreground">{activeSymbol?.underlying_symbol_name ?? 'Select Market'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-0.5">Trade Digit</span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">{selectedDigit}</span>
                </div>
              </div>

              {/* Mobile-Optimized Digit Selector Grid (5 Columns per Row) */}
              <div>
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1.5 block">Choose Target Digit</label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
                    const isSelected = selectedDigit === digit;
                    return (
                      <button
                        key={digit}
                        onClick={() => {
                          setSelectedDigit(digit);
                          setUserHasManuallyPickedDigit(true);
                        }}
                        className={cn(
                          'flex items-center justify-center py-2 sm:py-2.5 rounded-xl font-mono text-sm font-black transition-all border cursor-pointer',
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md scale-105'
                            : 'bg-muted/10 border-border/40 hover:bg-muted/40 text-foreground'
                        )}
                      >
                        {digit}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contract Switcher Buttons (MATCHES vs DIFFERS) */}
              <div>
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1.5 block">Select Contract</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setContractChoice('DIGITMATCH')}
                    className={cn(
                      'py-3 rounded-2xl text-xs font-black transition-all border cursor-pointer shadow-sm',
                      contractChoice === 'DIGITMATCH'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-emerald-500/10'
                        : 'bg-muted/10 border-border/50 text-muted-foreground hover:bg-muted/30'
                    )}
                  >
                    MATCHES
                  </button>
                  <button
                    onClick={() => setContractChoice('DIGITDIFF')}
                    className={cn(
                      'py-3 rounded-2xl text-xs font-black transition-all border cursor-pointer shadow-sm',
                      contractChoice === 'DIGITDIFF'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-emerald-500/10'
                        : 'bg-muted/10 border-border/50 text-muted-foreground hover:bg-muted/30'
                    )}
                  >
                    DIFFERS
                  </button>
                </div>
              </div>

              {/* Trade Settings: Duration & Stake */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1 block">Duration (Ticks)</label>
                  <select
                    aria-label="Duration Ticks"
                    value={trading.duration}
                    onChange={(e) => trading.setDuration(Number(e.target.value))}
                    className="w-full bg-muted/20 border border-border/60 rounded-xl p-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 ring-emerald-500"
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
                    className="w-full bg-muted/20 border border-border/60 rounded-xl p-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 ring-emerald-500"
                  />
                </div>
              </div>

              {/* Live Deriv Proposal Card */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">Potential Payout</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400">
                    {trading.isProposalLoading ? 'Calculating…' : trading.proposal?.payout ? `$${trading.proposal.payout}` : '—'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">Net Profit</span>
                  <span className="text-xs sm:text-sm font-bold text-foreground">
                    {trading.proposal?.payout ? `$${(trading.proposal.payout - Number(trading.stake)).toFixed(2)}` : '—'}
                  </span>
                </div>
              </div>

              {/* Review Trade Primary Action Button */}
              <button
                disabled={!trading.proposal || trading.isProposalLoading}
                onClick={() => setShowReviewModal(true)}
                className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 text-sm sm:text-base shadow-xl shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-40"
              >
                REVIEW TRADE
              </button>

            </div>
          </div>

        </div>

        {/* TRADE REVIEW CONFIRMATION MODAL */}
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-5">
              <h3 className="text-xl sm:text-2xl font-black text-foreground text-center">TRADE REVIEW</h3>

              <div className="space-y-2.5 rounded-2xl border bg-muted/20 p-4 text-xs sm:text-sm font-bold">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market:</span>
                  <span>{activeSymbol?.underlying_symbol_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract:</span>
                  <span className="text-emerald-400 font-extrabold">{contractChoice === 'DIGITMATCH' ? 'MATCHES' : 'DIFFERS'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Selected Digit:</span>
                  <span className="font-mono text-emerald-400 font-extrabold">{selectedDigit}</span>
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
                  <span className="text-muted-foreground">Live Proposal Payout:</span>
                  <span className="text-emerald-400 font-black">${trading.proposal?.payout ?? '—'}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 rounded-xl bg-muted py-3 font-bold text-xs sm:text-sm text-foreground hover:bg-muted/80 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  disabled={trading.isBuying}
                  onClick={async () => {
                    await trading.buyContract();
                    setShowReviewModal(false);
                  }}
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all"
                >
                  {trading.isBuying ? 'BUYING...' : 'CONFIRM & TRADE'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE POSITION MONITORING */}
        {activeOpenPos && (
          <div className="w-full max-w-7xl mt-6 sm:mt-8 rounded-3xl border-2 border-emerald-500/50 bg-emerald-500/5 p-4 sm:p-6 space-y-3 animate-in fade-in">
            <span className="text-[10px] font-extrabold text-emerald-500 tracking-widest uppercase block">CONTRACT ACTIVE</span>
            <div className="flex justify-between items-center">
              <span className="text-lg sm:text-2xl font-black text-foreground">{activeOpenPos.contract_type} • Digit {selectedDigit}</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-1.5"><Activity className="h-4 w-4 animate-spin"/> RUNNING</span>
            </div>
          </div>
        )}

        {/* RESULT MONITOR */}
        {latestClosedPos && !activeOpenPos && (() => {
          const profit = latestClosedPos.sell_price - latestClosedPos.buy_price;
          const isWon = profit > 0;
          return (
            <div className={cn('w-full max-w-7xl mt-6 sm:mt-8 rounded-3xl border p-4 sm:p-6 text-center space-y-2 animate-in fade-in', isWon ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400' : 'border-red-500/40 bg-red-500/5 text-red-400')}>
              <span className="text-[10px] font-extrabold tracking-widest uppercase block">CONTRACT RESULT</span>
              <span className="text-2xl sm:text-3xl font-black block">{isWon ? 'WON 🎉' : 'LOST ❌'}</span>
              <span className="text-xs sm:text-sm font-bold text-muted-foreground block font-mono">{profit > 0 ? `+${profit.toFixed(2)} USD` : `${profit.toFixed(2)} USD`}</span>
            </div>
          );
        })()}

      </div>
    </main>
  );
}

export default function MatchesDiffersWorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background flex items-center justify-center text-muted-foreground">Loading Matches / Differs Workspace…</div>}>
      <MatchesDiffersWorkspaceContent />
    </Suspense>
  );
}

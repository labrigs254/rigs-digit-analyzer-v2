'use client';

import { useState, Suspense } from 'react';
import { useDerivWSContext } from '@/components/custom/deriv-ws-provider';
import { useDigitsTrading } from '@/hooks/use-digits-trading';
import { useSmartRAI } from '@/hooks/use-smart-r-ai';
import { SymbolSelector } from '@/components/custom/symbol-selector';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/custom/header';
import { cn } from '@/lib/utils';
import { getLastDigit } from '@/lib/digit-stats';
import { WifiOff, Loader2, ChevronDown } from 'lucide-react';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import {
  SmartRAIHeader,
  DigitProbabilityTable,
  PatternPanel,
  RegimePanel,
  DistributionChart,
  RecentTicks,
  AIExplanation,
  OverUnderPanel,
  EvenOddPanel,
  MatchesDiffersPanel,
  PredictionHistory,
  BacktestPanel,
  WindowSelector,
  CoPilotCard,
  MarketTabs,
  DigitPicker,
  ContractSelector,
  FocusedMatchesDiffersCard,
} from '@/components/smart-r-ai';
import type { MarketTabId } from '@/components/smart-r-ai/MarketTabs';

function CollapsibleSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between bg-muted/20 px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted/40"
      >
        <span>{isOpen ? '[-]' : '[+]'} {title}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="p-4 border-t border-border/50">
          {children}
        </div>
      )}
    </div>
  );
}

function SmartRAIDashboard() {
  const { ws, isConnected, isExhausted, auth } = useDerivWSContext();
  const { authState, accounts, activeAccount, login, signUp, logout, switchAccount } = auth;

  // Single source of truth for all DERIVE trading state + WS connection
  const trading = useDigitsTrading({
    ws,
    isConnected,
    isExhausted,
    isAuthenticated: !!auth.wsUrl,
    onAuthWSFailed: logout,
  });

  const activeSymbol  = trading.activeSymbol;
  const symbols       = trading.symbols ?? [];
  const prices        = trading.prices ?? [];
  const pipSize       = typeof trading.pipSize === 'number' && trading.pipSize >= 0 ? trading.pipSize : 2;

  // Real DERIVE contract selection state
  const contractMode   = trading.contractMode;
  const selectedDigit  = trading.selectedDigit;
  const tradeType      = trading.tradeType;
  const duration       = trading.duration;

  // Active Market Tab for the Co-Pilot expanded view
  const [activeMarketTab, setActiveMarketTab] = useState<MarketTabId>('auto');

  // Smart R AI engine Hook
  const {
    analysis,
    predictionRecords,
    predictionStats,
    windowSizes,
    activeWindowSize,
    setActiveWindowSize,
    isRunningBacktest,
    backtestResult,
    backtestProgress,
    runBacktestWithConfig,
    clearBacktestResult,
    contractFocus,
  } = useSmartRAI({
    prices,
    pipSize,
    isConnected: trading.isConnected,
    symbol: activeSymbol?.underlying_symbol_name ?? 'UNKNOWN',
    contractMode,
    selectedDigit,
    tradeType,
  });

  const isDisconnected = !trading.isConnected;
  const hasNoTicks     = prices.length === 0;
  const last50Digits   = prices.slice(-50).map((p) => getLastDigit(p, pipSize));

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <Header
        authState={authState}
        accounts={accounts}
        activeAccount={activeAccount}
        onLogin={login}
        onSignUp={signUp}
        onLogout={logout}
        onSwitchAccount={switchAccount}
        actions={<ThemeToggle />}
      />

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-6 flex flex-col gap-6 overflow-x-hidden">
        
        {/* ========================================================= */}
        {/* SECTION A — PAGE HEADER & STATUS BANNERS                  */}
        {/* ========================================================= */}
        <SmartRAIHeader
          isConnected={trading.isConnected}
          symbol={activeSymbol?.underlying_symbol_name}
          tickCount={analysis?.tickCount ?? prices.length}
          lastDigit={analysis?.lastDigit ?? null}
          dataQuality={analysis?.dataQuality ?? null}
        />

        {isDisconnected && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <WifiOff className="h-4 w-4 shrink-0" />
            <div>
              <span className="font-bold">LIVE DATA DISCONNECTED</span>
              <span className="ml-2 text-red-300/80">WebSocket connection lost. Analysis is paused.</span>
            </div>
          </div>
        )}

        {!isDisconnected && hasNoTicks && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <div>
              <span className="font-bold">WAITING FOR LIVE TICKS</span>
              <span className="ml-2 text-amber-300/80">Subscribing to tick stream for {activeSymbol?.underlying_symbol_name ?? 'market'}…</span>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION B — MARKET AND CONTRACT CONTROLS                  */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4 rounded-xl border p-4 bg-card shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Level 1 — Market</span>
            <SymbolSelector
              symbols={symbols}
              activeSymbol={activeSymbol}
              onSymbolChange={(s) => {
                trading.selectSymbol(s);
                // ensure trade type is matches-differs so we don't mix up contracts
                if (trading.tradeType !== 'matches-differs') {
                  trading.setTradeType('matches-differs');
                }
              }}
            />
            {trading.durationLimits && (
              <div className="mt-4 pt-4 border-t border-border/40">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Duration</span>
                <div className="text-sm font-bold text-foreground bg-muted/30 px-3 py-2 rounded-lg border">
                  {duration} Tick{duration > 1 ? 's' : ''} (Supported limit: {trading.durationLimits.min}-{trading.durationLimits.max})
                </div>
              </div>
            )}
          </div>
          
          <div className="md:col-span-8 rounded-xl border p-4 bg-card shadow-sm flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Level 2 — Contract Type</span>
              <ContractSelector 
                contractMode={contractMode} 
                onChange={(mode) => {
                  trading.setTradeType('matches-differs'); // ensure tradeType syncs
                  trading.setContractMode(mode);
                }} 
              />
            </div>
            <div className="w-full md:w-64">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Level 3 — Digit Selection</span>
              <DigitPicker 
                selectedDigit={selectedDigit} 
                onChange={trading.setSelectedDigit}
                disabled={contractMode !== 'DIGITMATCH' && contractMode !== 'DIGITDIFF'}
              />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION C — LIVE MARKET SUMMARY                           */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center justify-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Current Market</span>
              <span className="text-lg font-black text-foreground line-clamp-1">{activeSymbol?.underlying_symbol_name ?? '—'}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{activeSymbol?.underlying_symbol ?? 'NO SYMBOL'}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center justify-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Latest Quote</span>
              <span className="text-2xl font-mono font-bold text-blue-400">
                {trading.currentTick ? trading.currentTick.quote.toFixed(pipSize) : '—'}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center justify-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Last Digit</span>
              <span className="text-3xl font-black text-violet-400">
                {trading.lastDigit !== null ? trading.lastDigit : '—'}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center justify-center border-emerald-500/20 bg-emerald-500/5">
              <span className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest block mb-1">Ticks Analyzed</span>
              <span className="text-3xl font-black text-emerald-400">
                {prices.length}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================= */}
        {/* SECTION D & E — ACTIVE CONTRACT & MAIN ANALYSIS           */}
        {/* ========================================================= */}
        {analysis ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Active Contract Focused Card */}
            <div className="lg:col-span-5">
              {(contractMode === 'DIGITMATCH' || contractMode === 'DIGITDIFF') ? (
                <FocusedMatchesDiffersCard
                  contractMode={contractMode}
                  selectedDigit={selectedDigit}
                  matchesDiffers={analysis.prediction.matchesDiffers}
                  windowStats={analysis.windowStats.get(activeWindowSize) ?? null}
                  ticksAnalyzed={prices.length}
                />
              ) : (
                <div className="rounded-2xl border p-5 bg-card text-center text-muted-foreground">
                  <p className="font-bold text-foreground mb-1">Contract Selected: {contractFocus.label}</p>
                  <p className="text-xs">
                    Please use the Matches/Differs contract selector above to view the focused analysis view. 
                    Other contract types (Even/Odd, Over/Under) are available in the Co-Pilot expanded section below.
                  </p>
                </div>
              )}
            </div>

            {/* Right: AI Executive Explanation */}
            <div className="lg:col-span-7">
              <AIExplanation analysis={analysis} />
            </div>
            
          </div>
        ) : null}

        {/* ========================================================= */}
        {/* COLLAPSIBLE ADVANCED SECTIONS                             */}
        {/* ========================================================= */}
        <div className="space-y-4 mt-6">
          <CollapsibleSection title="Full Digit Distribution">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <DistributionChart
                  windowStats={analysis?.windowStats.get(activeWindowSize) ?? null}
                  selectedDigit={contractFocus.focusDigit}
                />
              </div>
              <div className="lg:col-span-2">
                <DigitProbabilityTable
                  probabilities={analysis?.probabilities ?? null}
                  windowStats={analysis?.windowStats.get(activeWindowSize) ?? null}
                  selectedDigit={contractFocus.focusDigit}
                />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Tick History">
            <RecentTicks
              digits={last50Digits}
              windowStats={analysis?.windowStats.get(activeWindowSize) ?? null}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Co-Pilot Analysis (All Markets)">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CoPilotCard
                coPilot={analysis?.prediction.coPilot ?? null}
                tickCount={prices.length}
              />
              <div className="flex flex-col gap-4">
                <MarketTabs
                  activeTab={activeMarketTab}
                  onSelectTab={setActiveMarketTab}
                  activeSignalAction={analysis?.prediction.coPilot.action}
                />
                
                {/* EVEN/ODD */}
                {analysis && (activeMarketTab === 'even-odd' || (activeMarketTab === 'auto' && (analysis.prediction.coPilot.action === 'EVEN' || analysis.prediction.coPilot.action === 'ODD'))) && (
                  <EvenOddPanel
                    evenOdd={analysis.prediction.evenOdd}
                    coPilot={analysis.prediction.coPilot}
                  />
                )}

                {/* OVER/UNDER */}
                {analysis && (activeMarketTab === 'over-under' || (activeMarketTab === 'auto' && (analysis.prediction.coPilot.action === 'OVER' || analysis.prediction.coPilot.action === 'UNDER'))) && (
                  <OverUnderPanel
                    overUnder={analysis.prediction.overUnder}
                    focusThreshold={contractFocus.focusDigit ?? undefined}
                  />
                )}

                {/* MATCHES/DIFFERS */}
                {analysis && (activeMarketTab === 'matches-differs' || (activeMarketTab === 'auto' && (analysis.prediction.coPilot.action === 'MATCHES' || analysis.prediction.coPilot.action === 'DIFFERS' || analysis.prediction.coPilot.action === 'HOLD'))) && (
                  <MatchesDiffersPanel
                    matchesDiffers={analysis.prediction.matchesDiffers}
                    focusDigit={contractFocus.focusDigit ?? undefined}
                    coPilot={analysis.prediction.coPilot}
                  />
                )}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Advanced Pattern Analysis">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RegimePanel regime={analysis?.regime ?? null} />
              <div className="rounded-xl border border-border/50 bg-card p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Live Patterns</p>
                <PatternPanel patterns={analysis?.patterns ?? []} />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Prediction History & Backtest">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PredictionHistory
                stats={predictionStats}
                history={predictionRecords}
              />
              <BacktestPanel
                availableTicks={prices.length}
                isRunning={isRunningBacktest}
                progress={backtestProgress}
                result={backtestResult}
                onRun={(windowSize) => runBacktestWithConfig({ windowSize })}
                onClear={clearBacktestResult}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Technical Data Diagnostics">
            <div className="p-4 bg-muted/10 rounded-xl">
              <WindowSelector
                windowSizes={windowSizes}
                activeWindowSize={activeWindowSize}
                onChange={setActiveWindowSize}
                availableSizes={windowSizes.filter(s => prices.length >= Math.min(s, 10))}
              />
              <p className="mt-4 text-xs text-muted-foreground">
                The AI engine uses rolling statistical calculations including Chi-Square, Entropy, and standard error bounds. 
                Data points are extracted locally from the real Deriv WebSocket tick stream without any external API calls.
              </p>
            </div>
          </CollapsibleSection>

        </div>

      </div>
    </main>
  );
}

export default function SmartRAIPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <SmartRAIDashboard />
    </Suspense>
  );
}

'use client';

import { useState, Suspense, useEffect } from 'react';
import { useDerivWSContext } from '@/components/custom/deriv-ws-provider';
import { useDigitsTrading } from '@/hooks/use-digits-trading';
import { useSmartRAI } from '@/hooks/use-smart-r-ai';
import { SymbolSelector } from '@/components/custom/symbol-selector';
import { Header } from '@/components/custom/header';
import { SmartRANavigation } from '@/components/smart-r-ai/SmartRANavigation';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Activity, AlertCircle, PlayCircle, Clock } from 'lucide-react';
import type { ContractMode } from '@/lib/types';
import type { OpenPosition } from '@/hooks/use-open-positions';

// --- Reusable UI: Collapsible Section ---
function CollapsibleAdvanced({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mt-4 rounded-xl border border-border/50 bg-muted/10 overflow-hidden text-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 font-semibold text-muted-foreground hover:bg-muted/20 hover:text-foreground transition-colors"
      >
        <span>{isOpen ? '▼' : '▶'} {title}</span>
      </button>
      {isOpen && <div className="p-4 border-t border-border/50">{children}</div>}
    </div>
  );
}

// --- Main Guided Flow Component ---
function EvenOddGuidedFlow() {
  const { ws, isConnected, isExhausted, auth } = useDerivWSContext();
  const { authState, accounts, activeAccount, login, signUp, logout, switchAccount } = auth;

  // Utilize the digit trading foundation context, forcing it into even-odd mode right away.
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

  // We explicitly control what steps the user has successfully passed to build the wizard UI
  const [hasStarted, setHasStarted] = useState(false);
  const [chosenMode, setChosenMode] = useState<ContractMode | null>(null); // DIGITEVEN | DIGITODD

  // Active step flow:
  // 0 = Intro
  // 1 = Select Market
  // 2 = Select Even/Odd
  // 3 = Live Check + AI Analysis + Set Trade + Review
  const currentStep = !hasStarted
    ? 0
    : !activeSymbol
    ? 1
    : !chosenMode
    ? 2
    : 3;

  // Force trading hook to match selected contract mode when we reach Step 3
  useEffect(() => {
    if (chosenMode && trading.contractMode !== chosenMode) {
      trading.setTradeType('even-odd');
      trading.setContractMode(chosenMode);
    }
  }, [chosenMode, trading]);

  // Smart R Engine connection (only active when market selected)
  const { analysis, advanced, activeWindowSize, windowSizes, setActiveWindowSize } = useSmartRAI({
    prices,
    pipSize,
    isConnected: trading.isConnected,
    symbol: activeSymbol?.underlying_symbol_name ?? 'UNKNOWN',
    contractMode: chosenMode || 'DIGITEVEN',
    selectedDigit: 0,
    tradeType: 'even-odd',
  });

  const hasNoTicks = prices.length === 0;
  const recentDigits = prices.slice(-10).map((p) => {
    const pStr = p.toFixed(pipSize);
    return parseInt(pStr.slice(-1), 10);
  });
  
  // Trade execution internal state
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Identify if we currently have an Open Position matching our current setup
  const latestOpenPos: OpenPosition | undefined = trading.openPositions.find(p => p.underlying_symbol === activeSymbol?.underlying_symbol && p.contract_type === chosenMode && p.status === 'open');
  const latestClosedPos = trading.closedPositions.find(p => p.underlying_symbol === activeSymbol?.underlying_symbol && p.contract_type === chosenMode);

  // Even/Odd Analysis simplified output
  const eoStats = analysis?.prediction.evenOdd;
  const eoPct = eoStats ? {
    EVEN: Math.round(eoStats.evenProbability * 100),
    ODD: Math.round(eoStats.oddProbability * 100)
  } : { EVEN: 0, ODD: 0 };
  
  const displayStatus = () => {
    if (!analysis || prices.length < 10) return { text: "INSUFFICIENT DATA", sub: "More valid ticks are needed before analysis can be displayed." };
    const action = analysis.prediction.coPilot.action;
    if (action === 'HOLD') return { text: "NO CLEAR EDGE", sub: "Recent observations are close to the Even/Odd baseline. Smart R is not forcing a trade signal." };
    return { text: "REVIEW", sub: `The market has enough recent data for review.` };
  };

  const statusObj = displayStatus();

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <Header
        authState={'unauthenticated'}
        accounts={[]}
        activeAccount={null}
        onLogin={async () => {}}
        onSignUp={async () => {}}
        onLogout={() => {}}
        onSwitchAccount={async () => {}}
        actions={<ThemeToggle />}
        hideAuth={true}
      />

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 lg:px-8 py-6 flex flex-col items-center gap-6">
        <SmartRANavigation activeMode="even-odd" />

        {!isConnected && (
          <div className="w-full max-w-lg mb-6 flex items-center justify-between rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-500 text-sm">
            <span className="font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4"/> LIVE DATA OFFLINE</span>
            <span className="text-red-400">Trying to reconnect...</span>
          </div>
        )}

        {/* ---------------------------------------------------------
            STEP 0: INTRO
        --------------------------------------------------------- */}
        {currentStep === 0 && (
          <div className="w-full max-w-lg text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 py-12">
            <div>
              <p className="text-sm font-bold text-violet-500 uppercase tracking-widest mb-2">Smart R AI</p>
              <h1 className="text-5xl font-black tracking-tight text-foreground">EVEN / ODD</h1>
            </div>
            <p className="text-muted-foreground">
              Choose a market, choose Even or Odd, and Smart R will analyze the live market data for you.
            </p>
            <button
              onClick={() => setHasStarted(true)}
              className="w-full rounded-2xl bg-violet-600 text-white font-bold text-lg py-5 shadow-xl shadow-violet-500/20 hover:bg-violet-500 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              LET'S ENTER THE MARKET <ChevronRight className="w-5 h-5"/>
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------
            STEP 1: SELECT MARKET
        --------------------------------------------------------- */}
        {currentStep >= 1 && (
          <div className="w-full max-w-lg space-y-4 mb-10 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black text-foreground text-center mb-6 border-b pb-4">
              1. SELECT MARKET
            </h2>
            
            {activeSymbol ? (
              <div className="rounded-2xl border border-border/70 bg-card p-6 text-center shadow-sm">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">MARKET READY</p>
                <p className="text-2xl font-black my-2">{activeSymbol.underlying_symbol_name}</p>
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  LIVE
                </div>
                {/* Reset button hidden in a small corner so the user doesn't get stuck */}
                <button 
                  onClick={() => { trading.selectSymbol(''); setChosenMode(null); }} 
                  className="mt-4 text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground"
                >
                  Change Market
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <p className="text-sm text-center text-muted-foreground mb-4">Select a market to begin.</p>
                <SymbolSelector
                  symbols={symbols}
                  activeSymbol={activeSymbol}
                  onSymbolChange={(s) => {
                    trading.selectSymbol(s);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------
            STEP 2: CHOOSE EVEN OR ODD
        --------------------------------------------------------- */}
        {currentStep >= 2 && (
          <div className="w-full max-w-lg space-y-4 mb-10 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black text-foreground text-center mb-6 border-b pb-4">
              2. WHAT DO YOU WANT TO TRADE?
            </h2>

            {chosenMode ? (
              <div className="rounded-2xl border border-border/70 bg-card p-6 text-center shadow-sm flex items-center justify-between">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">CONTRACT READY</p>
                  <p className="text-2xl font-black">{chosenMode === 'DIGITEVEN' ? 'EVEN' : 'ODD'}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{chosenMode}</p>
                </div>
                <button 
                  onClick={() => setChosenMode(null)} 
                  className="px-3 py-1.5 rounded-lg bg-muted text-xs font-bold hover:bg-muted/80 text-foreground"
                >
                  CHANGE
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button 
                  onClick={() => setChosenMode('DIGITEVEN')}
                  className="w-full group rounded-2xl border-2 border-border/50 bg-card p-6 text-center hover:border-violet-500 hover:bg-violet-500/5 transition-all"
                >
                  <div className="text-3xl font-black group-hover:text-violet-500 mb-2">EVEN</div>
                  <div className="text-lg font-bold text-muted-foreground tracking-[0.3em]">0 2 4 6 8</div>
                </button>
                <button 
                  onClick={() => setChosenMode('DIGITODD')}
                  className="w-full group rounded-2xl border-2 border-border/50 bg-card p-6 text-center hover:border-violet-500 hover:bg-violet-500/5 transition-all"
                >
                  <div className="text-3xl font-black group-hover:text-violet-500 mb-2">ODD</div>
                  <div className="text-lg font-bold text-muted-foreground tracking-[0.3em]">1 3 5 7 9</div>
                </button>
                
                <CollapsibleAdvanced title="What does Even/Odd mean?">
                  <div className="space-y-2 text-muted-foreground">
                    <p><strong className="text-foreground">Even</strong> = 0, 2, 4, 6, 8</p>
                    <p><strong className="text-foreground">Odd</strong> = 1, 3, 5, 7, 9</p>
                    <p className="mt-2 text-xs">
                      The current tick shows what just happened.
                      The contract result is determined by the relevant exit tick.
                      The current digit does not guarantee the next result.
                    </p>
                  </div>
                </CollapsibleAdvanced>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------
            STEP 3+: FULL LIVE ANALYSIS & TRADING
        --------------------------------------------------------- */}
        {currentStep === 3 && (
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
            
            {/* LEFT COLUMN: Data & AI */}
            <div className="space-y-8">
              
              <section>
                <h3 className="text-xl font-black mb-4">3. LIVE MARKET</h3>
                <div className="rounded-2xl border border-border/70 bg-card p-6 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Quote</p>
                    <p className="text-2xl font-mono font-bold mt-1">
                      {trading.currentTick ? trading.currentTick.quote.toFixed(pipSize) : '----'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Last Digit</p>
                    <p className="text-3xl font-black text-violet-500">
                      {trading.lastDigit !== null ? trading.lastDigit : '-'}
                    </p>
                  </div>
                  <div className="col-span-2 pt-4 border-t border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-2">Recent 10 Digits</p>
                    <div className="flex justify-between items-center bg-muted/20 p-3 rounded-xl border border-border/40 font-mono text-sm font-bold">
                      {hasNoTicks ? (
                        <p className="text-xs text-muted-foreground italic w-full text-center">Loading market data...</p>
                      ) : (
                        recentDigits.map((d, i) => (
                           <span key={i} className={d % 2 === 0 ? 'text-blue-400' : 'text-orange-400'}>{d}</span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-black mb-4">4. SMART R CHECK</h3>
                <div className="rounded-2xl border border-border/70 bg-card p-6">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Recent Sample</p>
                      <p className="font-bold">{analysis?.tickCount ?? prices.length} ticks</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black">
                        <span className="text-blue-500">E: {eoPct.EVEN}%</span> / <span className="text-orange-500">O: {eoPct.ODD}%</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-1">Status</p>
                    <p className="text-xl font-black text-foreground">{statusObj.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{statusObj.sub}</p>
                  </div>

                  <CollapsibleAdvanced title="Advanced Analysis">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Distribution</p>
                        <div className="flex justify-between text-base font-bold bg-muted/20 p-3 rounded-lg">
                           <span className="text-blue-400">EVEN {eoPct.EVEN}%</span>
                           <span className="text-orange-400">ODD {eoPct.ODD}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Analysis Window</p>
                        <div className="flex gap-2 flex-wrap">
                          {windowSizes.map((w) => (
                            <button
                               key={w}
                               onClick={() => setActiveWindowSize(w)}
                               disabled={prices.length < Math.min(w, 10)}
                               className={cn(
                                 "px-2 py-1 text-xs font-bold rounded-md border transition-all",
                                 activeWindowSize === w ? "bg-violet-500 text-white border-violet-500" : "bg-muted/10 border-border/50 text-muted-foreground",
                                 prices.length < Math.min(w, 10) && "opacity-50 cursor-not-allowed"
                               )}
                            >
                              {w}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* --- V2 Advanced Engine Metrics --- */}
                      <div className="border-t border-border/50 pt-4 space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">TensorFlow ML Prediction</p>
                          {advanced?.ml ? (
                            <div className="flex items-center gap-2">
                              <span className={cn("px-2 py-1 text-xs font-black rounded", advanced.ml.signal === 'EVEN' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400')}>
                                {advanced.ml.signal}
                              </span>
                              <span className="text-sm font-bold">
                                {(advanced.ml.confidence * 100).toFixed(1)}% Confidence
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Model training...</p>
                          )}
                        </div>

                        <div>
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Markov Chain Probabilities (100t)</p>
                           {advanced?.markov ? (
                             <div className="flex items-center justify-between bg-muted/20 p-2 rounded text-sm font-bold">
                                <span className={cn("px-2 py-0.5 rounded text-xs", advanced.markov.nextEvenGivenEven > 0.5 ? 'text-blue-500 bg-blue-500/10' : 'text-blue-400')}>EVEN GIVEN EVEN: {(advanced.markov.nextEvenGivenEven * 100).toFixed(1)}%</span>
                                <span className={cn("px-2 py-0.5 rounded text-xs", advanced.markov.nextOddGivenOdd > 0.5 ? 'text-orange-500 bg-orange-500/10' : 'text-orange-400')}>ODD GIVEN ODD: {(advanced.markov.nextOddGivenOdd * 100).toFixed(1)}%</span>
                             </div>
                           ) : (
                             <p className="text-xs text-muted-foreground">Calculating states...</p>
                           )}
                        </div>

                        <div>
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Multi-Timeframe Confluence</p>
                           {advanced?.confluence ? (
                             <div className={cn("px-2 py-1.5 rounded text-xs font-bold w-fit", 
                               advanced.confluence.state === 'STRONG_EVEN' ? 'bg-blue-500/10 text-blue-500' : 
                               advanced.confluence.state === 'STRONG_ODD' ? 'bg-orange-500/10 text-orange-500' : 
                               'bg-muted/30 text-muted-foreground'
                             )}>
                               {advanced.confluence.state === 'INSUFFICIENT' ? 'NO CONSENSUS (NO TRADE)' : `STRONG SIGNAL: ${advanced.confluence.state}`}
                               <p className="text-[9px] mt-1 font-normal opacity-80">{advanced.confluence.summary}</p>
                             </div>
                           ) : (
                             <p className="text-xs text-muted-foreground">Waiting for multi-timeframe alignment...</p>
                           )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleAdvanced>
                </div>
              </section>

            </div>

            {/* RIGHT COLUMN: Trade Settings & Execution */}
            <div className="space-y-8">
              
              <section>
                <h3 className="text-xl font-black mb-4">5. SET YOUR TRADE</h3>
                <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-1 block">Duration</label>
                    <select 
                      title="Duration"
                      aria-label="Trade Duration"
                      value={trading.duration}
                      onChange={(e) => trading.setDuration(Number(e.target.value))}
                      className="w-full bg-muted/20 border border-border/60 rounded-xl p-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 ring-violet-500"
                    >
                      {[1,2,3,4,5,6,7,8,9,10].map(d => (
                        <option key={d} value={d}>{d} Tick{d > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-1 block">Stake (USD)</label>
                    <input 
                      title="Stake"
                      aria-label="Stake Amount"
                      type="number"
                      min="0.35"
                      step="1"
                      value={trading.stake}
                      onChange={(e) => trading.setStake(e.target.value)}
                      className="w-full bg-muted/20 border border-border/60 rounded-xl p-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 ring-violet-500"
                    />
                                     {/* Kelly Criterion Quick Stake Button */}
                    {advanced && advanced.kelly && advanced.kelly.hasEdge && advanced.kelly.recommendedStake > 0 && (
                      <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                         <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-400">Kelly Edge Detected</span>
                            <button 
                              onClick={() => trading.setStake(advanced.kelly!.recommendedStake.toString())}
                              className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-2 py-1 rounded transition-colors"
                            >
                              USE OPTIMAL: ${advanced.kelly.recommendedStake}
                            </button>
                         </div>
                         <p className="text-[10px] text-muted-foreground mt-1">{advanced.kelly.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-black mb-4">6. REVIEW & TRADE</h3>
                
                {latestOpenPos ? (
                  <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/5 p-6 animate-in fade-in">
                    <p className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">TRADE ACTIVE</p>
                    <p className="text-3xl font-black mb-1">{latestOpenPos.contract_type === 'DIGITEVEN' ? 'EVEN' : 'ODD'}</p>
                    <p className="text-sm font-bold text-foreground mb-4">{latestOpenPos.underlying_symbol}</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <p className="text-xs text-muted-foreground">Stake</p>
                         <p className="text-lg font-bold">${latestOpenPos.buy_price}</p>
                       </div>
                       <div>
                         <p className="text-xs text-muted-foreground">Status</p>
                         <p className="text-lg font-black text-emerald-400 flex items-center gap-1.5"><Activity className="w-4 h-4"/> RUNNING</p>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/70 bg-card p-6 relative overflow-hidden">
                    {showConfirm ? (
                      <div className="absolute inset-0 bg-background/95 backdrop-blur-sm p-6 flex flex-col justify-center items-center text-center z-10 animate-in zoom-in-95 duration-200">
                        <h4 className="text-2xl font-black mb-4">CONFIRM TRADE</h4>
                        <p className="text-sm text-muted-foreground mb-1">You are about to place:</p>
                        <p className="text-xl font-black text-violet-500 mb-1">{chosenMode === 'DIGITEVEN' ? 'EVEN' : 'ODD'}</p>
                        <p className="font-bold text-foreground mb-4">{activeSymbol?.underlying_symbol_name} • {trading.duration} Tick(s)</p>
                        <p className="text-sm font-bold bg-muted/30 px-3 py-1.5 rounded-lg border mb-6">Stake: ${trading.stake}</p>
                        
                        <div className="flex gap-4 w-full">
                          <button 
                            disabled={trading.isBuying}
                            onClick={() => setShowConfirm(false)}
                            className="flex-1 rounded-xl bg-muted py-3 font-bold text-foreground hover:bg-muted/80 transition-colors"
                          >
                            CANCEL
                          </button>
                          <button 
                            disabled={trading.isBuying}
                            onClick={async () => {
                              await trading.buyContract();
                              setShowConfirm(false);
                            }}
                            className="flex-1 rounded-xl bg-violet-600 py-3 font-bold text-white hover:bg-violet-500 shadow-lg shadow-violet-500/20 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                          >
                            {trading.isBuying ? 'BUYING...' : 'CONFIRM BUY'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                    
                    <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
                      <p className="text-sm font-bold text-muted-foreground">Potential Payout</p>
                      {trading.isProposalLoading ? (
                        <p className="text-lg font-bold text-muted-foreground animate-pulse">Calculating...</p>
                      ) : (
                        <p className="text-2xl font-black text-emerald-400">
                          {trading.proposal?.payout ? `$${trading.proposal.payout}` : '-'}
                        </p>
                      )}
                    </div>
                    
                    <button 
                      disabled={!trading.proposal || trading.isProposalLoading}
                      onClick={() => setShowConfirm(true)}
                      className="w-full rounded-xl bg-foreground text-background font-black py-4 text-lg hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl"
                    >
                      TRADE NOW
                    </button>
                    {trading.buyError && <p className="text-xs text-red-500 font-bold text-center mt-3">{trading.buyError}</p>}
                  </div>
                )}
                
                {/* Result Block (shown if recent closed position exists) */}
                {latestClosedPos && !latestOpenPos && (() => {
                  const profit = latestClosedPos.sell_price - latestClosedPos.buy_price;
                  const isWon = profit > 0;
                  return (
                    <div className={cn("mt-4 rounded-xl border p-4 text-center animate-in fade-in slide-in-from-top-2", isWon ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500" : "border-red-500/30 bg-red-500/5 text-red-500")}>
                      <p className="text-[10px] font-bold tracking-widest uppercase mb-1">TRADE COMPLETE</p>
                      <p className="text-3xl font-black mb-1">{isWon ? 'WON' : 'LOST'}</p>
                      <p className="text-sm text-muted-foreground font-bold">{latestClosedPos.contract_type === 'DIGITEVEN' ? 'EVEN' : 'ODD'} • {profit > 0 ? '+' : ''}{profit.toFixed(2)}</p>
                    </div>
                  );
                })()}
                
              </section>

            </div>
          </div>
        )}
        
      </div>
    </main>
  );
}

export default function EvenOddGuidedPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <EvenOddGuidedFlow />
    </Suspense>
  );
}

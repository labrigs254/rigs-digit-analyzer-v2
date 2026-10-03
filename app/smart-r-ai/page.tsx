'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Header } from '@/components/custom/header';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { Target, Scale, TrendingUp, Hash, ArrowRight, Sparkles } from 'lucide-react';

function SmartRAIMenuContent() {
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

      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 flex flex-col items-center justify-center">
        
        {/* HEADER TITLE */}
        <div className="w-full text-center space-y-3 mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>DERIVE DEDICATED WORKSPACES</span>
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase">
            LET&apos;S CHOOSE WHAT TO TRADE
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto px-2">
            Select a contract type below to open its dedicated trading workspace with focused analysis and controls.
          </p>
        </div>

        {/* 4 LARGE DEDICATED WORKSPACE MENU CARDS */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* CARD 1 — MATCHES / DIFFERS */}
          <div className="group relative rounded-3xl border border-border/70 bg-card p-6 shadow-md hover:shadow-xl hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Target className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-black text-foreground group-hover:text-emerald-400 transition-colors">
                MATCHES / DIFFERS
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Trade based on the last digit matching or differing from your selected target digit.
              </p>
            </div>

            <Link
              href="/smart-r-ai/matches-differs"
              className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 px-4 text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <span>OPEN MATCHES / DIFFERS</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* CARD 2 — EVEN / ODD */}
          <div className="group relative rounded-3xl border border-border/70 bg-card p-6 shadow-md hover:shadow-xl hover:border-violet-500/50 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/30 flex items-center justify-center">
                <Scale className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-black text-foreground group-hover:text-violet-400 transition-colors">
                EVEN / ODD
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Trade based on whether the last digit will end in an Even (0,2,4,6,8) or Odd (1,3,5,7,9) number.
              </p>
            </div>

            <Link
              href="/smart-r-ai/even-odd"
              className="w-full rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold py-3.5 px-4 text-xs flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 transition-all cursor-pointer"
            >
              <span>OPEN EVEN / ODD</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* CARD 3 — OVER / UNDER */}
          <div className="group relative rounded-3xl border border-border/70 bg-card p-6 shadow-md hover:shadow-xl hover:border-blue-500/50 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-black text-foreground group-hover:text-blue-400 transition-colors">
                OVER / UNDER
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Trade based on whether the last digit will be strictly greater or less than your threshold.
              </p>
            </div>

            <Link
              href="/smart-r-ai/over-under"
              className="w-full rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3.5 px-4 text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>OPEN OVER / UNDER</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* CARD 4 — DIGIT CONTRACTS */}
          <div className="group relative rounded-3xl border border-border/70 bg-card p-6 shadow-md hover:shadow-xl hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Hash className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-black text-foreground group-hover:text-amber-400 transition-colors">
                DIGIT CONTRACTS
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Multi-digit frequency analysis and rolling distribution workspace.
              </p>
            </div>

            <Link
              href="/smart-r-ai/digits"
              className="w-full rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold py-3.5 px-4 text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <span>OPEN DIGIT CONTRACTS</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

        </div>

      </div>
    </main>
  );
}

export default function SmartRAIPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background flex items-center justify-center text-muted-foreground">Loading DERIVE Trading Menu…</div>}>
      <SmartRAIMenuContent />
    </Suspense>
  );
}

'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Header } from '@/components/custom/header';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { Target, Scale, TrendingUp, Binary, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

function MainTradingMenuContent() {
  const tradingCards = [
    {
      id: 'matches-differs',
      title: 'MATCHES / DIFFERS',
      icon: Target,
      href: '/smart-r-ai/matches-differs',
      description: 'Trade based on the last digit matching or differing from your selected digit.',
      buttonText: 'OPEN MATCHES / DIFFERS',
      gradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
      borderColor: 'border-emerald-500/40 hover:border-emerald-500/80',
      btnColor: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 'even-odd',
      title: 'EVEN / ODD',
      icon: Scale,
      href: '/smart-r-ai/even-odd',
      description: 'Trade whether the final digit will be even (0, 2, 4, 6, 8) or odd (1, 3, 5, 7, 9).',
      buttonText: 'OPEN EVEN / ODD',
      gradient: 'from-violet-500/20 via-violet-500/10 to-transparent',
      borderColor: 'border-violet-500/40 hover:border-violet-500/80',
      btnColor: 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20',
      badgeColor: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
      iconColor: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    },
    {
      id: 'over-under',
      title: 'OVER / UNDER',
      icon: TrendingUp,
      href: '/smart-r-ai/over-under',
      description: 'Trade whether the final digit will be over or under your selected threshold.',
      buttonText: 'OPEN OVER / UNDER',
      gradient: 'from-blue-500/20 via-blue-500/10 to-transparent',
      borderColor: 'border-blue-500/40 hover:border-blue-500/80',
      btnColor: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    },
    {
      id: 'digit-contracts',
      title: 'DIGIT CONTRACTS',
      icon: Binary,
      href: '/smart-r-ai/digits',
      description: 'Analyze rolling digit distributions and multi-market frequencies in real-time.',
      buttonText: 'OPEN DIGIT CONTRACTS',
      gradient: 'from-amber-500/20 via-amber-500/10 to-transparent',
      borderColor: 'border-amber-500/40 hover:border-amber-500/80',
      btnColor: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
  ];

  return (
    <main className="flex min-h-dvh flex-col bg-background selection:bg-violet-500/30">
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

      <div className="flex-1 w-full max-w-6xl mx-auto px-4 lg:px-8 py-12 flex flex-col items-center justify-center">
        
        {/* Main Title Section */}
        <div className="text-center space-y-4 max-w-2xl mb-12 animate-in fade-in zoom-in-95 duration-500">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-bold text-violet-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>SMART R AI ENGINE</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground uppercase">
            LET'S CHOOSE WHAT TO TRADE
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground font-medium">
            Select a contract type to open its dedicated trading workspace.
          </p>
        </div>

        {/* 4 Large Menu Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-in fade-in slide-in-from-bottom-6 duration-700">
          {tradingCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className={cn(
                  'group relative flex flex-col justify-between rounded-3xl border bg-card/60 p-8 backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:-translate-y-1',
                  card.borderColor
                )}
              >
                {/* Background Accent Gradient */}
                <div
                  className={cn(
                    'absolute inset-0 rounded-3xl bg-gradient-to-br opacity-50 transition-opacity group-hover:opacity-100 pointer-events-none',
                    card.gradient
                  )}
                />

                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className={cn('rounded-2xl border p-4 shrink-0', card.iconColor)}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <span className={cn('rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-widest', card.badgeColor)}>
                      DEDICATED WORKSPACE
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-foreground group-hover:text-primary transition-colors tracking-tight">
                      {card.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 pt-8">
                  <Link
                    href={card.href}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-2xl font-black text-sm py-4 px-6 transition-all duration-200 shadow-lg group-hover:scale-[1.02] cursor-pointer w-full',
                      card.btnColor
                    )}
                  >
                    <span>{card.buttonText}</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function MainTradingMenuPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background flex items-center justify-center text-muted-foreground">Loading DERIVE Trading Menu…</div>}>
      <MainTradingMenuContent />
    </Suspense>
  );
}

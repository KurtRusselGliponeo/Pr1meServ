'use client';
import * as React from 'react';
import { Trophy, TrendingUp, Users } from 'lucide-react';

export default function PerformancePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 fade-in">
      <section className="relative overflow-hidden rounded-[32px] bg-white/70 p-8 shadow-soft backdrop-blur-xl dark:bg-card/70 border border-white/40 dark:border-white/10">
        <div className="absolute inset-y-0 right-0 hidden w-96 bg-[radial-gradient(circle_at_top_right,rgba(0,240,255,0.15),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(0,240,255,0.05),transparent_60%)] lg:block" />
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand/75">Module 3.1.3</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground bg-gradient-to-br from-brand to-cyan-500 bg-clip-text text-transparent">
          Performance & Leaderboards
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          Agent persistency scores, API production breakdowns, and Recruitment KPI processing.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Metrics */}
        <div className="space-y-6">
           <div className="floating-card rounded-[32px] bg-gradient-to-br from-indigo-50 to-blue-50 p-6 border border-indigo-100/50 shadow-soft dark:from-indigo-950/20 dark:to-blue-950/20 flex flex-col justify-between h-48 hover:-translate-y-1 transition-transform">
             <div className="p-3 bg-white/60 rounded-2xl w-max dark:bg-black/20"><TrendingUp className="h-6 w-6 text-indigo-500" /></div>
             <div>
               <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Total API Production</p>
               <p className="text-3xl font-bold text-indigo-950 dark:text-white mt-1">₱ 8.42M</p>
             </div>
           </div>
           <div className="floating-card rounded-[32px] bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 border border-violet-100/50 shadow-soft dark:from-violet-950/20 dark:to-fuchsia-950/20 flex flex-col justify-between h-48 hover:-translate-y-1 transition-transform">
             <div className="p-3 bg-white/60 rounded-2xl w-max dark:bg-black/20"><Users className="h-6 w-6 text-violet-500" /></div>
             <div>
               <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">Recruitment Tenure Active</p>
               <p className="text-3xl font-bold text-violet-950 dark:text-white mt-1">42 / 48</p>
             </div>
           </div>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="lg:col-span-2 floating-card rounded-[32px] bg-white/70 p-8 shadow-soft backdrop-blur-xl dark:bg-card/70 border border-white/40 dark:border-white/10">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
                 <Trophy className="h-6 w-6 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Branch Leaderboard</h2>
           </div>
           
           {/* Kinetic Typography style List */}
           <div className="space-y-4 mt-8">
             {[
               { rank: 1, name: "Maria Garcia", val: "₱ 2.4M", per: "98%" },
               { rank: 2, name: "James Santos", val: "₱ 1.8M", per: "94%" },
               { rank: 3, name: "Anita Reyes", val: "₱ 1.5M", per: "95%" },
               { rank: 4, name: "Pedro Cruz", val: "₱ 1.2M", per: "89%" },
             ].map((a, i) => (
               <div key={i} className="flex items-center justify-between p-4 rounded-[28px] bg-white/50 border border-white/30 dark:bg-white/5 dark:border-white/10 hover:shadow-md transition-all hover:bg-white/80 cursor-pointer group">
                 <div className="flex items-center gap-5">
                   <div className={`h-12 w-12 flex items-center justify-center rounded-2xl font-black text-lg shadow-inner group-hover:scale-110 transition-transform ${i===0?'bg-amber-100 text-amber-600': i===1?'bg-gray-200 text-gray-600' : i===2?'bg-orange-100 text-orange-600' : 'bg-white text-muted-foreground'}`}>
                     #{a.rank}
                   </div>
                   <p className="font-semibold text-lg text-foreground">{a.name}</p>
                 </div>
                 <div className="flex items-center gap-8 pr-4">
                   <div className="text-right">
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Persistency</p>
                     <p className="font-medium text-brand">{a.per}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">API / YTD</p>
                     <p className="font-bold text-lg">{a.val}</p>
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}

'use client';
import * as React from 'react';
import { AlertCircle, ArrowUpRight, TrendingUp, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function LapsationPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 fade-in">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[32px] bg-white/70 p-8 shadow-soft backdrop-blur-xl dark:bg-card/70 border border-white/40 dark:border-white/10">
        <div className="absolute inset-y-0 right-0 hidden w-96 bg-[radial-gradient(circle_at_top_right,rgba(240,140,180,0.15),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(240,140,180,0.05),transparent_60%)] lg:block" />
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand/75">Module 3.1.2</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground bg-gradient-to-br from-gray-900 to-gray-500 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
          Lapsation Tracker
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          Auto-detect Lapsed policies from NAP streams. Monitor at-risk thresholds and execute reinstatement transitions across the branch.
        </p>
      </section>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[160px]">
        {/* Main Metric */}
        <div className="md:col-span-2 floating-card rounded-[32px] bg-gradient-to-br from-rose-50 to-orange-50 p-6 border border-rose-100/50 shadow-soft dark:from-rose-950/20 dark:to-orange-950/20 dark:border-rose-900/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
             <div className="p-3 bg-white/60 dark:bg-black/20 rounded-2xl backdrop-blur-sm">
                <ShieldAlert className="h-6 w-6 text-rose-500" />
             </div>
             <span className="flex items-center text-xs font-medium text-rose-600 bg-rose-100 dark:bg-rose-900/50 px-2 py-1 rounded-full">
               +12% vs PM
             </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Total At-Risk Policies</p>
            <p className="text-4xl font-bold text-rose-950 dark:text-white mt-1">124</p>
          </div>
        </div>

        <div className="floating-card rounded-[32px] bg-gradient-to-br from-emerald-50 to-teal-50 p-6 border border-emerald-100/50 shadow-soft dark:from-emerald-950/20 dark:to-teal-950/20 dark:border-emerald-900/30 flex flex-col justify-between">
           <div className="flex justify-between items-start">
             <div className="p-3 bg-white/60 dark:bg-black/20 rounded-2xl backdrop-blur-sm">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
             </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Reinstated YTD</p>
            <p className="text-4xl font-bold text-emerald-950 dark:text-white mt-1">89</p>
          </div>
        </div>
      </div>
      
      {/* Data Grid Area */}
      <section className="floating-card overflow-hidden rounded-[32px] bg-white/70 shadow-soft backdrop-blur-xl dark:bg-card/70 border border-white/40 dark:border-white/10 p-6">
         <h2 className="text-xl font-bold tracking-tight text-foreground mb-6">Pending Lapsation Action</h2>
         
         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="border-b border-white/20 dark:border-white/10 text-sm text-muted-foreground">
                 <th className="pb-3 font-semibold uppercase tracking-wider pl-4">Policy No.</th>
                 <th className="pb-3 font-semibold uppercase tracking-wider">Assigned Agent</th>
                 <th className="pb-3 font-semibold uppercase tracking-wider">Premium</th>
                 <th className="pb-3 font-semibold uppercase tracking-wider">Processing Days</th>
                 <th className="pb-3 font-semibold uppercase tracking-wider text-right pr-4">Risk Level</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-white/20 dark:divide-white/5">
               {[
                 { policy: "POL-82931Z", agent: "Maria Garcia", days: 42, risk: "CRITICAL", premium: "₱ 4,500" },
                 { policy: "POL-71284X", agent: "James Santos", days: 38, risk: "HIGH", premium: "₱ 12,000" },
                 { policy: "POL-93812Y", agent: "Maria Garcia", days: 31, risk: "MEDIUM", premium: "₱ 3,250" },
                 { policy: "POL-11823A", agent: "Anita Reyes", days: 15, risk: "MODERATE", premium: "₱ 8,100" },
                 { policy: "POL-55421B", agent: "Pedro Cruz", days: 3, risk: "LOW", premium: "₱ 2,200" },
               ].map((row, i) => (
                 <tr key={i} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                   <td className="py-4 pl-4 font-semibold text-brand group-hover:underline">{row.policy}</td>
                   <td className="py-4 font-medium">{row.agent}</td>
                   <td className="py-4 font-medium">{row.premium}</td>
                   <td className="py-4 font-bold text-gray-700 dark:text-gray-300">{row.days} Days</td>
                   <td className="py-4 pr-4 flex justify-end">
                     <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest ${
                       row.risk === 'CRITICAL' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                       row.risk === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                       row.risk === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                     }`}>
                       {row.risk}
                     </span>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </section>
    </div>
  );
}

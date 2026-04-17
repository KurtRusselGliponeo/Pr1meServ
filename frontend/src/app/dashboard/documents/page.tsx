'use client';
import * as React from 'react';
import { UploadCloud, FileText, Search, Filter, Pin } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 fade-in">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[32px] bg-white/70 p-8 shadow-soft backdrop-blur-xl dark:bg-card/70 border border-white/40 dark:border-white/10 flex flex-col lg:flex-row justify-between lg:items-end gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand/75">Module 3.1.4</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground bg-gradient-to-br from-indigo-900 to-purple-500 bg-clip-text text-transparent dark:from-white dark:to-purple-400">
            Document Repository
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            Centralized form library with S3 version controls and contextual cross-module linking.
          </p>
        </div>
        <div className="flex gap-3">
           <button className="flex items-center gap-2 rounded-full border border-white/50 bg-brand-gradient-soft px-6 py-3 text-sm font-semibold text-brand shadow-soft transition-transform hover:scale-105 hover:shadow-lg dark:border-white/10">
             <UploadCloud className="h-4 w-4" /> Upload Template
           </button>
        </div>
      </section>
      
      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
         <div className="relative flex-1">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <input type="text" placeholder="Search templates by keyword..." className="w-full rounded-full border border-white/40 bg-white/60 py-3 pl-10 pr-4 text-sm outline-none backdrop-blur-md focus:ring-2 focus:ring-brand/40 dark:border-white/10 dark:bg-white/5 shadow-soft transition-all" />
         </div>
         <button className="flex items-center gap-2 rounded-full bg-white/60 py-3 px-5 text-sm font-medium border border-white/40 shadow-soft dark:bg-white/5 dark:border-white/10">
           <Filter className="h-4 w-4" /> Categories
         </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { title: "COSAF Reassignment Form", cat: "COSAF", val: "v2.1", color: "from-blue-50 to-indigo-50", isPinned: true },
           { title: "Lapsation Notice Template", cat: "Compliance", val: "v1.0", color: "from-rose-50 to-pink-50", isPinned: true },
           { title: "Agent KPI Standard", cat: "Performance", val: "v3.0", color: "from-emerald-50 to-teal-50", isPinned: false },
           { title: "Recruitment Onboarding", cat: "Recruitment", val: "v1.2", color: "from-amber-50 to-orange-50", isPinned: false },
         ].map((doc, i) => (
           <div key={i} className={`floating-card rounded-[28px] bg-gradient-to-br ${doc.color} p-6 border border-white/50 shadow-soft dark:from-white/5 dark:to-white/5 dark:border-white/10 group cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all`}>
             <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-white/60 dark:bg-black/20 rounded-2xl backdrop-blur-sm">
                   <FileText className="h-5 w-5 text-brand" />
                </div>
                {doc.isPinned && <Pin className="h-4 w-4 text-brand opacity-60" />}
             </div>
             <p className="text-sm font-bold text-foreground line-clamp-2">{doc.title}</p>
             <div className="flex justify-between items-center mt-4">
               <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{doc.cat}</span>
               <span className="text-xs font-medium px-2 py-1 bg-white/60 dark:bg-white/10 rounded-full">{doc.val}</span>
             </div>
           </div>
         ))}
      </div>
    </div>
  );
}

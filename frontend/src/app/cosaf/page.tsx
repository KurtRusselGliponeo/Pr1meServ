import { CosafPageClient } from '@/features/cosaf/components/cosaf-page-client';
import { FileDown, CheckCircle, XCircle } from 'lucide-react';

interface CosafPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function CosafPage({ searchParams }: CosafPageProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 fade-in">
      
      {/* BM Approval Sample Queue UI */}
      <section className="floating-card overflow-hidden rounded-[32px] bg-white/70 shadow-soft backdrop-blur-xl dark:bg-card/70 border border-brand/20 p-8">
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Branch Manager Approvals</h2>
            <span className="bg-brand text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">2 PENDING</span>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { agent: "Pedro Cruz", policy: "POL-12999", file: "cosaf_signed_v2.pdf", date: "2 Hours ago" },
              { agent: "Maria Garcia", policy: "POL-88122", file: "transfer_req.pdf", date: "5 Hours ago" }
            ].map((req, i) => (
              <div key={i} className="flex items-center justify-between p-5 rounded-[24px] bg-gradient-to-r from-brand/5 to-transparent border border-brand/10 hover:border-brand/30 transition-all group">
                 <div className="flex items-start gap-4">
                   <div className="p-3 bg-brand/10 rounded-2xl group-hover:scale-110 transition-transform">
                     <FileDown className="text-brand h-6 w-6" />
                   </div>
                   <div>
                     <p className="font-bold text-sm">{req.agent}</p>
                     <p className="text-xs text-muted-foreground">{req.policy} • <span className="text-brand cursor-pointer hover:underline">{req.file}</span></p>
                     <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">{req.date}</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 pr-2">
                   <button className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-full transition-colors"><CheckCircle className="h-5 w-5" /></button>
                   <button className="p-2 hover:bg-rose-100 text-rose-600 rounded-full transition-colors"><XCircle className="h-5 w-5" /></button>
                 </div>
              </div>
            ))}
         </div>
      </section>

      <section>
        <CosafPageClient searchParams={searchParams} />
      </section>
    </div>
  );
}

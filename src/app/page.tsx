import Link from 'next/link';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Star } from 'lucide-react';
import { getAllMatrixRows, parseBigQueryTimestamp } from '@/lib/bigquery';

// Force dynamic or low revalidation for index hub
export const revalidate = 10; // 10 seconds for rapid landing page updates


interface GroupedComparisons {
  [category: string]: {
    slug: string;
    category: string;
    last_updated: any;
  }[];
}

export default async function Home() {
  const comparisons = await getAllMatrixRows();

  // Group comparisons by category
  const grouped: GroupedComparisons = {};
  comparisons.forEach((row) => {
    if (!grouped[row.category]) {
      grouped[row.category] = [];
    }
    grouped[row.category].push(row);
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      
      {/* Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-6 w-6" />
            <span>SaaSMatrix</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white py-20 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 mb-6">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Data-driven Software Comparison Indexes</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">
            Choose the Right SaaS, Instantly
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-indigo-100/80 font-light leading-relaxed mb-10">
            Unbiased side-by-side matrices, feature scorecards, and expert syntheses compiled programmatically from serverless cloud data warehouses.
          </p>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-indigo-200">
            <div className="flex items-center gap-2">
              <Zap className="h-4.5 w-4.5 text-indigo-400" />
              <span>Real-time Feature Tracking</span>
            </div>
            <span className="hidden sm:inline-block text-indigo-500/30">|</span>
            <div className="flex items-center gap-2">
              <Star className="h-4.5 w-4.5 text-indigo-400" />
              <span>Expert Summaries</span>
            </div>
          </div>
        </div>
      </section>

      {/* Directory Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-10 tracking-tight text-center">
          Browse Active Comparisons
        </h2>

        {comparisons.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center max-w-lg mx-auto">
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-4">
              Database Connection Configured
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              The BigQuery table is currently empty or initial sync is in progress. Add records to `corporyt.seo_data.saas_matrix` to generate indexes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.entries(grouped).map(([category, items]) => {
              const formattedCategory = category
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

              return (
                <section 
                  key={category}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4">
                    <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    <span>{formattedCategory}</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    {items.length} Comparison{items.length !== 1 ? 's' : ''} available
                  </h3>

                  <ul className="space-y-3 flex-1 mb-6">
                    {items.map((item) => {
                      const updatedDate = parseBigQueryTimestamp(item.last_updated);
                      const relativeTime = updatedDate.toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      });
                      
                      // Convert slugs into tool names for display if slug pattern allows
                      const displayName = item.slug
                        .split('-vs-')
                        .map(n => n.charAt(0).toUpperCase() + n.slice(1))
                        .join(' vs ');

                      return (
                        <li key={item.slug}>
                          <Link 
                            href={`/${item.category}/${item.slug}`}
                            className="group flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            <span className="truncate">{displayName || item.slug}</span>
                            <span className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                                {relativeTime}
                              </span>
                              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600 dark:text-indigo-400" />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      Auto-updates daily via warehouse ISR
                    </span>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <span>SaaSMatrix</span>
          </div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} SaaSMatrix. All rights reserved. Programmatically generated comparison indexes.
          </p>
        </div>
      </footer>

    </div>
  );
}

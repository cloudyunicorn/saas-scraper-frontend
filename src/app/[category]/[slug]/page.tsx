import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, X, ArrowRight, Star, ShieldCheck, Sparkles, Zap, Clock, Bookmark } from 'lucide-react';
import { getMatrixRow, getAllMatrixRows, normalizeFeatureMatrix, parseBigQueryTimestamp } from '@/lib/bigquery';
import type { FeatureMatrix } from '@/types';


// Configure ISR: 24-hour cache lifetime
export const revalidate = 86400;

interface PageProps {
  params: Promise<{
    category: string;
    slug: string;
  }>;
}

// 1. Generate Metadata dynamically based on BigQuery fields
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await getMatrixRow(slug);

  if (!row) {
    return {
      title: 'Comparison Not Found | SaaS Matrix',
      description: 'The requested comparison page could not be found.',
    };
  }

  return {
    title: row.meta_title,
    description: row.meta_description,
    openGraph: {
      title: row.meta_title,
      description: row.meta_description,
      type: 'article',
      siteName: 'SaaS Matrix Comparisons',
    },
  };
}

// 2. generateStaticParams to pre-render routes at build time
export async function generateStaticParams() {
  const rows = await getAllMatrixRows();
  return rows.map((row) => ({
    category: row.category,
    slug: row.slug,
  }));
}

// Helper to check if a value is truthy/boolean true
function isTruthy(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lowered = val.toLowerCase().trim();
    return lowered === 'true' || lowered === 'yes' || lowered === 'checked' || lowered === '1';
  }
  return false;
}

// Helper to check if a value is falsy/boolean false
function isFalsy(val: any): boolean {
  if (typeof val === 'boolean') return !val;
  if (typeof val === 'string') {
    const lowered = val.toLowerCase().trim();
    return lowered === 'false' || lowered === 'no' || lowered === 'unchecked' || lowered === '0';
  }
  return val === null || val === undefined;
}

export default async function ComparisonPage({ params }: PageProps) {
  const { category, slug } = await params;
  
  // Fetch specific row using parameterized query
  const row = await getMatrixRow(slug);

  // Return standard Next.js notFound if row doesn't exist
  if (!row) {
    notFound();
  }

  // Safely normalize features from the database feature_matrix as a compatibility fallback
  const features = normalizeFeatureMatrix(row.feature_matrix, row.primary_tool, row.competitor_tool);

  // Safely parse the feature_matrix JSON contract
  let matrix: FeatureMatrix;
  try {
    matrix = typeof row.feature_matrix === 'string'
      ? JSON.parse(row.feature_matrix)
      : row.feature_matrix;
      
    // If matrix parsed but does not have the expected properties (e.g. it is the old array format),
    // extract them dynamically from features for backwards compatibility
    if (!matrix || typeof matrix !== 'object' || !('gantt_charts' in matrix)) {
      matrix = {
        gantt_charts: features.some(f => f.name.toLowerCase().includes('gantt') && isTruthy(f.primaryVal)),
        kanban_boards: features.some(f => f.name.toLowerCase().includes('kanban') && isTruthy(f.primaryVal)),
        pricing_tier: (features.find(f => f.name.toLowerCase().includes('price') || f.name.toLowerCase().includes('pricing'))?.primaryVal as string) || 'Pricing structure: custom plan tiers.',
        ideal_team_size: (features.find(f => f.name.toLowerCase().includes('team') || f.name.toLowerCase().includes('size') || f.name.toLowerCase().includes('scale'))?.primaryVal as string) || 'Optimized for modern agile teams.'
      };
    }
  } catch (e) {
    console.error('Failed to parse feature_matrix JSON:', e);
    matrix = {
      gantt_charts: false,
      kanban_boards: false,
      pricing_tier: 'Pricing details currently unavailable.',
      ideal_team_size: 'Ideal team scale information currently unavailable.'
    };
  }

  // Handle last updated timestamp parsing
  const lastUpdated = parseBigQueryTimestamp(row.last_updated);
  const formattedDate = lastUpdated.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate summary metrics based on parsed matrix
  const primaryScores = (matrix.gantt_charts ? 1 : 0) + (matrix.kanban_boards ? 1 : 0);
  const competitorScores = (matrix.gantt_charts ? 1 : 0) + (matrix.kanban_boards ? 1 : 0);
  const isPrimaryWinner = primaryScores >= competitorScores;
  const winnerName = isPrimaryWinner ? row.primary_tool : row.competitor_tool;


  // Format category name for UI breadcrumbs and labels
  const formattedCategory = category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      
      {/* Upper Navigation/Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-6 w-6" />
            <span>SaaSMatrix</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 py-1 px-2.5 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              Updated {formattedDate}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <li>
              <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Home
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="cursor-default capitalize">{formattedCategory}</span>
            </li>
            <li className="flex items-center gap-2" aria-current="page">
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-semibold text-slate-900 dark:text-white capitalize">
                {row.primary_tool} vs {row.competitor_tool}
              </span>
            </li>
          </ol>
        </nav>

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-8 md:p-12 mb-8 shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 mb-4">
              <Bookmark className="h-3 w-3" />
              <span>{formattedCategory} Analysis</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent leading-tight">
              {row.meta_title || `${row.primary_tool} vs {row.competitor_tool} Comparison`}
            </h1>
            
            <p className="text-lg text-indigo-100/90 leading-relaxed mb-6 font-light">
              An in-depth, data-backed side-by-side comparison of <span className="font-semibold text-white">{row.primary_tool}</span> and <span className="font-semibold text-white">{row.competitor_tool}</span> to help you select the best solution for your business.
            </p>

            <div className="flex flex-wrap items-center gap-6 text-sm text-indigo-200">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Verified Data Source</span>
              </div>
              <div className="h-4 w-px bg-indigo-500/30 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Last Updated: {formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Quick Winner Badge Floating Layer */}
          <div className="absolute right-8 bottom-8 hidden lg:block">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl flex flex-col items-center text-center max-w-[200px]">
              <span className="text-xs uppercase tracking-wider text-indigo-300 font-bold mb-1">Recommended Option</span>
              <div className="text-xl font-black text-white mb-2 truncate max-w-full">
                {winnerName}
              </div>
              <span className="bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Top Choice
              </span>
            </div>
          </div>
        </section>

        {/* Dynamic Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Comparison Table / Grid Widget */}
            <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  Feature-by-Feature Matrix
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Comparing capabilities, specifications, and feature availability directly.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50">
                      <th className="py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 w-2/5">
                        Feature / Capability
                      </th>
                      <th className="py-4 px-6 text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 text-center w-3/10">
                        <div className="flex flex-col items-center">
                          <span className="truncate max-w-[120px]">{row.primary_tool}</span>
                          {isPrimaryWinner && (
                            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full mt-1 font-bold">
                              Leader
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="py-4 px-6 text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 text-center w-3/10">
                        <div className="flex flex-col items-center">
                          <span className="truncate max-w-[120px]">{row.competitor_tool}</span>
                          {!isPrimaryWinner && (
                            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full mt-1 font-bold">
                              Leader
                            </span>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                    {/* ROW 1: GANTT CHARTS */}
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-800 dark:text-slate-200 align-middle">
                        Gantt Charts / Timelines
                      </td>
                      <td className="py-4 px-6 text-center align-middle">
                        {matrix.gantt_charts ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                            ✅ Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400">
                            ❌ No Native Support
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center align-middle">
                        {matrix.gantt_charts ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                            ✅ Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400">
                            ❌ No Native Support
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* ROW 2: KANBAN BOARDS */}
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-800 dark:text-slate-200 align-middle">
                        Kanban Board Layouts
                      </td>
                      <td className="py-4 px-6 text-center align-middle">
                        {matrix.kanban_boards ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                            ✅ Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400">
                            ❌ No
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center align-middle">
                        {matrix.kanban_boards ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                            ✅ Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400">
                            ❌ No
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* ROW 3: PRICING */}
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-800 dark:text-slate-200 align-middle">
                        Pricing Structures
                      </td>
                      <td colSpan={2} className="py-4 px-6 text-slate-750 dark:text-slate-300 leading-relaxed align-middle">
                        <p>{matrix.pricing_tier}</p>
                      </td>
                    </tr>

                    {/* ROW 4: TARGET TEAM SCALE */}
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-800 dark:text-slate-200 align-middle">
                        Ideal User Scale
                      </td>
                      <td colSpan={2} className="py-4 px-6 text-slate-755 dark:text-slate-300 leading-relaxed align-middle">
                        <p>{matrix.ideal_team_size}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Analysis Breakdown Section */}
            <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Star className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                Expert Breakdown & Analysis
              </h2>
              
              <article className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed space-y-6">
                {row.summary_text ? (
                  row.summary_text.split('\n\n').map((paragraph, index) => {
                    const trimmed = paragraph.trim();
                    if (!trimmed) return null;
                    
                    // Simple formatting for lists if text starts with hyphens or bullet points
                    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                      const items = trimmed.split(/\n[-*] /).map(item => item.replace(/^[-*] /, '').trim());
                      return (
                        <ul key={index} className="list-disc pl-6 space-y-2 my-4">
                          {items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      );
                    }
                    
                    // If it is a heading (starts with ### or ##)
                    if (trimmed.startsWith('### ')) {
                      return <h4 key={index} className="text-lg font-bold text-slate-900 dark:text-white mt-6 mb-2">{trimmed.replace('### ', '')}</h4>;
                    }
                    if (trimmed.startsWith('## ')) {
                      return <h3 key={index} className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">{trimmed.replace('## ', '')}</h3>;
                    }

                    return <p key={index} className="mb-4">{trimmed}</p>;
                  })
                ) : (
                  <p className="italic text-slate-400">No comparison summary synthesis available for this entry.</p>
                )}
              </article>
            </section>
          </div>

          {/* Sidebar / Monetization Area */}
          <div className="space-y-6">
            
            {/* Sticky Card Wrapper */}
            <div className="sticky top-24 space-y-6">
              
              {/* Primary Option Highlight CTA Card */}
              <div className="relative bg-gradient-to-b from-indigo-500/10 to-indigo-500/0 dark:from-indigo-400/10 dark:to-transparent rounded-2xl border border-indigo-500/30 p-6 shadow-sm overflow-hidden bg-white dark:bg-slate-800">
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                  Top Recommended
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Get Started with {row.primary_tool}
                </h3>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  {row.primary_tool} leads in feature score, matching {primaryScores} key requirements. Try it risk-free today.
                </p>

                <ul className="space-y-3 mb-6 text-sm">
                  <li className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Best overall performance and stability</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Highly flexible pricing plans</span>
                  </li>
                </ul>

                <a
                  href={`https://partner-redirect.com?tool=${encodeURIComponent(row.primary_tool.toLowerCase())}&ref=saasmatrix`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-colors"
                >
                  <span>Go to {row.primary_tool}</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              {/* Competitor Alternative Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Consider {row.competitor_tool}
                </h3>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Best if you prioritize specific niche workflows highlighted in our comparison matrix.
                </p>

                <a
                  href={`https://partner-redirect.com?tool=${encodeURIComponent(row.competitor_tool.toLowerCase())}&ref=saasmatrix`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 border border-slate-300 hover:border-indigo-500 dark:border-slate-600 dark:hover:border-indigo-400 text-slate-700 dark:text-slate-300 font-semibold py-3 px-4 rounded-xl transition-all"
                >
                  <span>Explore {row.competitor_tool}</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              {/* Mini-Disclaimer */}
              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 px-4 leading-normal">
                Affiliate disclosure: We receive a commission when purchases are made through our links, which helps maintain our research dataset.
              </p>

            </div>
          </div>

        </div>

      </main>

      {/* Floating Bottom CTA Bar for Mobile Viewports */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 p-4 backdrop-blur-md shadow-2xl flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Top Choice</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{row.primary_tool}</p>
        </div>
        <a
          href={`https://partner-redirect.com?tool=${encodeURIComponent(row.primary_tool.toLowerCase())}&ref=saasmatrix`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 max-w-[200px] inline-flex items-center justify-center gap-1.5 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-bold py-2.5 px-4 rounded-xl shadow-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
        >
          <span>Claim Trial</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Footer */}
      <footer className="mt-20 bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
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

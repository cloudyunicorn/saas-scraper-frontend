import type { MetadataRoute } from 'next';
import { getAllMatrixRows, parseBigQueryTimestamp } from '@/lib/bigquery';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all rows (slugs, categories, and timestamps) from BigQuery
  const rows = await getAllMatrixRows();
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

  // Map each BigQuery row to a sitemap entry
  const comparisonEntries = rows.map((row) => {
    const lastModifiedDate = parseBigQueryTimestamp(row.last_updated);
    
    return {
      url: `${baseUrl}/${row.category}/${row.slug}`,
      lastModified: lastModifiedDate,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    };
  });

  // Return sitemap entries including the homepage
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    ...comparisonEntries,
  ];
}

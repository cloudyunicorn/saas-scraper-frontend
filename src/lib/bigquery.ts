import { BigQuery } from '@google-cloud/bigquery';

// Define the core types for our SaaS comparison matrix
export interface SaasMatrixRow {
  slug: string;
  primary_tool: string;
  competitor_tool: string;
  category: string;
  feature_matrix: any; // Can be JSON string or object
  summary_text: string;
  meta_title: string;
  meta_description: string;
  last_updated: any;
}

export interface SimplifiedMatrixRow {
  slug: string;
  category: string;
  last_updated: any;
}

export interface NormalizedFeature {
  name: string;
  primaryVal: string | boolean;
  competitorVal: string | boolean;
}

// High-quality mock fallback data for development, testing, and offline builds.
const MOCK_ROWS: SaasMatrixRow[] = [
  {
    slug: 'jira-vs-linear',
    primary_tool: 'Jira',
    competitor_tool: 'Linear',
    category: 'project-management',
    feature_matrix: [
      { feature: 'Real-time Syncing', primary: true, competitor: true },
      { feature: 'Custom Workflows', primary: true, competitor: false },
      { feature: 'Keyboard Shortcuts', primary: false, competitor: true },
      { feature: 'Enterprise Permissions', primary: true, competitor: false },
      { feature: 'Speed & Performance', primary: 'Average', competitor: 'Excellent' },
      { feature: 'Pricing (per seat)', primary: '$7.50', competitor: '$8.00' }
    ],
    summary_text: `### Comparison Overview\nJira and Linear represent two different philosophies of project management. Jira is a powerhouse, built for large enterprises needing deep customizations, while Linear is a fast, keyboard-first tool geared for modern product teams.\n\n### Customization vs Velocity\nJira offers infinite workflow configurations, but this complexity often slows teams down. Linear restricts configuration to ensure maximum execution velocity.\n\n### Verdict\nChoose Jira for enterprise hierarchy. Choose Linear for engineering speed.`,
    meta_title: 'Jira vs Linear: The Ultimate Project Management Comparison',
    meta_description: 'An in-depth side-by-side comparison of Jira and Linear. Compare features, pricing, performance, and custom workflow capabilities.',
    last_updated: new Date()
  },
  {
    slug: 'hubspot-vs-salesforce',
    primary_tool: 'HubSpot',
    competitor_tool: 'Salesforce',
    category: 'crm',
    feature_matrix: [
      { feature: 'Ease of Use', primary: true, competitor: false },
      { feature: 'Custom Object Limits', primary: false, competitor: true },
      { feature: 'Inbound Marketing Tools', primary: true, competitor: false },
      { feature: 'Enterprise APEX Code', primary: false, competitor: true },
      { feature: 'Pricing Starter Tier', primary: '$20/mo', competitor: '$25/mo' }
    ],
    summary_text: `### Overview\nHubSpot is known for its intuitive user experience and powerful marketing suite, whereas Salesforce is the heavyweight CRM suited for custom object-heavy configurations and large sales teams.\n\n### Ease of Use vs Customizability\nSalesforce requires dedicated administration but allows you to build anything. HubSpot is easy to learn and adopt but hits ceilings in extreme enterprise customization.`,
    meta_title: 'HubSpot vs Salesforce: Which CRM is Best in 2026?',
    meta_description: 'A data-backed comparison of HubSpot and Salesforce CRM suites. Analyze custom objects, user experience, and pricing tiers.',
    last_updated: new Date()
  }
];

// Initialize the Google BigQuery client.
const projectId = process.env.GCP_PROJECT_ID || 'corporyt';
const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

const options: any = {
  projectId,
};

if (credentialsJson) {
  try {
    options.credentials = JSON.parse(credentialsJson);
  } catch (error) {
    console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON env var:', error);
  }
}

export const bigquery = new BigQuery(options);

/**
 * Executes a parameterized query to fetch a single matrix row.
 * Prevents SQL Injection. Fallbacks to mock data if credentials are missing or connection fails.
 */
export async function getMatrixRow(slug: string): Promise<SaasMatrixRow | null> {
  const query = 'SELECT * FROM `corporyt.seo_data.saas_matrix` WHERE slug = @slug LIMIT 1';
  
  try {
    // If credentials are completely missing, gracefully fallback to mock data in non-production
    if (!credentialsJson && process.env.NODE_ENV !== 'production') {
      const match = MOCK_ROWS.find(r => r.slug === slug);
      if (match) {
        console.warn(`BigQuery credentials missing. Using mock fallback for slug "${slug}"`);
        return match;
      }
    }

    const [rows] = await bigquery.query({
      query,
      params: { slug },
      types: { slug: 'STRING' },
    });
    
    if (rows && rows.length > 0) {
      return rows[0] as SaasMatrixRow;
    }
    return null;
  } catch (error) {
    console.error(`BigQuery query failed for slug "${slug}". Falling back to mock data:`, error);
    return MOCK_ROWS.find(r => r.slug === slug) || null;
  }
}

/**
 * Pulls only slug, category, and last_updated.
 * Fallbacks to mock data if credentials are missing or connection fails.
 */
export async function getAllMatrixRows(): Promise<SimplifiedMatrixRow[]> {
  const query = 'SELECT slug, category, last_updated FROM `corporyt.seo_data.saas_matrix`';
  
  try {
    if (!credentialsJson && process.env.NODE_ENV !== 'production') {
      console.warn('BigQuery credentials missing. Using mock fallback list.');
      return MOCK_ROWS.map(r => ({ slug: r.slug, category: r.category, last_updated: r.last_updated }));
    }

    const [rows] = await bigquery.query({ query });
    return rows as SimplifiedMatrixRow[];
  } catch (error) {
    console.error('BigQuery query for all rows failed. Falling back to mock data:', error);
    return MOCK_ROWS.map(r => ({ slug: r.slug, category: r.category, last_updated: r.last_updated }));
  }
}

/**
 * Safely parses any format of the BigQuery timestamp.
 */
export function parseBigQueryTimestamp(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'string') return new Date(timestamp);
  if (typeof timestamp === 'number') return new Date(timestamp);
  if (timestamp && typeof timestamp === 'object') {
    if ('value' in timestamp) return new Date(timestamp.value);
  }
  return new Date();
}

/**
 * Safely parses feature_matrix data, handling string and object types.
 */
export function parseFeatureMatrix(matrixData: any): any[] {
  if (!matrixData) return [];
  if (Array.isArray(matrixData)) return matrixData;
  if (typeof matrixData === 'object') return [matrixData];
  
  if (typeof matrixData === 'string') {
    try {
      const parsed = JSON.parse(matrixData);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'object' && parsed !== null) return [parsed];
      return [];
    } catch (e) {
      console.error('Failed to parse feature_matrix JSON string:', e, 'Raw value:', matrixData);
      return [];
    }
  }
  return [];
}

/**
 * Normalizes the parsed feature matrix into a standard row structure for rendering,
 * regardless of differences in the original BigQuery row format.
 */
export function normalizeFeatureMatrix(
  matrixData: any,
  primaryName: string,
  competitorName: string
): NormalizedFeature[] {
  const parsed = parseFeatureMatrix(matrixData);
  
  if (parsed.length === 0) {
    if (matrixData && typeof matrixData === 'object' && !Array.isArray(matrixData)) {
      return Object.entries(matrixData).map(([key, val]: [string, any]) => {
        if (val && typeof val === 'object') {
          const keys = Object.keys(val);
          const primKey = keys.find(k => k.toLowerCase().includes(primaryName.toLowerCase()) || k.toLowerCase() === 'primary' || k.toLowerCase().includes('has'));
          const compKey = keys.find(k => k.toLowerCase().includes(competitorName.toLowerCase()) || k.toLowerCase() === 'competitor' || k !== primKey);
          return {
            name: key,
            primaryVal: primKey ? val[primKey] : Object.values(val)[0],
            competitorVal: compKey ? val[compKey] : Object.values(val)[1],
          };
        }
        return {
          name: key,
          primaryVal: val,
          competitorVal: val,
        };
      });
    }
    return [];
  }

  return parsed.map((item: any) => {
    if (typeof item === 'string') {
      return { name: item, primaryVal: false, competitorVal: false };
    }
    if (item && typeof item === 'object') {
      const nameKey = Object.keys(item).find(k => ['feature', 'name', 'title', 'label'].includes(k.toLowerCase())) || Object.keys(item)[0] || 'Feature';
      const name = item[nameKey] || 'Feature';

      const keys = Object.keys(item).filter(k => k !== nameKey);
      
      const primaryKey = keys.find(k => 
        k.toLowerCase().includes('primary') || 
        k.toLowerCase().includes(primaryName.toLowerCase()) ||
        k.toLowerCase() === 'has_primary'
      ) || keys[0];

      const competitorKey = keys.find(k => 
        k.toLowerCase().includes('competitor') || 
        k.toLowerCase().includes(competitorName.toLowerCase()) ||
        k.toLowerCase() === 'has_competitor' ||
        k !== primaryKey
      ) || keys[1] || keys[0];

      return {
        name: String(name),
        primaryVal: primaryKey ? item[primaryKey] : false,
        competitorVal: competitorKey ? item[competitorKey] : false,
      };
    }
    return { name: 'Unknown', primaryVal: false, competitorVal: false };
  });
}


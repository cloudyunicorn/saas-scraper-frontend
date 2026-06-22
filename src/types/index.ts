export interface FeatureMatrix {
  gantt_charts: boolean;
  kanban_boards: boolean;
  pricing_tier: string;
  ideal_team_size: string;
}

export interface ComparisonPageData {
  slug: string;
  primary_tool: string;
  competitor_tool: string;
  category: string;
  feature_matrix: string; // Stored as stringified JSON in BigQuery
  summary_text: string;
  meta_title: string;
  meta_description: string;
}

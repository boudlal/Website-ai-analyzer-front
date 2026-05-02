export type SignalSeverity = 'low' | 'medium' | 'high';

export type CoreWebVitals = {
  lcp: number;
  cls: number;
  inp?: number;
};

export type LoadingMetrics = {
  fcp: number;
  ttfb: number;
  speedIndex: number;
};

export type InteractivityMetrics = {
  tbt: number;
  longTasks: number;
  mainThreadTime: number;
};

export type ResourceMetrics = {
  totalRequests: number;
  totalBytes: number;
  jsBytes: number;
  cssBytes: number;
  imageBytes: number;
  fontBytes: number;
  unusedJS?: number;
  unusedCSS?: number;
  renderBlockingResources: number;
};

export type NetworkMetrics = {
  thirdPartyRequests: number;
  thirdPartyBytes: number;
};

export type PerformanceMetrics = {
  coreWebVitals: CoreWebVitals;
  loading: LoadingMetrics;
  interactivity: InteractivityMetrics;
  resources: ResourceMetrics;
  network: NetworkMetrics;
};

export type PerformanceSignal = {
  id: string;
  severity: SignalSeverity;
  message: string;
  metric?: string;
  value?: number;
};

export type AIInsightIssue = {
  title: string;
  priority: SignalSeverity;
  recommendation?: string;
  description?: string;
  instructions?: string;
};

export type Technology = {
  name: string;
  category: 'cms' | 'frontend' | 'backend' | 'hosting' | 'build';
  confidence: SignalSeverity;
};

export type TechDetectionResult = {
  technologies: Technology[];
};

export type AnalysisReport = {
  url: string;
  generatedAt: string;
  context: {
    url: string;
    performance?: PerformanceMetrics;
    techDetection?: TechDetectionResult;
  };
  signals: PerformanceSignal[];
  aiInsights: {
    summary: string;
    issues: AIInsightIssue[];
  };
  errors: string[];
};

export type AnalyzeApiError = {
  error: string;
  message?: string;
  details?: unknown;
};

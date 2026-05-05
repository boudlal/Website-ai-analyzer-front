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
  category?: SecurityCategory;
  evidence?: string;
  recommendation?: string;
};

export type AIInsightIssue = {
  id?: string;
  title: string;
  priority: SignalSeverity;
  category?: 'performance' | 'security' | 'seo' | 'ux' | 'cms' | 'javascript';
  impact?: SignalSeverity;
  effort?: 'easy' | 'medium' | 'hard';
  whyItMatters?: string;
  evidence?: string[];
  expectedOutcome?: string;
  confidence?: SignalSeverity;
  fixStepsNonTechnical?: string[];
  fixStepsTechnical?: string[];
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

export type WordPressRuntimeIndicators = {
  wpContentAssetRequests: number;
  wpContentAssetBytes: number;
  pluginAssetRequests: number;
  pluginAssetBytes: number;
  themeAssetRequests: number;
  themeAssetBytes: number;
  adminAjaxRequests: number;
  wpJsonRequests: number;
};

export type CMSFinding = {
  name: string;
  confidence: SignalSeverity;
  version?: string;
  source?: string;
};

export type WordPressCMSData = {
  detectionConfidence?: SignalSeverity;
  pluginFindings?: CMSFinding[];
  themeFindings?: CMSFinding[];
  indicators?: WordPressRuntimeIndicators;
};

export type CMSData = {
  detectedCMS?: string;
  confidence?: number;
  plugins: string[];
  themes: string[];
  detectionConfidence?: SignalSeverity;
  pluginFindings?: CMSFinding[];
  themeFindings?: CMSFinding[];
  wordpress?: WordPressCMSData;
};

export type SecurityCategory = 'transport' | 'headers' | 'cookies' | 'cors' | 'info-disclosure' | 'wordpress' | 'dependencies';

export type SecurityCookie = {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
  maxAgeSeconds?: number;
  isSession: boolean;
};

export type SecurityTLSData = {
  isHttps: boolean;
  mixedContentCount: number;
  hstsHeader?: string;
  tlsVersion?: string;
  certificateDaysUntilExpiry?: number;
};

export type SecurityHeadersData = {
  csp?: string;
  xFrameOptions?: string;
  xContentTypeOptions?: string;
  referrerPolicy?: string;
  permissionsPolicy?: string;
  coop?: string;
  corp?: string;
};

export type SecurityCorsData = {
  allowOrigin?: string;
  allowCredentials?: string;
  allowMethods?: string;
};

export type SecurityInfoDisclosureData = {
  serverHeader?: string;
  poweredByHeader?: string;
  sourceMapUrls: string[];
  debugStacktraceDetected: boolean;
};

export type SecurityWordPressExposureData = {
  xmlRpcEnabled: boolean;
  versionExposed: boolean;
  readmeExposed: boolean;
  userEnumerationRisk: boolean;
};

export type SecurityDependencyData = {
  thirdPartyScriptsWithoutSri: number;
  vulnerableLibrarySignatures: string[];
  deprecatedLibraries: string[];
};

export type SecurityContext = {
  tls?: SecurityTLSData;
  headers?: SecurityHeadersData;
  cookies: SecurityCookie[];
  cors?: SecurityCorsData;
  infoDisclosure?: SecurityInfoDisclosureData;
  wordpressExposure?: SecurityWordPressExposureData;
  dependencies?: SecurityDependencyData;
};

export type AnalysisReport = {
  url: string;
  generatedAt: string;
  context: {
    url: string;
    performance?: PerformanceMetrics;
    techDetection?: TechDetectionResult;
    cms?: CMSData;
    security?: SecurityContext;
    runtime?: unknown;
    assets?: unknown;
    jsProfiling?: unknown;
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

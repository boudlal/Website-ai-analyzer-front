'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// third-party
import { motion } from 'framer-motion';

// project-imports
import AnimateButton from 'components/@extended/AnimateButton';
import MainCard from 'components/MainCard';

// types
import type {
  AIInsightIssue,
  AnalysisReport,
  CMSData,
  PerformanceMetrics,
  PerformanceSignal,
  SecurityCategory,
  SecurityContext,
  SEOContext,
  SignalSeverity,
  Technology,
  WordPressRuntimeIndicators
} from 'types/analyzer/analysis';

type MetricStatus = 'good' | 'medium' | 'bad';

type NormalizedIssue = {
  id?: string;
  title: string;
  priority: SignalSeverity;
  category?: AIInsightIssue['category'];
  impact?: SignalSeverity;
  effort?: AIInsightIssue['effort'];
  whyItMatters?: string;
  fixStepsNonTechnical: string[];
  fixStepsTechnical: string[];
  description: string;
  instructions: string;
};

type MetricItem = {
  key: string;
  label: string;
  value: number;
  displayValue: string;
  helper: string;
  status: MetricStatus;
};

type MetricGroup = {
  title: string;
  description: string;
  items: MetricItem[];
};

type SignalGroup = {
  category: SecurityCategory;
  title: string;
  description: string;
  signals: PerformanceSignal[];
};

type SectionNavItem = {
  id: string;
  label: string;
  description: string;
  badge?: string;
};

const priorityRank: Record<SignalSeverity, number> = { high: 0, medium: 1, low: 2 };

const statusScore: Record<MetricStatus, number> = { good: 92, medium: 64, bad: 32 };

const statusLabels: Record<MetricStatus, string> = {
  good: 'Good',
  medium: 'Needs work',
  bad: 'Critical'
};

const securityCategoryMeta: Record<SecurityCategory, { title: string; description: string }> = {
  transport: {
    title: 'Transport & TLS',
    description: 'HTTPS, HSTS, mixed content, TLS version, and certificate health.'
  },
  headers: {
    title: 'Security headers',
    description: 'Browser-side protections like CSP, frame protection, and policy headers.'
  },
  cookies: {
    title: 'Cookies',
    description: 'Secure, HttpOnly, SameSite, and lifetime checks for cookies.'
  },
  cors: {
    title: 'CORS',
    description: 'Cross-origin sharing configuration and broad access risks.'
  },
  'info-disclosure': {
    title: 'Information disclosure',
    description: 'Headers, source maps, and debug traces that reveal internals.'
  },
  wordpress: {
    title: 'WordPress exposure',
    description: 'Public WordPress endpoints and metadata exposure checks.'
  },
  dependencies: {
    title: 'Dependency hygiene',
    description: 'Third-party script integrity and passive vulnerable library signatures.'
  }
};

const thresholdMap: Record<string, { good: number; medium: number }> = {
  lcp: { good: 2500, medium: 4000 },
  cls: { good: 0.1, medium: 0.25 },
  inp: { good: 200, medium: 500 },
  fcp: { good: 1800, medium: 3000 },
  ttfb: { good: 800, medium: 1800 },
  speedIndex: { good: 3400, medium: 5800 },
  tbt: { good: 200, medium: 600 },
  longTasks: { good: 5, medium: 15 },
  mainThreadTime: { good: 2000, medium: 4000 },
  totalRequests: { good: 50, medium: 100 },
  totalBytes: { good: 1500000, medium: 3000000 },
  jsBytes: { good: 350000, medium: 800000 },
  cssBytes: { good: 100000, medium: 250000 },
  imageBytes: { good: 1000000, medium: 2000000 },
  fontBytes: { good: 150000, medium: 300000 },
  unusedJS: { good: 100000, medium: 300000 },
  unusedCSS: { good: 50000, medium: 150000 },
  renderBlockingResources: { good: 2, medium: 5 },
  thirdPartyRequests: { good: 10, medium: 25 },
  thirdPartyBytes: { good: 500000, medium: 1000000 }
};

const SECTION_SCROLL_MARGIN_TOP = 96;

const statusColor = (status: MetricStatus) => {
  if (status === 'good') return 'success';
  if (status === 'medium') return 'warning';
  return 'error';
};

const priorityColor = (priority: SignalSeverity) => {
  if (priority === 'high') return 'error';
  if (priority === 'medium') return 'warning';
  return 'success';
};

const confidenceColor = (confidence: SignalSeverity) => {
  if (confidence === 'high') return 'success';
  if (confidence === 'medium') return 'warning';
  return 'default';
};

const getMetricStatus = (key: string, value: number): MetricStatus => {
  const threshold = thresholdMap[key];
  if (!threshold) return 'medium';
  if (value <= threshold.good) return 'good';
  if (value <= threshold.medium) return 'medium';
  return 'bad';
};

const formatBytes = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)} MB`;
  if (value >= 1000) return `${Math.round(value / 1000)} KB`;
  return `${Math.round(value)} B`;
};

const formatMetricValue = (key: string, value: number) => {
  if (key === 'cls') return value.toFixed(3);
  if (key.toLowerCase().includes('bytes')) return formatBytes(value);
  if (['totalRequests', 'thirdPartyRequests', 'longTasks', 'renderBlockingResources'].includes(key)) return value.toLocaleString();
  return `${Math.round(value).toLocaleString()} ms`;
};

const formatCount = (value: number) => value.toLocaleString();

const getSignalCategory = (signal: PerformanceSignal): SecurityCategory | undefined => {
  if (signal.category) return signal.category;
  if (signal.id.startsWith('sec-wp-')) return 'wordpress';
  if (signal.id.startsWith('sec-')) return 'headers';
  return undefined;
};

const isWordPressDetected = (cms: CMSData | undefined, technologies: Technology[]) => {
  const detectedCMS = cms?.detectedCMS?.toLowerCase();
  return (
    detectedCMS?.includes('wordpress') ||
    technologies.some((technology) => technology.category === 'cms' && technology.name.toLowerCase() === 'wordpress')
  );
};

const getWordPressSignals = (signals: PerformanceSignal[]) =>
  signals.filter((signal) => signal.id.startsWith('wp-') || signal.id.startsWith('sec-wp-'));

const getSecuritySignals = (signals: PerformanceSignal[]) => signals.filter((signal) => signal.id.startsWith('sec-'));

const getSEOSignals = (signals: PerformanceSignal[]) => signals.filter((signal) => signal.id.startsWith('seo-'));

const groupSecuritySignals = (signals: PerformanceSignal[]): SignalGroup[] => {
  const grouped = new Map<SecurityCategory, PerformanceSignal[]>();

  for (const signal of signals) {
    const category = getSignalCategory(signal);
    if (!category) continue;
    grouped.set(category, [...(grouped.get(category) ?? []), signal]);
  }

  return Object.entries(securityCategoryMeta)
    .map(([category, meta]) => ({
      category: category as SecurityCategory,
      ...meta,
      signals: grouped.get(category as SecurityCategory) ?? []
    }))
    .filter((group) => group.signals.length > 0);
};

const countSignalsBySeverity = (signals: PerformanceSignal[]) =>
  signals.reduce(
    (counts, signal) => ({
      ...counts,
      [signal.severity]: counts[signal.severity] + 1
    }),
    { high: 0, medium: 0, low: 0 } as Record<SignalSeverity, number>
  );

const wordpressIndicatorMetrics = (indicators?: WordPressRuntimeIndicators): MetricItem[] => {
  if (!indicators) return [];

  return [
    createMetric('pluginAssetRequests', 'Plugin asset requests', indicators.pluginAssetRequests, 'Requests loaded from WordPress plugins.'),
    createMetric('pluginAssetBytes', 'Plugin asset weight', indicators.pluginAssetBytes, 'Transferred bytes for WordPress plugin assets.'),
    createMetric(
      'themeAssetRequests',
      'Theme asset requests',
      indicators.themeAssetRequests,
      'Requests loaded from the active WordPress theme.'
    ),
    createMetric('wpContentAssetRequests', 'WP content requests', indicators.wpContentAssetRequests, 'Requests served from wp-content.'),
    createMetric('adminAjaxRequests', 'Admin Ajax requests', indicators.adminAjaxRequests, 'Runtime requests to admin-ajax.php.'),
    createMetric('wpJsonRequests', 'REST API requests', indicators.wpJsonRequests, 'Runtime calls to WordPress REST endpoints.')
  ].filter(Boolean) as MetricItem[];
};

const stripHtml = (value?: string) =>
  (value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const createMetric = (key: string, label: string, value: number | undefined, helper: string): MetricItem | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;

  const status = getMetricStatus(key, value);

  return {
    key,
    label,
    value,
    displayValue: formatMetricValue(key, value),
    helper,
    status
  };
};

const buildMetricGroups = (performance?: PerformanceMetrics): MetricGroup[] => {
  if (!performance) return [];

  const groups: MetricGroup[] = [
    {
      title: 'Core Web Vitals',
      description: 'User-centered loading and visual stability signals.',
      items: [
        createMetric('lcp', 'Largest Contentful Paint', performance.coreWebVitals.lcp, 'Main content should appear quickly.'),
        createMetric('cls', 'Cumulative Layout Shift', performance.coreWebVitals.cls, 'Unexpected page movement should stay low.'),
        createMetric('inp', 'Interaction to Next Paint', performance.coreWebVitals.inp, 'Interactions should respond without delay.')
      ].filter(Boolean) as MetricItem[]
    },
    {
      title: 'Loading',
      description: 'How quickly the page starts and becomes visually useful.',
      items: [
        createMetric('fcp', 'First Contentful Paint', performance.loading.fcp, 'First visible content timing.'),
        createMetric('ttfb', 'Time to First Byte', performance.loading.ttfb, 'Server and network response timing.'),
        createMetric('speedIndex', 'Speed Index', performance.loading.speedIndex, 'How quickly visible content fills in.')
      ].filter(Boolean) as MetricItem[]
    },
    {
      title: 'Interactivity',
      description: 'Main-thread cost and responsiveness risks.',
      items: [
        createMetric('tbt', 'Total Blocking Time', performance.interactivity.tbt, 'Long tasks blocking user input.'),
        createMetric('longTasks', 'Long Tasks', performance.interactivity.longTasks, 'Number of expensive main-thread tasks.'),
        createMetric(
          'mainThreadTime',
          'Main Thread Time',
          performance.interactivity.mainThreadTime,
          'Total browser work on the main thread.'
        )
      ].filter(Boolean) as MetricItem[]
    },
    {
      title: 'Resources',
      description: 'Asset weight, request pressure, and render blocking.',
      items: [
        createMetric('totalRequests', 'Total Requests', performance.resources.totalRequests, 'Network request count.'),
        createMetric('totalBytes', 'Total Page Weight', performance.resources.totalBytes, 'Total transferred asset weight.'),
        createMetric('jsBytes', 'JavaScript Weight', performance.resources.jsBytes, 'JavaScript transferred to the browser.'),
        createMetric('cssBytes', 'CSS Weight', performance.resources.cssBytes, 'Stylesheet transferred to the browser.'),
        createMetric('imageBytes', 'Image Weight', performance.resources.imageBytes, 'Image bytes loaded by the page.'),
        createMetric('fontBytes', 'Font Weight', performance.resources.fontBytes, 'Font bytes loaded by the page.'),
        createMetric('unusedJS', 'Unused JavaScript', performance.resources.unusedJS, 'Potentially removable JavaScript.'),
        createMetric('unusedCSS', 'Unused CSS', performance.resources.unusedCSS, 'Potentially removable CSS.'),
        createMetric(
          'renderBlockingResources',
          'Render Blocking Resources',
          performance.resources.renderBlockingResources,
          'Assets delaying first render.'
        )
      ].filter(Boolean) as MetricItem[]
    },
    {
      title: 'Network',
      description: 'Third-party dependency cost.',
      items: [
        createMetric('thirdPartyRequests', 'Third-party Requests', performance.network.thirdPartyRequests, 'External request count.'),
        createMetric('thirdPartyBytes', 'Third-party Weight', performance.network.thirdPartyBytes, 'External transferred bytes.')
      ].filter(Boolean) as MetricItem[]
    }
  ];

  return groups.filter((group) => group.items.length > 0);
};

const normalizeIssues = (issues: AIInsightIssue[] = []): NormalizedIssue[] =>
  issues
    .map((issue) => ({
      id: issue.id,
      title: issue.title,
      priority: issue.priority,
      category: issue.category,
      impact: issue.impact,
      effort: issue.effort,
      whyItMatters: issue.whyItMatters,
      fixStepsNonTechnical: issue.fixStepsNonTechnical ?? [],
      fixStepsTechnical: issue.fixStepsTechnical ?? [],
      description:
        stripHtml(issue.description || issue.whyItMatters || issue.recommendation) || 'Review this recommendation before applying the fix.',
      instructions: issue.instructions || issue.recommendation || ''
    }))
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

const getOverallScore = (groups: MetricGroup[]) => {
  const metrics = groups.flatMap((group) => group.items);
  if (!metrics.length) return 0;

  const score = metrics.reduce((total, metric) => total + statusScore[metric.status], 0) / metrics.length;
  return Math.round(score);
};

function AnalysisLoading({ progress, onCancel }: { progress: number; onCancel: () => void }) {
  return (
    <MainCard
      sx={(theme) => ({
        mt: 4,
        borderColor: alpha(theme.palette.primary.main, 0.28),
        boxShadow: `0 24px 70px ${alpha(theme.palette.primary.main, 0.12)}`
      })}
    >
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h4">Running full website analysis</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              Scanning runtime signals, Lighthouse metrics, on-page SEO from the crawl, CMS clues, passive security checks, and AI
              recommendations. This can take a minute.
            </Typography>
          </Box>
          <Button color="secondary" variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 999 }} />
        <Grid container spacing={2}>
          {['Collecting page data', 'Checking SEO, CMS, and security', 'Generating fix instructions'].map((step) => (
            <Grid key={step} size={{ xs: 12, md: 4 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  {step}
                </Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </MainCard>
  );
}

function SummaryPanel({ report, score, issueCount }: { report: AnalysisReport; score: number; issueCount: number }) {
  const theme = useTheme();

  return (
    <MainCard
      sx={{
        overflow: 'hidden',
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)}, transparent 44%)`,
          pointerEvents: 'none'
        }
      }}
    >
      <Grid container spacing={3} sx={{ position: 'relative', alignItems: 'center' }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={1.5}>
            <Chip color="primary" variant="light" label="Analysis complete" sx={{ width: 'fit-content' }} />
            <Typography variant="h3">Optimization summary</Typography>
            <Typography color="text.secondary">
              {report.aiInsights?.summary || 'The analyzer finished but did not return a written summary.'}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Chip variant="outlined" label={report.url} />
              <Chip variant="outlined" label={new Date(report.generatedAt).toLocaleString()} />
              <Chip
                variant="outlined"
                color={issueCount > 0 ? 'warning' : 'success'}
                label={`${issueCount} issue${issueCount === 1 ? '' : 's'}`}
              />
            </Stack>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack sx={{ alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress
                variant="determinate"
                value={score}
                size={136}
                thickness={4}
                color={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error'}
              />
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stack sx={{ alignItems: 'center' }}>
                  <Typography variant="h2">{score}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    score
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </MainCard>
  );
}

function SectionsSommairePanel({ sections, onSelect }: { sections: SectionNavItem[]; onSelect: (id: string) => void }) {
  return (
    <MainCard title="Sommaire" subheader="Jump to any section in this analysis report">
      <Grid container spacing={2}>
        {sections.map((section) => (
          <Grid key={section.id} size={{ xs: 12, sm: 6, lg: 4 }}>
            <ButtonBase
              onClick={() => onSelect(section.id)}
              sx={(theme) => ({
                width: '100%',
                display: 'block',
                textAlign: 'left',
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                p: 2,
                transition: theme.transitions.create(['transform', 'border-color', 'background-color'], {
                  duration: theme.transitions.duration.shorter
                }),
                '&:hover': {
                  transform: 'translateY(-2px)',
                  borderColor: alpha(theme.palette.primary.main, 0.45),
                  bgcolor: alpha(theme.palette.primary.main, 0.05)
                }
              })}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h5">{section.label}</Typography>
                  {section.badge && <Chip size="small" variant="light" color="primary" label={section.badge} />}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {section.description}
                </Typography>
              </Stack>
            </ButtonBase>
          </Grid>
        ))}
      </Grid>
    </MainCard>
  );
}

function SEOPanel({ seo, signals }: { seo?: SEOContext; signals: PerformanceSignal[] }) {
  if (!seo && signals.length === 0) return null;

  return (
    <MainCard
      title="On-page SEO (crawl)"
      subheader="Checks use HTML and response headers from this crawl only—not a full Search Console or index coverage audit."
    >
      <Stack spacing={3}>
        {seo && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <Chip variant="outlined" label={seo.titleLength !== undefined ? `Title length: ${seo.titleLength}` : 'Title length: —'} />
            <Chip
              variant="outlined"
              label={
                seo.metaDescriptionLength !== undefined
                  ? `Meta description length: ${seo.metaDescriptionLength}`
                  : 'Meta description length: —'
              }
            />
            <Chip
              color={seo.hasCanonical ? 'success' : 'warning'}
              variant="light"
              label={seo.hasCanonical ? 'Canonical: yes' : 'Canonical: no'}
            />
            <Chip color={seo.isNoindex ? 'warning' : 'success'} variant="light" label={seo.isNoindex ? 'Noindex: yes' : 'Noindex: no'} />
          </Stack>
        )}

        <Box>
          <Typography variant="h4" sx={{ mb: 1.5 }}>
            SEO findings
          </Typography>
          <SignalCards signals={signals} emptyMessage="No SEO issues detected from this crawl." />
        </Box>
      </Stack>
    </MainCard>
  );
}

function TechnologiesPanel({ technologies }: { technologies: Technology[] }) {
  return (
    <MainCard title="Detected technologies" subheader="Deterministic stack detection from runtime and response signals">
      {technologies.length === 0 ? (
        <Alert color="warning" variant="outlined">
          No technologies were detected with medium or high confidence.
        </Alert>
      ) : (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          {technologies.map((technology) => (
            <Chip
              key={`${technology.category}-${technology.name}`}
              color={confidenceColor(technology.confidence)}
              variant="outlined"
              label={`${technology.name} (${technology.category}) - ${technology.confidence}`}
            />
          ))}
        </Stack>
      )}
    </MainCard>
  );
}

function SignalCards({ signals, emptyMessage }: { signals: PerformanceSignal[]; emptyMessage: string }) {
  if (signals.length === 0) {
    return (
      <Alert color="success" variant="outlined">
        {emptyMessage}
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      {signals.map((signal) => (
        <Box
          key={signal.id}
          sx={(theme) => ({
            p: 2,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette[priorityColor(signal.severity)].main, 0.28)}`,
            bgcolor: alpha(theme.palette[priorityColor(signal.severity)].main, 0.06)
          })}
        >
          <Stack spacing={1}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
              <Chip color={priorityColor(signal.severity)} variant="light" label={signal.severity.toUpperCase()} />
              <Chip variant="outlined" label={signal.id} />
            </Stack>
            <Typography variant="h5">{signal.message}</Typography>
            {signal.evidence && <Typography color="text.secondary">Evidence: {signal.evidence}</Typography>}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

function WordPressPanel({ cms, signals, isWordPress }: { cms?: CMSData; signals: PerformanceSignal[]; isWordPress: boolean }) {
  if (!cms && !isWordPress && signals.length === 0) return null;

  const indicators = cms?.wordpress?.indicators;
  const metrics = wordpressIndicatorMetrics(indicators);
  const pluginNames = cms?.pluginFindings?.map((plugin) => plugin.name) ?? cms?.plugins ?? [];
  const themeNames = cms?.themeFindings?.map((theme) => theme.name) ?? cms?.themes ?? [];

  return (
    <MainCard title="WordPress CMS analysis" subheader="CMS-specific runtime signals, plugin pressure, and WordPress security exposure">
      <Stack spacing={3}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Chip
            color={isWordPress ? 'success' : 'default'}
            variant="light"
            label={cms?.detectedCMS || (isWordPress ? 'WordPress' : 'CMS detected')}
          />
          <Chip variant="outlined" label={`${pluginNames.length} plugin${pluginNames.length === 1 ? '' : 's'}`} />
          <Chip variant="outlined" label={`${themeNames.length} theme${themeNames.length === 1 ? '' : 's'}`} />
        </Stack>

        {(pluginNames.length > 0 || themeNames.length > 0) && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={(theme) => ({ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` })}>
                <Typography variant="h5">Plugins</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  {pluginNames.length > 0 ? pluginNames.join(', ') : 'No plugin names were returned.'}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={(theme) => ({ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` })}>
                <Typography variant="h5">Themes</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  {themeNames.length > 0 ? themeNames.join(', ') : 'No theme names were returned.'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}

        {metrics.length > 0 && (
          <Grid container spacing={2}>
            {metrics.map((metric) => (
              <Grid key={metric.key} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Box
                  sx={(theme) => ({
                    height: '100%',
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette[statusColor(metric.status)].main, 0.35)}`,
                    bgcolor: alpha(theme.palette[statusColor(metric.status)].main, 0.08)
                  })}
                >
                  <Stack spacing={1}>
                    <Typography variant="subtitle1">{metric.label}</Typography>
                    <Typography variant="h4">
                      {metric.key.toLowerCase().includes('bytes') ? formatBytes(metric.value) : formatCount(metric.value)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {metric.helper}
                    </Typography>
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        <Box>
          <Typography variant="h4" sx={{ mb: 1.5 }}>
            WordPress findings
          </Typography>
          <SignalCards signals={signals} emptyMessage="No WordPress-specific issues were returned for this analysis." />
        </Box>
      </Stack>
    </MainCard>
  );
}

function SecurityPanel({ security, signals }: { security?: SecurityContext; signals: PerformanceSignal[] }) {
  if (!security && signals.length === 0) return null;

  const groups = groupSecuritySignals(signals);
  const counts = countSignalsBySeverity(signals);
  const severitySummaries: Array<{ label: string; count: number; color: 'error' | 'warning' | 'success' }> = [
    { label: 'High', count: counts.high, color: 'error' },
    { label: 'Medium', count: counts.medium, color: 'warning' },
    { label: 'Low', count: counts.low, color: 'success' }
  ];

  return (
    <MainCard
      title="Security checks"
      subheader="Passive public checks for transport, headers, cookies, disclosure, WordPress exposure, and dependencies"
    >
      <Stack spacing={3}>
        <Grid container spacing={2}>
          {severitySummaries.map(({ label, count, color }) => (
            <Grid key={label} size={{ xs: 12, sm: 4 }}>
              <Box sx={(theme) => ({ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette[color].main, 0.08) })}>
                <Typography variant="h3">{count}</Typography>
                <Typography color="text.secondary">{label} severity findings</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {security && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            {security.tls && (
              <Chip
                color={security.tls.isHttps ? 'success' : 'error'}
                variant="light"
                label={security.tls.isHttps ? 'HTTPS enabled' : 'HTTP only'}
              />
            )}
            {security.tls?.tlsVersion && <Chip variant="outlined" label={`TLS ${security.tls.tlsVersion}`} />}
            {typeof security.tls?.certificateDaysUntilExpiry === 'number' && (
              <Chip variant="outlined" label={`Certificate expires in ${security.tls.certificateDaysUntilExpiry} days`} />
            )}
            {security.dependencies && (
              <Chip
                variant="outlined"
                label={`${security.dependencies.thirdPartyScriptsWithoutSri} third-party script${security.dependencies.thirdPartyScriptsWithoutSri === 1 ? '' : 's'} without SRI`}
              />
            )}
          </Stack>
        )}

        {groups.length === 0 ? (
          <Alert color="success" variant="outlined">
            No deterministic security findings were returned.
          </Alert>
        ) : (
          <Stack spacing={2.5}>
            {groups.map((group) => (
              <Box key={group.category}>
                <Typography variant="h4">{group.title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
                  {group.description}
                </Typography>
                <SignalCards signals={group.signals} emptyMessage="No findings in this category." />
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </MainCard>
  );
}

function IssuesPanel({ issues }: { issues: NormalizedIssue[] }) {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  return (
    <Box id="issues" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN_TOP }}>
      <MainCard title="Priority issues and fixes" subheader="AI-detected issues sorted by business impact and severity">
        {issues.length === 0 ? (
          <Alert color="success" variant="outlined">
            No priority issues were returned. Keep monitoring important pages as content and scripts change.
          </Alert>
        ) : (
          <Stack spacing={2}>
            {issues.map((issue, index) => (
              <Box
                key={`${issue.title}-${index}`}
                sx={(theme) => ({
                  p: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.background.default, 0.55)
                })}
              >
                <Stack spacing={1.25}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
                    <Chip color={priorityColor(issue.priority)} variant="light" label={issue.priority.toUpperCase()} />
                    {issue.category && <Chip variant="outlined" label={issue.category} />}
                    {issue.impact && <Chip variant="outlined" label={`Impact: ${issue.impact}`} />}
                    {issue.effort && <Chip variant="outlined" label={`Effort: ${issue.effort}`} />}
                  </Stack>
                  <Typography variant="h5">{issue.title}</Typography>
                  {issue.whyItMatters && <Typography color="text.secondary">{issue.whyItMatters}</Typography>}
                  <Typography color="text.secondary">{issue.description}</Typography>
                  {issue.instructions && (
                    <>
                      <Button
                        color="primary"
                        variant="outlined"
                        sx={{ alignSelf: 'flex-start' }}
                        onClick={() => setExpandedIssue(expandedIssue === `${issue.title}-${index}` ? null : `${issue.title}-${index}`)}
                      >
                        {expandedIssue === `${issue.title}-${index}` ? 'Hide instructions' : 'How to fix it'}
                      </Button>
                      <Collapse in={expandedIssue === `${issue.title}-${index}`} timeout="auto" unmountOnExit>
                        <Box
                          sx={(theme) => ({
                            mt: 0.5,
                            p: 2,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.primary.main, 0.06),
                            color: 'text.primary',
                            '& p': { mt: 0, mb: 1 },
                            '& ul, & ol': { pl: 3, mb: 0 },
                            '& li': { mb: 0.75 },
                            '& strong': { color: 'text.primary' }
                          })}
                          dangerouslySetInnerHTML={{ __html: issue.instructions }}
                        />
                      </Collapse>
                    </>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </MainCard>
    </Box>
  );
}

function MetricsPanel({ groups }: { groups: MetricGroup[] }) {
  return (
    <Stack spacing={3} id="metrics" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN_TOP }}>
      <Box>
        <Typography variant="h3">All performance metrics</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          Each metric is highlighted against practical performance thresholds.
        </Typography>
      </Box>
      {groups.length === 0 ? (
        <Alert color="warning" variant="outlined">
          No Lighthouse performance metrics were returned for this run.
        </Alert>
      ) : (
        groups.map((group) => (
          <MainCard key={group.title} title={group.title} subheader={group.description}>
            <Grid container spacing={2}>
              {group.items.map((metric) => (
                <Grid key={metric.key} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Box
                    sx={(theme) => ({
                      height: '100%',
                      p: 2,
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette[statusColor(metric.status)].main, 0.35)}`,
                      bgcolor: alpha(theme.palette[statusColor(metric.status)].main, 0.08)
                    })}
                  >
                    <Stack spacing={1.25}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle1">{metric.label}</Typography>
                        <Chip size="small" color={statusColor(metric.status)} variant="light" label={statusLabels[metric.status]} />
                      </Stack>
                      <Typography variant="h3">{metric.displayValue}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={statusScore[metric.status]}
                        color={statusColor(metric.status)}
                        sx={{ height: 7, borderRadius: 999 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {metric.helper}
                      </Typography>
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </MainCard>
        ))
      )}
    </Stack>
  );
}

// ==============================|| ANALYZER - LANDING PAGE ||============================== //

export default function AnalyzerLanding() {
  const theme = useTheme();
  const resultRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(8);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showUrlError = touched && url.length > 0 && !isValidUrl(url);
  const canSubmit = isValidUrl(url) && !isLoading;

  const metricGroups = useMemo(() => buildMetricGroups(report?.context.performance), [report]);
  const technologies = useMemo(() => report?.context.techDetection?.technologies ?? [], [report]);
  const issues = useMemo(() => normalizeIssues(report?.aiInsights?.issues), [report]);
  const overallScore = useMemo(() => getOverallScore(metricGroups), [metricGroups]);
  const isWordPressCMS = useMemo(() => isWordPressDetected(report?.context.cms, technologies), [report, technologies]);
  const wordpressSignals = useMemo(() => getWordPressSignals(report?.signals ?? []), [report]);
  const securitySignals = useMemo(() => getSecuritySignals(report?.signals ?? []), [report]);
  const seoSignals = useMemo(() => getSEOSignals(report?.signals ?? []), [report]);
  const hasWordPressSection = Boolean(report?.context.cms || isWordPressCMS || wordpressSignals.length > 0);
  const hasSecuritySection = Boolean(report?.context.security || securitySignals.length > 0);
  const hasSEOSection = Boolean(report?.context.seo || seoSignals.length > 0);
  const hasErrorsSection = Boolean(report?.errors?.length);
  const sectionNavItems = useMemo<SectionNavItem[]>(() => {
    return [
      {
        id: 'technologies',
        label: 'Technologies',
        description: 'Detected stack, confidence, and runtime fingerprints.',
        badge: `${technologies.length}`
      },
      {
        id: 'seo',
        label: 'SEO',
        description: 'On-page signals from crawled HTML and response headers.',
        badge: `${seoSignals.length}`
      },
      {
        id: 'wordpress',
        label: 'WordPress',
        description: 'CMS indicators, plugin/theme inventory, and WP findings.',
        badge: `${wordpressSignals.length}`
      },
      {
        id: 'security',
        label: 'Security',
        description: 'Transport, headers, cookies, and exposure checks.',
        badge: `${securitySignals.length}`
      },
      {
        id: 'errors',
        label: 'Errors',
        description: 'Warnings produced while collecting this analysis.',
        badge: report?.errors?.length ? `${report.errors.length}` : undefined
      },
      {
        id: 'issues',
        label: 'Priority issues and fixes',
        description: 'Top AI-detected issues ordered by severity and impact.',
        badge: `${issues.length}`
      },
      {
        id: 'metrics',
        label: 'Metrics',
        description: 'Core web vitals and full Lighthouse metric groups.',
        badge: `${metricGroups.length}`
      }
    ].filter(
      (section) =>
        (section.id !== 'wordpress' || hasWordPressSection) &&
        (section.id !== 'security' || hasSecuritySection) &&
        (section.id !== 'seo' || hasSEOSection) &&
        (section.id !== 'errors' || hasErrorsSection)
    );
  }, [
    hasErrorsSection,
    hasSEOSection,
    hasSecuritySection,
    hasWordPressSection,
    issues.length,
    metricGroups.length,
    report?.errors,
    securitySignals.length,
    seoSignals.length,
    technologies.length,
    wordpressSignals.length
  ]);

  useEffect(() => {
    if (!isLoading) return undefined;

    setProgress(8);
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(92, current + Math.max(1, (95 - current) * 0.08)));
    }, 900);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  useEffect(() => {
    if ((report || error) && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [report, error]);

  useEffect(() => {
    if (!isLoading || !loadingRef.current) return;

    loadingRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [isLoading]);

  const handleSectionSelect = (sectionId: string) => {
    const sectionElement = document.getElementById(sectionId);
    if (!sectionElement) return;

    sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);

    if (!isValidUrl(url)) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Analysis failed.');
      }

      setProgress(100);
      setReport(data as AnalysisReport);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') {
        setError('Analysis cancelled.');
      } else {
        setError(requestError instanceof Error ? requestError.message : 'Analysis failed.');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  return (
    <Box>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          pt: { xs: 16, md: 19 },
          pb: { xs: 8, md: 12 },
          '&:before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 50% 20%, ${alpha(theme.palette.primary.main, 0.18)}, transparent 32%), radial-gradient(circle at 12% 72%, ${alpha(
              theme.palette.success.main,
              0.14
            )}, transparent 28%)`
          }
        }}
      >
        <Container sx={{ position: 'relative' }}>
          <Grid container spacing={4} sx={{ alignItems: 'center', justifyContent: 'center' }}>
            <Grid size={{ xs: 12, md: 10, lg: 9 }}>
              <Stack spacing={4} sx={{ textAlign: 'center', alignItems: 'center' }}>
                <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                  <Stack spacing={2} sx={{ alignItems: 'center' }}>
                    <Chip color="primary" variant="light" label="AI website performance, CMS, SEO & security analyzer" />
                    <Typography
                      variant="h1"
                      sx={{
                        maxWidth: 920,
                        fontSize: { xs: '2.25rem', sm: '3rem', md: '4.25rem' },
                        lineHeight: 1.05,
                        letterSpacing: -1.5
                      }}
                    >
                      Find the issues slowing down your website before users do.
                    </Typography>
                    <Typography variant="h5" color="text.secondary" sx={{ maxWidth: 760, fontWeight: 400 }}>
                      Run a complete scan for performance, runtime signals, on-page SEO from the crawl, WordPress CMS clues, passive
                      security checks, and AI-generated fixes. Paste a URL and get a prioritized action plan in minutes.
                    </Typography>
                  </Stack>
                </motion.div>

                <MainCard
                  sx={{
                    width: '100%',
                    maxWidth: 900,
                    borderRadius: 3,
                    boxShadow: `0 24px 80px ${alpha(theme.palette.secondary.dark, 0.16)}`
                  }}
                  contentSX={{ p: { xs: 2, sm: 3 } }}
                >
                  <Box component="form" onSubmit={handleSubmit}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                      <TextField
                        fullWidth
                        autoFocus
                        label="Website URL"
                        placeholder="https://example.com"
                        value={url}
                        error={showUrlError}
                        helperText={showUrlError ? 'Enter a valid http or https URL.' : 'Use the public page you want to optimize.'}
                        disabled={isLoading}
                        onBlur={() => setTouched(true)}
                        onChange={(event) => setUrl(event.target.value.trim())}
                        slotProps={{ htmlInput: { inputMode: 'url' } }}
                      />
                      <AnimateButton>
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          disabled={!canSubmit}
                          sx={{ height: { md: 56 }, minWidth: { xs: '100%', md: 180 }, whiteSpace: 'nowrap' }}
                        >
                          Start analyze
                        </Button>
                      </AnimateButton>
                    </Stack>
                  </Box>
                </MainCard>

                <Grid container spacing={2} sx={{ width: '100%', maxWidth: 900 }}>
                  {[
                    ['Performance metrics', 'Lighthouse-backed measurements and resource breakdowns.'],
                    ['On-page SEO (crawl)', 'Title, meta description, canonical, and robots signals from HTML and headers.'],
                    ['WordPress & CMS signals', 'CMS detection plus WordPress plugin, theme, and REST activity insights.'],
                    ['Security checks', 'Passive public checks for headers, TLS, cookies, CORS, and exposure risks.']
                  ].map(([title, text]) => (
                    <Grid key={title} size={{ xs: 12, md: 6, lg: 3 }}>
                      <MainCard contentSX={{ p: 2.25 }} sx={{ height: '100%', bgcolor: alpha(theme.palette.background.paper, 0.74) }}>
                        <Typography variant="h5">{title}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                          {text}
                        </Typography>
                      </MainCard>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container ref={resultRef} sx={{ py: { xs: 6, md: 9 } }}>
        {isLoading && (
          <Box ref={loadingRef}>
            <AnalysisLoading progress={progress} onCancel={handleCancel} />
          </Box>
        )}

        {error && (
          <Alert severity="error" variant="outlined" sx={{ mt: 4 }}>
            {error}
          </Alert>
        )}

        {report && (
          <Stack spacing={4}>
            <SummaryPanel report={report} score={overallScore} issueCount={issues.length} />
            {sectionNavItems.length > 0 && <SectionsSommairePanel sections={sectionNavItems} onSelect={handleSectionSelect} />}
            <IssuesPanel issues={issues} />
            <Box id="technologies" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN_TOP }}>
              <TechnologiesPanel technologies={technologies} />
            </Box>
            {hasSEOSection && (
              <Box id="seo" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN_TOP }}>
                <SEOPanel seo={report.context.seo} signals={seoSignals} />
              </Box>
            )}
            {hasWordPressSection && (
              <Box id="wordpress" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN_TOP }}>
                <WordPressPanel cms={report.context.cms} signals={wordpressSignals} isWordPress={isWordPressCMS} />
              </Box>
            )}
            {hasSecuritySection && (
              <Box id="security" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN_TOP }}>
                <SecurityPanel security={report.context.security} signals={securitySignals} />
              </Box>
            )}

            {hasErrorsSection && (
              <Box id="errors" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN_TOP }}>
                <Alert severity="warning" variant="outlined">
                  {report.errors?.join(' ')}
                </Alert>
              </Box>
            )}
            <MetricsPanel groups={metricGroups} />
          </Stack>
        )}
      </Container>
    </Box>
  );
}

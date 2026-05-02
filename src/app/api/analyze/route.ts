// next
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_ANALYZER_API_URL = 'http://localhost:4000';
const ANALYSIS_TIMEOUT_MS = 120000;

const getAnalyzerApiUrl = () =>
  (process.env.ANALYZER_API_URL || process.env.NEXT_APP_ANALYZER_API_URL || DEFAULT_ANALYZER_API_URL).replace(/\/$/, '');

const isValidHttpUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const readErrorMessage = async (response: Response) => {
  try {
    const body = await response.json();
    return body?.message || body?.error || 'The analyzer service could not process this URL.';
  } catch {
    return 'The analyzer service could not process this URL.';
  }
};

// ==============================|| ANALYZER - API PROXY ||============================== //

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.', message: 'Send JSON with a valid url field.' }, { status: 400 });
  }

  const url = typeof body === 'object' && body !== null && 'url' in body ? (body as { url?: unknown }).url : undefined;

  if (!isValidHttpUrl(url)) {
    return NextResponse.json({ error: 'Invalid URL.', message: 'Enter a valid http or https URL.' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

  try {
    const response = await fetch(`${getAnalyzerApiUrl()}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      return NextResponse.json({ error: 'Analysis failed', message }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === 'AbortError'
        ? 'The analysis took too long. Try again with a smaller page or check the backend logs.'
        : 'Could not reach the analyzer service. Make sure the backend is running.';

    return NextResponse.json({ error: 'Analyzer unavailable', message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

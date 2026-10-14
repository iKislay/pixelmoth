/**
 * Demo data for the public `/demo` dashboard.
 *
 * Everything here is generated in the browser from a fixed seed, so the page is
 * fully interactive (periods, filters, tabs, charts, visitor profiles, funnels)
 * without touching the API or requiring a login.
 */
import { bucketLabels, resolveRange, type Granularity } from '../../server/lib/time';
import type { BreakdownRow, Kpis, Overview, Site } from './api';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;
const NOW = Date.now();

export const DEMO_SITE_ID = 'demo';

export const demoSite: Site = {
  id: DEMO_SITE_ID,
  name: 'dummy website',
  domain: 'dummy-website.com',
  timezone: 'UTC',
  currency: 'USD',
  api_key: 'pm_demo_only',
  dodo_webhook_secret: null,
  created_at: NOW - 365 * DAY,
  visitors24h: 0,
  online: 9,
};

interface DemoVisitor {
  id: string;
  first_seen: number;
  user_id: string | null;
  name: string | null;
  email: string | null;
}

interface SessionRow {
  id: string;
  visitor_id: string;
  started_at: number;
  last_seen_at: number;
  duration: number;
  pageviews: number;
  goals: number;
  hostname: string;
  entry_page: string;
  exit_page: string;
  referrer: string | null;
  referrer_domain: string | null;
  source: string;
  channel: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  ref: string | null;
  country: string;
  region: string;
  city: string;
  browser: string;
  os: string;
  device: string;
}

interface EventRow {
  id: number;
  visitor_id: string;
  session_id: string;
  ts: number;
  type: string;
  name: string | null;
  path: string;
  props: string | null;
}

interface PaymentRow {
  id: string;
  ts: number;
  amount: number;
  kind: 'payment';
  currency: string;
  visitor_id: string | null;
  session_id: string | null;
  email: string | null;
  name: string | null;
  renewal: number;
  matched_by: string | null;
}

interface FunnelDef {
  id: string;
  name: string;
  steps: { type: 'page' | 'goal'; value: string }[];
  created_at: number;
}

type Filters = Record<string, string>;
type Rng = () => number;

interface Dataset {
  visitors: DemoVisitor[];
  sessions: SessionRow[];
  events: EventRow[];
  payments: PaymentRow[];
  bySession: Map<string, SessionRow>;
  byVisitor: Map<string, DemoVisitor>;
  eventsBySession: Map<string, EventRow[]>;
  eventsByVisitor: Map<string, EventRow[]>;
}

// ---------------------------------------------------------------------------
// Random helpers

function rngFactory(seed: number): Rng {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: Rng, xs: T[]): T {
  return xs[Math.floor(r() * xs.length)];
}

function pickWeighted<T>(r: Rng, options: [T, number][]): T {
  let total = 0;
  for (const [, w] of options) total += w;
  let n = r() * total;
  for (const [value, w] of options) {
    n -= w;
    if (n <= 0) return value;
  }
  return options[options.length - 1][0];
}

function id(r: Rng): string {
  let s = '';
  for (let i = 0; i < 16; i++) s += Math.floor(r() * 16).toString(16);
  return s;
}

// ---------------------------------------------------------------------------
// Fictitious traffic

interface SourceDef {
  source: string;
  domain: string | null;
  channel: string;
  weight: number;
  campaigns?: string[];
  terms?: string[];
  refs?: string[];
  utmSource?: string;
  utmMedium?: string;
}

const SOURCES: SourceDef[] = [
  { source: 'Direct/None', domain: null, channel: 'Direct', weight: 22 },
  { source: 'Google', domain: 'google.com', channel: 'Organic Search', weight: 18, terms: ['open source analytics', 'cloudflare analytics', 'google analytics alternative', 'privacy friendly analytics', 'self hosted analytics'] },
  { source: 'Google', domain: 'google.com', channel: 'Paid', weight: 4, campaigns: ['brand-search', 'analytics-keywords'], terms: ['web analytics tool', 'track revenue analytics'], utmSource: 'google', utmMedium: 'cpc' },
  { source: 'X', domain: 'x.com', channel: 'Organic Social', weight: 13, campaigns: ['launch-week', 'build-in-public', 'analytics-thread'], refs: ['launch-tweet', 'build-in-public-thread'], utmSource: 'x', utmMedium: 'social' },
  { source: 'ChatGPT', domain: 'chatgpt.com', channel: 'AI', weight: 8 },
  { source: 'Reddit', domain: 'reddit.com', channel: 'Organic Social', weight: 6, campaigns: ['r-saas', 'r-webdev'], utmSource: 'reddit', utmMedium: 'social' },
  { source: 'LinkedIn', domain: 'linkedin.com', channel: 'Organic Social', weight: 5, campaigns: ['founder-post'], utmSource: 'linkedin', utmMedium: 'social' },
  { source: 'Hacker News', domain: 'news.ycombinator.com', channel: 'Organic Social', weight: 4, refs: ['show-hn'], utmSource: 'hackernews', utmMedium: 'social' },
  { source: 'Product Hunt', domain: 'producthunt.com', channel: 'Referral', weight: 4, campaigns: ['product-hunt-launch'], utmSource: 'producthunt', utmMedium: 'referral' },
  { source: 'GitHub', domain: 'github.com', channel: 'Referral', weight: 3 },
  { source: 'DuckDuckGo', domain: 'duckduckgo.com', channel: 'Organic Search', weight: 3 },
  { source: 'Claude', domain: 'claude.ai', channel: 'AI', weight: 3 },
  { source: 'Perplexity', domain: 'perplexity.ai', channel: 'AI', weight: 2 },
  { source: 'Newsletter', domain: null, channel: 'Email', weight: 4, campaigns: ['weekly-digest', 'product-update'], utmSource: 'newsletter', utmMedium: 'email' },
  { source: 'YouTube', domain: 'youtube.com', channel: 'Organic Social', weight: 2, campaigns: ['demo-video'], utmSource: 'youtube', utmMedium: 'social' },
  { source: 'Medium', domain: 'medium.com', channel: 'Referral', weight: 2, campaigns: ['how-i-built-pixelmoth'], utmSource: 'medium', utmMedium: 'referral' },
  { source: 'Substack', domain: 'substack.com', channel: 'Email', weight: 2, campaigns: ['analytics-deep-dive'], utmSource: 'substack', utmMedium: 'email' },
  { source: 'Bing', domain: 'bing.com', channel: 'Organic Search', weight: 1 },
  { source: 'Instagram', domain: 'instagram.com', channel: 'Organic Social', weight: 1 },
];

const SOURCE_WEIGHTS: [SourceDef, number][] = SOURCES.map((s) => [s, s.weight]);

const COUNTRIES: { cc: string; weight: number; cities: [string, string][] }[] = [
  { cc: 'US', weight: 32, cities: [['San Francisco', 'California'], ['New York', 'New York'], ['Austin', 'Texas'], ['Seattle', 'Washington'], ['Denver', 'Colorado']] },
  { cc: 'IN', weight: 14, cities: [['Bengaluru', 'Karnataka'], ['Mumbai', 'Maharashtra'], ['Delhi', 'Delhi']] },
  { cc: 'GB', weight: 9, cities: [['London', 'England'], ['Manchester', 'England']] },
  { cc: 'DE', weight: 7, cities: [['Berlin', 'Berlin'], ['Munich', 'Bavaria']] },
  { cc: 'CA', weight: 6, cities: [['Toronto', 'Ontario'], ['Vancouver', 'British Columbia']] },
  { cc: 'FR', weight: 5, cities: [['Paris', 'Île-de-France']] },
  { cc: 'NL', weight: 4, cities: [['Amsterdam', 'North Holland']] },
  { cc: 'AU', weight: 4, cities: [['Sydney', 'New South Wales'], ['Melbourne', 'Victoria']] },
  { cc: 'BR', weight: 4, cities: [['São Paulo', 'São Paulo']] },
  { cc: 'SG', weight: 3, cities: [['Singapore', 'Singapore']] },
  { cc: 'JP', weight: 3, cities: [['Tokyo', 'Tokyo']] },
  { cc: 'ES', weight: 3, cities: [['Madrid', 'Madrid']] },
  { cc: 'SE', weight: 2, cities: [['Stockholm', 'Stockholm']] },
  { cc: 'PL', weight: 2, cities: [['Warsaw', 'Masovia']] },
  { cc: 'NG', weight: 2, cities: [['Lagos', 'Lagos']] },
];

const COUNTRY_WEIGHTS: [typeof COUNTRIES[number], number][] = COUNTRIES.map((c) => [c, c.weight]);

const PAGES: [string, number][] = [
  ['/', 34],
  ['/pricing', 12],
  ['/features', 7],
  ['/blog/open-source-analytics', 8],
  ['/blog/cloudflare-analytics', 7],
  ['/blog/launch', 5],
  ['/docs', 5],
  ['/docs/quickstart', 4],
  ['/customers', 4],
  ['/integrations', 3],
  ['/vs/google-analytics', 3],
  ['/changelog', 2],
  ['/about', 2],
  ['/signup', 2],
  ['/login', 2],
];

const GOALS: [string, number][] = [
  ['signup', 6],
  ['checkout', 3],
  ['demo_request', 2],
  ['newsletter_signup', 3],
  ['pricing_view', 4],
];

const OUTBOUND = ['https://github.com/ikislay/pixelmoth', 'https://x.com/ikislay', 'https://discord.gg/pixelmoth', 'https://www.producthunt.com/products/pixelmoth'];

const AMOUNTS: [number, number][] = [
  [900, 42],
  [1900, 28],
  [4900, 20],
  [9900, 10],
];

const HOUR_WEIGHTS: [number, number][] = [0.3, 0.2, 0.15, 0.15, 0.2, 0.4, 0.7, 1.1, 1.7, 2.2, 2.4, 2.1, 1.8, 2.0, 2.3, 2.2, 1.9, 1.7, 1.5, 1.8, 2.1, 1.9, 1.2, 0.6].map((w, h) => [h, w]);

const FIRST_NAMES = ['Ava', 'Liam', 'Noah', 'Mia', 'Ethan', 'Sofia', 'Lucas', 'Amara', 'Ravi', 'Elena', 'Jonas', 'Priya', 'Hugo', 'Nora', 'Kai', 'Leila', 'Mateo', 'Zoe', 'Owen', 'Isla'];
const LAST_NAMES = ['Patel', 'Kim', 'Garcia', 'Muller', 'Silva', 'Chen', 'Okafor', 'Rossi', 'Novak', 'Ahmed', 'Larsen', 'Tanaka', 'Moreau', 'Singh', 'Brown', 'Costa'];
const EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'proton.me', 'hey.com', 'icloud.com', 'acme.io'];

function assignIdentity(r: Rng, v: DemoVisitor) {
  if (v.email) return;
  const first = pick(r, FIRST_NAMES);
  const last = pick(r, LAST_NAMES);
  v.name = `${first} ${last}`;
  v.email = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '') + '@' + pick(r, EMAIL_DOMAINS);
  v.user_id = 'usr_' + id(r).slice(0, 8);
}

function pickClient(r: Rng): { browser: string; os: string; device: string } {
  const device = pickWeighted(r, [
    ['Desktop', 63],
    ['Mobile', 30],
    ['Tablet', 7],
  ]);
  if (device === 'Mobile') {
    const browser = pickWeighted(r, [
      ['Mobile Safari', 52],
      ['Chrome', 38],
      ['Samsung Internet', 10],
    ]);
    return { device, browser, os: browser === 'Mobile Safari' ? 'iOS' : 'Android' };
  }
  if (device === 'Tablet') return { device, browser: 'Safari', os: 'iPadOS' };
  const browser = pickWeighted(r, [
    ['Chrome', 44],
    ['Safari', 22],
    ['Firefox', 12],
    ['Edge', 10],
    ['Arc', 6],
    ['Brave', 4],
    ['Opera', 2],
  ]);
  const os = pickWeighted(r, [
    ['Mac OS', browser === 'Safari' || browser === 'Arc' ? 70 : 22],
    ['Windows', browser === 'Safari' || browser === 'Arc' ? 10 : 54],
    ['Linux', 12],
    ['Chrome OS', 2],
  ]);
  return { device, browser, os };
}

function build(): Dataset {
  const r = rngFactory(0x5eed2026);
  const visitors: DemoVisitor[] = [];
  const sessions: SessionRow[] = [];
  const events: EventRow[] = [];
  const payments: PaymentRow[] = [];
  const sessionVisitor = new Map<string, DemoVisitor>();
  const paidVisitors = new Set<string>();
  let evSeq = 1;
  let paySeq = 1;
  const todayStart = Math.floor(NOW / DAY) * DAY;

  function addPayment(session: SessionRow, visitor: DemoVisitor, tsOverride?: number) {
    assignIdentity(r, visitor);
    const renewal = paidVisitors.has(visitor.id) && r() < 0.4 ? 1 : 0;
    const amount = pickWeighted(r, AMOUNTS);
    const ts = Math.max(
      session.started_at + MINUTE,
      Math.min(tsOverride ?? session.last_seen_at + Math.floor(r() * 45 * MINUTE), NOW - 60_000),
    );
    payments.push({
      id: 'demo_pay_' + paySeq++,
      ts,
      amount,
      kind: 'payment',
      currency: 'USD',
      visitor_id: visitor.id,
      session_id: session.id,
      email: visitor.email,
      name: visitor.name,
      renewal,
      matched_by: renewal ? (r() < 0.5 ? 'customer' : 'metadata') : 'metadata',
    });
    paidVisitors.add(visitor.id);
  }

  for (let day = 364; day >= 0; day--) {
    const dayStart = todayStart - day * DAY;
    const dow = new Date(dayStart).getUTCDay();
    const weekend = dow === 0 || dow === 6 ? 0.72 : 1;
    const base = day < 30 ? 46 : day < 90 ? 30 : 11;
    let count = Math.max(1, Math.round(base * weekend * (0.8 + r() * 0.4)));
    if (day === 0) count = Math.max(1, Math.round(count * Math.max(0.04, (NOW - dayStart) / DAY)));

    for (let i = 0; i < count; i++) {
      const startedAt =
        day === 0
          ? dayStart + Math.floor(r() * Math.max(1, NOW - dayStart))
          : dayStart + Math.floor(pickWeighted(r, HOUR_WEIGHTS) * HOUR + r() * HOUR);

      let visitor: DemoVisitor | undefined;
      if (visitors.length > 30 && r() < 0.26) {
        const span = Math.min(visitors.length, 1500);
        visitor = visitors[visitors.length - 1 - Math.floor(r() * span)];
      }
      if (!visitor) {
        visitor = { id: id(r), first_seen: startedAt, user_id: null, name: null, email: null };
        if (r() < 0.16) assignIdentity(r, visitor);
        visitors.push(visitor);
      }

      const src = pickWeighted(r, SOURCE_WEIGHTS);
      const campaign = src.campaigns && r() < 0.72 ? pick(r, src.campaigns) : null;
      const term = src.terms && r() < 0.85 ? pick(r, src.terms) : null;
      const ref = src.refs && r() < 0.35 ? pick(r, src.refs) : null;
      const utmSource = src.utmSource && (campaign || r() < 0.4) ? src.utmSource : null;
      const utmMedium = src.utmMedium && (campaign || utmSource) ? src.utmMedium : null;
      const country = pickWeighted(r, COUNTRY_WEIGHTS);
      const [city, region] = pick(r, country.cities);
      const client = pickClient(r);
      const pageCount = pickWeighted(r, [
        [1, 26],
        [2, 24],
        [3, 20],
        [4, 14],
        [5, 9],
        [6, 7],
      ]);
      const entry = pickWeighted(r, PAGES);
      const paths = [entry];
      for (let p = 1; p < pageCount; p++) paths.push(pickWeighted(r, PAGES));
      const goal = r() < 0.17 ? pickWeighted(r, GOALS) : null;
      const outbound = r() < 0.07 ? pick(r, OUTBOUND) : null;

      const sid = id(r);
      let t = startedAt;
      for (const path of paths) {
        events.push({ id: evSeq++, visitor_id: visitor.id, session_id: sid, ts: t, type: 'pageview', name: null, path, props: null });
        t += 20_000 + Math.floor(r() * 100_000);
      }
      if (goal) {
        events.push({ id: evSeq++, visitor_id: visitor.id, session_id: sid, ts: t, type: 'goal', name: goal, path: paths[paths.length - 1], props: null });
        t += 15_000 + Math.floor(r() * 45_000);
      }
      if (outbound) {
        events.push({ id: evSeq++, visitor_id: visitor.id, session_id: sid, ts: t, type: 'outbound', name: outbound, path: paths[paths.length - 1], props: null });
        t += 10_000;
      }

      const duration = Math.max(20_000, Math.min(t - startedAt + Math.floor(r() * 90_000), 30 * MINUTE));
      const session: SessionRow = {
        id: sid,
        visitor_id: visitor.id,
        started_at: startedAt,
        last_seen_at: Math.min(startedAt + duration, NOW),
        duration,
        pageviews: paths.length,
        goals: goal ? 1 : 0,
        hostname: 'dummy-website.com',
        entry_page: entry,
        exit_page: paths[paths.length - 1],
        referrer: src.domain ? `https://${src.domain}/` : null,
        referrer_domain: src.domain,
        source: src.source,
        channel: src.channel,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: campaign,
        utm_term: term,
        utm_content: null,
        ref,
        country: country.cc,
        region,
        city,
        browser: client.browser,
        os: client.os,
        device: client.device,
      };
      sessions.push(session);
      sessionVisitor.set(sid, visitor);

      let payProb = 0.012;
      if (goal === 'checkout') payProb = 0.32;
      else if (goal === 'signup') payProb = 0.08;
      if (src.source === 'Product Hunt') payProb += 0.018;
      if (src.source === 'Newsletter') payProb += 0.012;
      if (r() < payProb) addPayment(session, visitor);
    }
  }

  // Make sure "Today" and the last 24h always have something to show.
  const recent = sessions
    .filter((s) => s.started_at > NOW - 18 * HOUR && s.started_at < NOW - 10 * MINUTE)
    .sort((a, b) => b.started_at - a.started_at);
  for (const s of recent) {
    if (payments.filter((p) => p.ts > NOW - 24 * HOUR).length >= 3) break;
    if (payments.some((p) => p.session_id === s.id)) continue;
    const v = sessionVisitor.get(s.id);
    if (v) addPayment(s, v, Math.min(s.last_seen_at + 15 * MINUTE, NOW - 60_000));
  }
  if (!payments.some((p) => p.ts >= todayStart)) {
    const s = recent.find((x) => x.started_at >= todayStart);
    const v = s && sessionVisitor.get(s.id);
    if (s && v) addPayment(s, v, Math.max(s.started_at + MINUTE, Math.min(NOW - 45_000, s.last_seen_at + MINUTE)));
  }

  // One payment that could not be attributed, so the Journey tab can show the rematch flow.
  payments.push({
    id: 'demo_pay_unmatched',
    ts: NOW - 1.5 * DAY,
    amount: 4900,
    kind: 'payment',
    currency: 'USD',
    visitor_id: null,
    session_id: null,
    email: 'billing@northwind.io',
    name: 'Northwind Labs',
    renewal: 0,
    matched_by: null,
  });

  sessions.sort((a, b) => a.started_at - b.started_at);
  events.sort((a, b) => a.ts - b.ts);
  payments.sort((a, b) => a.ts - b.ts);

  const bySession = new Map(sessions.map((s) => [s.id, s]));
  const byVisitor = new Map(visitors.map((v) => [v.id, v]));
  const eventsBySession = new Map<string, EventRow[]>();
  const eventsByVisitor = new Map<string, EventRow[]>();
  for (const e of events) {
    if (!eventsBySession.has(e.session_id)) eventsBySession.set(e.session_id, []);
    eventsBySession.get(e.session_id)!.push(e);
    if (!eventsByVisitor.has(e.visitor_id)) eventsByVisitor.set(e.visitor_id, []);
    eventsByVisitor.get(e.visitor_id)!.push(e);
  }

  demoSite.visitors24h = new Set(sessions.filter((s) => s.started_at > NOW - DAY).map((s) => s.visitor_id)).size;
  demoSite.online = 9;

  return { visitors, sessions, events, payments, bySession, byVisitor, eventsBySession, eventsByVisitor };
}

let cache: Dataset | null = null;

function data(): Dataset {
  if (!cache) cache = build();
  return cache;
}

// ---------------------------------------------------------------------------
// Query helpers

function resolve(url: URL): { range: ReturnType<typeof resolveRange>; filters: Filters } {
  const q = {
    period: url.searchParams.get('period') || '30d',
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    granularity: url.searchParams.get('granularity') || undefined,
  };
  let filters: Filters = {};
  try {
    const parsed = JSON.parse(url.searchParams.get('filters') || '{}');
    if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) if (typeof v === 'string') filters[k] = v;
    }
  } catch {
    filters = {};
  }
  return { range: resolveRange(q, demoSite.timezone, demoSite.created_at), filters };
}

const hasFilters = (f: Filters) => Object.keys(f).length > 0;

function matchesFilters(s: SessionRow, filters: Filters, eventsBySession: Map<string, EventRow[]>): boolean {
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'page') {
      if (value === '') continue;
      if (!eventsBySession.get(s.id)?.some((e) => e.type === 'pageview' && e.path === value)) return false;
      continue;
    }
    if (key === 'goal') {
      if (value === '') continue;
      if (!eventsBySession.get(s.id)?.some((e) => e.type === 'goal' && e.name === value)) return false;
      continue;
    }
    const actual = (s as unknown as Record<string, unknown>)[key];
    if (value === '') {
      if (actual !== null && actual !== undefined && actual !== '') return false;
    } else if (String(actual ?? '') !== value) {
      return false;
    }
  }
  return true;
}

function sessionsIn(d: Dataset, range: { from: number; to: number }, filters: Filters): SessionRow[] {
  return d.sessions.filter(
    (s) => s.started_at >= range.from && s.started_at < range.to && (!hasFilters(filters) || matchesFilters(s, filters, d.eventsBySession)),
  );
}

function paymentsIn(d: Dataset, range: { from: number; to: number }): PaymentRow[] {
  return d.payments.filter((p) => p.ts >= range.from && p.ts < range.to);
}

function filteredPayments(d: Dataset, range: { from: number; to: number }, filters: Filters): PaymentRow[] {
  const inRange = paymentsIn(d, range);
  if (!hasFilters(filters)) return inRange;
  return inRange.filter((p) => {
    const s = p.session_id ? d.bySession.get(p.session_id) : undefined;
    return !!s && matchesFilters(s, filters, d.eventsBySession);
  });
}

function kpis(sessions: SessionRow[], payments: PaymentRow[]): Kpis {
  const visitors = new Set(sessions.map((s) => s.visitor_id)).size;
  const pageviews = sessions.reduce((a, s) => a + s.pageviews, 0);
  const bounces = sessions.filter((s) => s.pageviews <= 1 && s.goals === 0).length;
  const duration = sessions.reduce((a, s) => a + s.duration, 0);
  const revenue = payments.reduce((a, p) => a + p.amount, 0);
  const paying = payments.filter((p) => p.kind === 'payment');
  const customers = new Set(paying.filter((p) => !p.renewal).map((p) => p.visitor_id ?? p.id)).size;
  return {
    visitors,
    sessions: sessions.length,
    pageviews,
    bounceRate: sessions.length ? bounces / sessions.length : 0,
    avgDuration: sessions.length ? Math.round(duration / sessions.length) : 0,
    revenue,
    payments: paying.length,
    customers,
    conversionRate: visitors ? customers / visitors : 0,
    revenuePerVisitor: visitors ? revenue / visitors : 0,
  };
}

function bucketOf(ts: number, g: Granularity): string {
  const d = new Date(ts);
  if (g === 'hour') return d.toISOString().slice(0, 13) + ':00';
  if (g === 'month') return d.toISOString().slice(0, 7);
  if (g === 'week') {
    const dow = d.getUTCDay();
    const daysToSunday = (7 - dow) % 7;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysToSunday - 6)).toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

function overview(url: URL): Overview {
  const { range, filters } = resolve(url);
  const d = data();
  const span = range.to - range.from;
  const curSessions = sessionsIn(d, range, filters);
  const prevSessions = sessionsIn(d, { from: range.from - span, to: range.from }, filters);
  const curPayments = filteredPayments(d, range, filters);
  const prevPayments = filteredPayments(d, { from: range.from - span, to: range.from }, filters);

  const labels = bucketLabels(range, 0);
  const buckets = new Map(
    labels.map((label) => [label, { visitors: new Set<string>(), pageviews: 0, revenue: 0, payments: 0 }]),
  );
  for (const s of curSessions) {
    const b = buckets.get(bucketOf(s.started_at, range.granularity));
    if (!b) continue;
    b.visitors.add(s.visitor_id);
    b.pageviews += s.pageviews;
  }
  for (const p of curPayments) {
    const b = buckets.get(bucketOf(p.ts, range.granularity));
    if (!b) continue;
    b.revenue += p.amount;
    if (p.kind === 'payment') b.payments += 1;
  }

  return {
    range,
    currency: demoSite.currency,
    decimals: 2,
    current: kpis(curSessions, curPayments),
    previous: kpis(prevSessions, prevPayments),
    online: hasFilters(filters) ? 2 : 9,
    series: labels.map((bucket) => {
      const b = buckets.get(bucket)!;
      return { bucket, visitors: b.visitors.size, pageviews: b.pageviews, revenue: b.revenue, payments: b.payments };
    }),
  };
}

const SESSION_DIMS: Record<string, keyof SessionRow> = {
  channel: 'channel',
  source: 'source',
  campaign: 'utm_campaign',
  keyword: 'utm_term',
  utm_source: 'utm_source',
  utm_medium: 'utm_medium',
  utm_content: 'utm_content',
  ref: 'ref',
  country: 'country',
  region: 'region',
  city: 'city',
  browser: 'browser',
  os: 'os',
  device: 'device',
  entry_page: 'entry_page',
  exit_page: 'exit_page',
  hostname: 'hostname',
  referrer: 'referrer',
  referrer_domain: 'referrer_domain',
};

function breakdown(url: URL): BreakdownRow[] {
  const { range, filters } = resolve(url);
  const dim = url.searchParams.get('dim') ?? 'source';
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit')) || 100));
  const d = data();

  if (dim === 'page' || dim === 'goal' || dim === 'exit_link') {
    const type = dim === 'goal' ? 'goal' : dim === 'exit_link' ? 'outbound' : 'pageview';
    let rows = d.events.filter((e) => e.ts >= range.from && e.ts < range.to && e.type === type);
    if (hasFilters(filters)) {
      rows = rows.filter((e) => {
        const s = d.bySession.get(e.session_id);
        return !!s && matchesFilters(s, filters, d.eventsBySession);
      });
    }
    const groups = new Map<string | null, { visitors: Set<string>; pageviews: number }>();
    const byVisitor = new Map<string, Set<string | null>>();
    for (const e of rows) {
      const label = dim === 'page' ? e.path : e.name;
      if (!groups.has(label)) groups.set(label, { visitors: new Set(), pageviews: 0 });
      const g = groups.get(label)!;
      g.visitors.add(e.visitor_id);
      g.pageviews += 1;
      if (!byVisitor.has(e.visitor_id)) byVisitor.set(e.visitor_id, new Set());
      byVisitor.get(e.visitor_id)!.add(label);
    }
    const revenue = new Map<string | null, { revenue: number; customers: Set<string> }>();
    for (const p of paymentsIn(d, range)) {
      const labels = p.visitor_id ? byVisitor.get(p.visitor_id) : undefined;
      if (!labels) continue;
      for (const label of labels) {
        if (!revenue.has(label)) revenue.set(label, { revenue: 0, customers: new Set() });
        const x = revenue.get(label)!;
        x.revenue += p.amount;
        if (p.kind === 'payment') x.customers.add(p.visitor_id ?? p.id);
      }
    }
    const out: BreakdownRow[] = [...groups].map(([label, g]) => ({
      label,
      visitors: g.visitors.size,
      pageviews: g.pageviews,
      revenue: revenue.get(label)?.revenue ?? 0,
      customers: revenue.get(label)?.customers.size ?? 0,
      extra: null,
    }));
    for (const [label, r2] of revenue) {
      if (!groups.has(label)) out.push({ label, visitors: 0, revenue: r2.revenue, customers: r2.customers.size, extra: null });
    }
    return out.sort((a, b) => b.visitors - a.visitors || b.revenue - a.revenue).slice(0, limit);
  }

  const column = SESSION_DIMS[dim];
  if (!column) throw new Error(`unknown dimension ${dim}`);

  const sessions = sessionsIn(d, range, filters);
  const groups = new Map<string | null, { visitors: Set<string>; pageviews: number; extra: string | null }>();
  for (const s of sessions) {
    const label = (s[column] as string | null | undefined) ?? null;
    if (!groups.has(label)) groups.set(label, { visitors: new Set(), pageviews: 0, extra: null });
    const g = groups.get(label)!;
    g.visitors.add(s.visitor_id);
    g.pageviews += s.pageviews;
    if (dim === 'source') g.extra = s.referrer_domain;
    else if (dim === 'region' || dim === 'city') g.extra = s.country;
  }

  const revenue = new Map<string | null, { revenue: number; customers: Set<string> }>();
  for (const p of filteredPayments(d, range, filters)) {
    const s = p.session_id ? d.bySession.get(p.session_id) : undefined;
    if (!s) continue;
    const label = (s[column] as string | null | undefined) ?? null;
    if (!revenue.has(label)) revenue.set(label, { revenue: 0, customers: new Set() });
    const x = revenue.get(label)!;
    x.revenue += p.amount;
    if (p.kind === 'payment') x.customers.add(p.visitor_id ?? p.id);
  }

  const out: BreakdownRow[] = [...groups].map(([label, g]) => ({
    label,
    visitors: g.visitors.size,
    pageviews: g.pageviews,
    revenue: revenue.get(label)?.revenue ?? 0,
    customers: revenue.get(label)?.customers.size ?? 0,
    extra: g.extra,
  }));
  for (const [label, r2] of revenue) {
    if (!groups.has(label)) out.push({ label, visitors: 0, revenue: r2.revenue, customers: r2.customers.size, extra: null });
  }
  return out.sort((a, b) => b.visitors - a.visitors || b.revenue - a.revenue).slice(0, limit);
}

function customers(url: URL) {
  const { range, filters } = resolve(url);
  const d = data();
  return filteredPayments(d, range, filters)
    .filter((p) => p.kind === 'payment')
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 200)
    .map((p) => {
      const s = p.session_id ? d.bySession.get(p.session_id) : undefined;
      const v = p.visitor_id ? d.byVisitor.get(p.visitor_id) : undefined;
      const visits = p.visitor_id ? d.sessions.filter((x) => x.visitor_id === p.visitor_id && x.started_at <= p.ts).length : 0;
      return {
        id: p.id,
        ts: p.ts,
        amount: p.amount,
        currency: p.currency,
        renewal: p.renewal,
        matched_by: p.matched_by,
        pay_email: p.email,
        pay_name: p.name,
        visitor_id: p.visitor_id,
        session_id: p.session_id,
        first_seen: v?.first_seen ?? null,
        name: v?.name ?? null,
        email: v?.email ?? null,
        user_id: v?.user_id ?? null,
        source: s?.source ?? null,
        channel: s?.channel ?? null,
        referrer_domain: s?.referrer_domain ?? null,
        utm_campaign: s?.utm_campaign ?? null,
        ref: s?.ref ?? null,
        country: s?.country ?? null,
        city: s?.city ?? null,
        device: s?.device ?? null,
        os: s?.os ?? null,
        browser: s?.browser ?? null,
        entry_page: s?.entry_page ?? null,
        visits,
      };
    });
}

function listVisitors(url: URL) {
  const { range, filters } = resolve(url);
  const d = data();
  const sessions = sessionsIn(d, range, filters);
  const groups = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    if (!groups.has(s.visitor_id)) groups.set(s.visitor_id, []);
    groups.get(s.visitor_id)!.push(s);
  }
  return [...groups.entries()]
    .map(([visitorId, list]) => {
      const latest = list.reduce((a, b) => (b.started_at > a.started_at ? b : a));
      const v = d.byVisitor.get(visitorId);
      const spent = d.payments.filter((p) => p.visitor_id === visitorId).reduce((a, p) => a + p.amount, 0);
      return {
        visitor_id: visitorId,
        last_seen: Math.max(...list.map((s) => s.last_seen_at)),
        sessions: list.length,
        pageviews: list.reduce((a, s) => a + s.pageviews, 0),
        duration: list.reduce((a, s) => a + s.duration, 0),
        source: latest.source,
        referrer_domain: latest.referrer_domain,
        country: latest.country,
        city: latest.city,
        device: latest.device,
        os: latest.os,
        browser: latest.browser,
        name: v?.name ?? null,
        email: v?.email ?? null,
        user_id: v?.user_id ?? null,
        first_seen: v?.first_seen ?? null,
        spent,
      };
    })
    .sort((a, b) => b.last_seen - a.last_seen)
    .slice(0, 200);
}

function visitorProfile(visitorId: string) {
  const d = data();
  const visitor = d.byVisitor.get(visitorId) ?? null;
  return {
    visitor,
    sessions: d.sessions.filter((s) => s.visitor_id === visitorId).sort((a, b) => b.started_at - a.started_at).slice(0, 100),
    events: (d.eventsByVisitor.get(visitorId) ?? []).slice().sort((a, b) => b.ts - a.ts).slice(0, 1000),
    payments: d.payments.filter((p) => p.visitor_id === visitorId).sort((a, b) => b.ts - a.ts),
    currency: demoSite.currency,
    decimals: 2,
  };
}

// ---------------------------------------------------------------------------
// Funnels (mutable so the demo lets you create/delete one)

let demoFunnels: FunnelDef[] = [
  {
    id: 'demo-funnel-signup',
    name: 'Signup funnel',
    steps: [
      { type: 'page', value: '/' },
      { type: 'page', value: '/pricing' },
      { type: 'goal', value: 'signup' },
      { type: 'goal', value: 'checkout' },
    ],
    created_at: NOW - 20 * DAY,
  },
  {
    id: 'demo-funnel-content',
    name: 'Blog → docs',
    steps: [
      { type: 'page', value: '/blog/*' },
      { type: 'page', value: '/' },
      { type: 'page', value: '/docs' },
      { type: 'page', value: '/docs/quickstart' },
    ],
    created_at: NOW - 12 * DAY,
  },
];
let funnelSeq = 1;

function createFunnel(body: unknown): FunnelDef | { error: string } {
  const b = body as { name?: string; steps?: { type?: string; value?: string }[] } | undefined;
  const steps = (b?.steps ?? [])
    .filter((s): s is { type: 'page' | 'goal'; value: string } => (s.type === 'page' || s.type === 'goal') && !!s.value?.trim())
    .slice(0, 10)
    .map((s) => ({ type: s.type, value: s.value.trim().slice(0, 200) }));
  if (!b?.name?.trim() || steps.length < 2) return { error: 'A funnel needs a name and at least 2 steps' };
  const funnel: FunnelDef = { id: 'demo-funnel-' + funnelSeq++, name: b.name.trim().slice(0, 100), steps, created_at: NOW };
  demoFunnels = [...demoFunnels, funnel];
  return funnel;
}

function funnelStats(url: URL, funnelId: string) {
  const funnel = demoFunnels.find((f) => f.id === funnelId);
  if (!funnel) throw new Error('funnel not found');
  const { range, filters } = resolve(url);
  const d = data();
  let rows = d.events.filter((e) => e.ts >= range.from && e.ts < range.to);
  if (hasFilters(filters)) {
    rows = rows.filter((e) => {
      const s = d.bySession.get(e.session_id);
      return !!s && matchesFilters(s, filters, d.eventsBySession);
    });
  }
  const matchers = funnel.steps.map((step) => {
    if (step.type === 'goal') return (e: EventRow) => e.type === 'goal' && e.name === step.value;
    const re = new RegExp('^' + step.value.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    return (e: EventRow) => e.type === 'pageview' && re.test(e.path);
  });
  const progress = new Map<string, number>();
  for (const e of rows) {
    const at = progress.get(e.visitor_id) ?? 0;
    if (at < funnel.steps.length && matchers[at](e)) progress.set(e.visitor_id, at + 1);
  }
  const counts = funnel.steps.map(() => 0);
  for (const reached of progress.values()) for (let i = 0; i < reached; i++) counts[i]++;
  return funnel.steps.map((step, i) => ({ ...step, visitors: counts[i] }));
}

// ---------------------------------------------------------------------------
// API entry point

export function demoApiResponse(path: string, init?: RequestInit & { json?: unknown }): unknown | undefined {
  if (typeof window === 'undefined') return undefined;
  if (!window.location.pathname.startsWith('/demo')) return undefined;

  const url = new URL(path, window.location.origin);
  const p = url.pathname;
  const method = (init?.method ?? 'GET').toUpperCase();

  if (p === '/api/sites' && method === 'GET') {
    data();
    return [demoSite];
  }
  if (p === '/api/sites/demo' && method === 'GET') return demoSite;

  if (p === '/api/sites/demo/overview' && method === 'GET') return overview(url);
  if (p === '/api/sites/demo/breakdown' && method === 'GET') return breakdown(url);
  if (p === '/api/sites/demo/customers' && method === 'GET') return customers(url);
  if (p === '/api/sites/demo/visitors' && method === 'GET') return listVisitors(url);

  const profile = /^\/api\/sites\/demo\/visitors\/([^/]+)$/.exec(p);
  if (profile && method === 'GET') return visitorProfile(decodeURIComponent(profile[1]));

  if (p === '/api/sites/demo/funnels' && method === 'GET') return demoFunnels;
  if (p === '/api/sites/demo/funnels' && method === 'POST') return createFunnel(init?.json);

  const funnel = /^\/api\/sites\/demo\/funnels\/([^/]+)$/.exec(p);
  if (funnel && method === 'DELETE') {
    const fid = decodeURIComponent(funnel[1]);
    demoFunnels = demoFunnels.filter((f) => f.id !== fid);
    return { ok: true };
  }

  const stats = /^\/api\/sites\/demo\/funnels\/([^/]+)\/stats$/.exec(p);
  if (stats && method === 'GET') {
    try {
      return funnelStats(url, decodeURIComponent(stats[1]));
    } catch (e) {
      return { error: (e as Error).message };
    }
  }

  if (p === '/api/sites/demo/rematch' && method === 'POST') {
    const { range, filters } = resolve(url);
    const unmatched = filteredPayments(data(), range, filters).filter((x) => x.kind === 'payment' && !x.visitor_id);
    return {
      matched: 0,
      checked: unmatched.length,
      details: unmatched.map((x) => ({ id: x.id, name: x.name, matched: false, reason: 'No matching visitor in the demo dataset' })),
    };
  }

  return undefined;
}

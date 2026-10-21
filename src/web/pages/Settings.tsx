import { useEffect, useState, type ReactNode } from 'react';
import { navigate } from '../App';
import { Favicon } from '../components/Icons';
import { buildAiPrompt } from '../lib/aiPrompt';
import { api, type Site } from '../lib/api';

function Section({ title, desc, children }: { title: string; desc?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {desc && <p className="mt-1 text-sm text-stone-500">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <code className="code">{children}</code>
      <button
        className="absolute right-2 top-2 rounded-lg bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
        onClick={() => {
          navigator.clipboard.writeText(children);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function Settings({ siteId }: { siteId: string }) {
  const [site, setSite] = useState<Site | null>(null);
  const [form, setForm] = useState<Partial<Site>>({});
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const origin = window.location.origin;

  useEffect(() => {
    api<Site>(`/api/sites/${siteId}`).then((s) => {
      setSite(s);
      setForm({ name: s.name, domain: s.domain, timezone: s.timezone, currency: s.currency, dodo_webhook_secret: s.dodo_webhook_secret ?? '' });
    });
  }, [siteId]);

  async function save(patch: Partial<Site>, msg = 'Saved') {
    setError('');
    try {
      const s = await api<Site>(`/api/sites/${siteId}`, { method: 'PATCH', json: patch });
      setSite(s);
      setSaved(msg);
      setTimeout(() => setSaved(''), 2000);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!site) return null;
  const snippet = `<script\n  defer\n  data-website-id="${site.id}"\n  src="${origin}/js/script.js"\n></script>`;
  const webhookUrl = `${origin}/api/webhooks/dodo/${site.id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between">
        <button className="btn" onClick={() => navigate(`/site/${site.id}`)}>
          ← Dashboard
        </button>
        <div className="flex items-center gap-2 font-semibold">
          <Favicon domain={site.domain} size={22} /> {site.name}
        </div>
      </div>

      <AiSetup site={site} origin={origin} />

      <Section title="1. Install the tracking script" desc={<>Paste this in the <code>&lt;head&gt;</code> of every page on {site.domain} (and its subdomains).</>}>
        <Code>{snippet}</Code>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium">Next.js / React example</summary>
          <div className="mt-3">
            <Code>{`// app/layout.tsx
import Script from 'next/script';

<head>
  <Script defer data-website-id="${site.id}" src="${origin}/js/script.js" strategy="afterInteractive" />
</head>`}</Code>
          </div>
        </details>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium">Beat ad blockers (recommended for accuracy)</summary>
          <p className="mt-2 text-stone-600">
            Ad blockers can block third-party analytics domains. Serve the script and endpoint from your own domain with a rewrite, then point the
            script at it:
          </p>
          <div className="mt-3">
            <Code>{`// next.config.js
async rewrites() {
  return [
    { source: '/stats/script.js', destination: '${origin}/js/script.js' },
    { source: '/stats/event', destination: '${origin}/api/event' },
  ];
}

<script defer data-website-id="${site.id}" data-api="/stats/event" src="/stats/script.js"></script>`}</Code>
          </div>
        </details>
        <p className="mt-4 text-sm text-stone-500">
          Exclude your own visits: open <code>https://{site.domain}/?pm_ignore=true</code> once in each browser you use.
        </p>
      </Section>

      <Section title="2. Track button clicks & goals" desc="Goals show up in the Goals tab and can be used in funnels and filters.">
        <Code>{`<!-- Any element: a click sends the goal -->
<button data-pm-goal="signup_click">Get started</button>

<!-- Extra details are attached as properties -->
<a href="/pricing" data-pm-goal="pricing_click" data-pm-goal-plan="pro">Pricing</a>

<script>
  // From your own code
  window.pixelmoth('goal', 'signup', { plan: 'pro' });

  // After login: attach a name/email to the visitor
  window.pixelmoth('identify', { user_id: '123', email: 'jane@acme.com', name: 'Jane' });
</script>`}</Code>
        <p className="mt-3 text-sm text-stone-500">Outbound link clicks are tracked automatically (Exit link tab).</p>
      </Section>

      <Section
        title="3. Connect Dodo Payments (revenue attribution)"
        desc="Payments are linked to the visitor who paid and credited to the source that brought them."
      >
        <ol className="list-decimal space-y-4 pl-5 text-sm">
          <li>
            In Dodo Payments → <b>Developer → Webhooks</b>, add this endpoint and subscribe to <code>payment.succeeded</code> and{' '}
            <code>refund.succeeded</code>:
            <div className="mt-2">
              <Code>{webhookUrl}</Code>
            </div>
          </li>
          <li>
            Paste the webhook's <b>signing secret</b> (starts with <code>whsec_</code>):
            <div className="mt-2 flex gap-2">
              <input
                className="input font-mono"
                type="password"
                placeholder="whsec_..."
                value={form.dodo_webhook_secret ?? ''}
                onChange={(e) => setForm({ ...form, dodo_webhook_secret: e.target.value })}
              />
              <button className="btn-dark" onClick={() => save({ dodo_webhook_secret: form.dodo_webhook_secret ?? '' }, 'Webhook secret saved')}>
                Save
              </button>
            </div>
            {site.dodo_webhook_secret && <p className="mt-1 text-xs text-emerald-600">✓ Secret configured</p>}
          </li>
          <li>
            Pass the visitor cookies as metadata when you create a checkout (this is what makes attribution exact):
            <div className="mt-2">
              <Code>{`import DodoPayments from 'dodopayments';
import { cookies } from 'next/headers';

const dodo = new DodoPayments({ bearerToken: process.env.DODO_PAYMENTS_API_KEY });
const jar = await cookies();

const session = await dodo.checkoutSessions.create({
  product_cart: [{ product_id: 'pdt_xxx', quantity: 1 }],
  return_url: 'https://${site.domain}/thanks',
  metadata: {
    pm_visitor_id: jar.get('pm_vid')?.value ?? '',
    pm_session_id: jar.get('pm_sid')?.value ?? '',
  },
});`}</Code>
            </div>
            <p className="mt-2 text-stone-500">
              Using Dodo <b>payment links</b> (checkout.dodopayments.com/buy/…) instead? The script adds the metadata to those links
              automatically when clicked, but it doesn't always reach the payment, so also set the return URL (step 4). In the browser you can also read the ids with <code>window.pixelmoth.attribution()</code>.
            </p>
            <p className="mt-2 text-stone-500">
              If metadata is missing, Pixelmoth still links the payment when the buyer lands back on your site, when their email matches a
              visitor you <code>identify()</code>, when it's a renewal of an earlier payment, or when exactly one visitor clicked a checkout link
              shortly before paying. The Journey tab shows how each payment was matched.
            </p>
          </li>
          <li>
            <b>Recommended:</b> set your product's <b>return / redirect URL</b> in Dodo to a page on your site, e.g.{' '}
            <code>https://{site.domain}/thanks</code>. Dodo adds <code>?payment_id=…</code> to it, which lets Pixelmoth link the payment to
            the exact visitor even when metadata doesn't come through (for example with payment links).
          </li>
        </ol>
      </Section>

      <Section title="Other payment providers / server-side API" desc="Send payments or goals from your backend using this site's API key.">
        <div className="mb-3 flex gap-2">
          <input className="input font-mono" readOnly value={site.api_key} />
          <button
            className="btn"
            onClick={async () => {
              if (!confirm('Rotate the API key? The old key stops working immediately.')) return;
              const r = await api<{ api_key: string }>(`/api/sites/${siteId}/rotate-key`, { method: 'POST' });
              setSite({ ...site, api_key: r.api_key });
            }}
          >
            Rotate
          </button>
        </div>
        <Code>{`curl -X POST ${origin}/api/v1/payments \\
  -H "Authorization: Bearer ${site.api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{"transaction_id":"txn_123","amount":29.99,"currency":"${site.currency}","visitor_id":"<pm_vid cookie>","email":"jane@acme.com"}'

curl -X POST ${origin}/api/v1/goals \\
  -H "Authorization: Bearer ${site.api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{"visitor_id":"<pm_vid cookie>","name":"signup"}'`}</Code>
      </Section>

      <LinkBuilder domain={site.domain} />

      <Section title="General">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Domain</label>
            <input className="input" value={form.domain ?? ''} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
          </div>
          <div>
            <label className="label">Timezone</label>
            <input className="input" value={form.timezone ?? ''} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          </div>
          <div>
            <label className="label">Revenue currency</label>
            <input className="input" value={form.currency ?? ''} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
        </div>
        <button className="btn-dark mt-4" onClick={() => save({ name: form.name, domain: form.domain, timezone: form.timezone, currency: form.currency })}>
          Save changes
        </button>
      </Section>

      {(saved || error) && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2 text-sm text-white shadow-lg ${error ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {error || saved}
        </div>
      )}

      <Section title="Danger zone">
        <button
          className="btn border-red-200 text-red-600"
          onClick={async () => {
            if (prompt(`Type ${site.domain} to delete this site and all of its data`) !== site.domain) return;
            await api(`/api/sites/${siteId}`, { method: 'DELETE' });
            navigate('/');
          }}
        >
          Delete site and all data
        </button>
      </Section>
    </div>
  );
}

/** One-click prompt for the owner's coding AI, so it can install everything in their codebase. */
function AiSetup({ site, origin }: { site: Site; origin: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const prompt = buildAiPrompt(site, origin);
  return (
    <section className="card border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-transparent p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">✨ Set up with AI</h2>
          <p className="mt-1 max-w-lg text-sm text-stone-600">
            Copy this prompt into Claude Code, Cursor or any coding AI opened in your project. It installs the script, connects Dodo Payments
            attribution, identifies users and adds button goals, using this site's real values. It asks you only what it can't find in your code.
          </p>
        </div>
        <button
          className="btn-dark shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? '✓ Copied' : 'Copy AI prompt'}
        </button>
      </div>
      <button className="mt-3 text-sm font-medium text-violet-700 hover:underline" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide prompt' : 'Preview prompt'}
      </button>
      {open && <pre className="code mt-3 max-h-96 whitespace-pre-wrap">{prompt}</pre>}
      <p className="mt-3 text-xs text-stone-500">
        The AI handles the code. You still connect the Dodo webhook yourself (step 3 below), because that's done in Dodo's dashboard.
      </p>
    </section>
  );
}

const PRESETS = [
  { label: 'X / Twitter', source: 'x', medium: 'social' },
  { label: 'LinkedIn', source: 'linkedin', medium: 'social' },
  { label: 'Reddit', source: 'reddit', medium: 'social' },
  { label: 'YouTube', source: 'youtube', medium: 'video' },
  { label: 'Medium', source: 'medium', medium: 'article' },
  { label: 'Newsletter', source: 'newsletter', medium: 'email' },
  { label: 'Product Hunt', source: 'producthunt', medium: 'referral' },
];

/** Build a tagged link per tweet / article, so each one shows up separately in Campaign. */
function LinkBuilder({ domain }: { domain: string }) {
  const [url, setUrl] = useState(`https://${domain}/`);
  const [preset, setPreset] = useState(PRESETS[0]);
  const [campaign, setCampaign] = useState('');
  let built = '';
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', preset.source);
    u.searchParams.set('utm_medium', preset.medium);
    if (campaign) u.searchParams.set('utm_campaign', campaign.trim().toLowerCase().replace(/\s+/g, '-'));
    built = u.toString();
  } catch {}
  return (
    <Section
      title="Link builder"
      desc="X, Medium and others hide which exact post sent a visitor. Use a tagged link in each post and it shows up by name in Referrer → Campaign, including the revenue it made."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className="label">Page</label>
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div>
          <label className="label">Where you post it</label>
          <select className="input" value={preset.label} onChange={(e) => setPreset(PRESETS.find((p) => p.label === e.target.value)!)}>
            {PRESETS.map((p) => (
              <option key={p.label}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Post name (campaign)</label>
          <input className="input" placeholder="launch-tweet, seo-guide-article…" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
        </div>
      </div>
      {built && (
        <div className="mt-4">
          <Code>{built}</Code>
        </div>
      )}
      <p className="mt-2 text-xs text-stone-500">
        Shorter alternative: <code>?ref=launch-tweet</code> also works and shows up as the referrer.
      </p>
    </Section>
  );
}

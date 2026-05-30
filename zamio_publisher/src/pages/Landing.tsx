import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  AudioWaveform,
  Building2,
  FileChartColumnIncreasing,
  Globe2,
  Layers,
  Music,
  Play,
  Radar,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';


type NavigationLink = {
  label: string;
  href: string;
};

type Metric = {
  value: string;
  label: string;
  detail: string;
};

type FeatureCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

type LifecycleStep = {
  step: string;
  title: string;
  description: string;
  detail: string;
};

type ProofPoint = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type Testimonial = {
  quote: string;
  name: string;
  role: string;
};

type Faq = {
  question: string;
  answer: string;
};

const navigation: NavigationLink[] = [
  { label: 'Platform', href: '#platform' },
  { label: 'Coverage', href: '#coverage' },
  { label: 'Security', href: '#security' },
  { label: 'Stories', href: '#stories' },
  { label: 'FAQs', href: '#faqs' },
];

const metrics: Metric[] = [
  {
    value: '130+',
    label: 'FM & digital stations',
    detail: 'Monitored live across all 16 regions of Ghana.',
  },
  {
    value: '45+',
    label: 'TV & streaming feeds',
    detail: 'From nationwide broadcasters to diaspora partners.',
  },
  {
    value: '₵5.2M',
    label: 'Royalties reconciled',
    detail: 'Disbursed across pilot programmes since 2021.',
  },
  {
    value: '24 hr',
    label: 'Detection SLA',
    detail: 'Automated escalations for any missing airplay logs.',
  },
];

const features: FeatureCard[] = [
  {
    title: 'Fingerprint detection network',
    description:
      'Audio fingerprinting across FM, TV, and digital streams surfaces every play with minute-level accuracy.',
    icon: Radar,
    accent: 'bg-gradient-to-br from-indigo-500 to-cyan-500',
  },
  {
    title: 'Revenue intelligence dashboards',
    description:
      'Executive dashboards model trends, anomalies, and forecasts so you can validate royalty payouts instantly.',
    icon: FileChartColumnIncreasing,
    accent: 'bg-gradient-to-br from-purple-500 to-fuchsia-500',
  },
  {
    title: 'Compliance-ready statements',
    description:
      'Generate PRO-grade statements, audit trails, and cue sheets that satisfy ASCAP, BMI, BMAT, and GHAMRO.',
    icon: ShieldCheck,
    accent: 'bg-gradient-to-br from-emerald-500 to-teal-500',
  },
  {
    title: 'Split-ready collaboration',
    description:
      'Onboard writers, producers, and publishers with pre-approved splits and contributor-level reporting.',
    icon: Users,
    accent: 'bg-gradient-to-br from-amber-500 to-orange-500',
  },
  {
    title: 'Institutional workflows',
    description:
      'Label, publisher, and society tooling orchestrates catalog ingestion, dispute management, and settlements.',
    icon: Building2,
    accent: 'bg-gradient-to-br from-sky-500 to-blue-500',
  },
  {
    title: 'Experience tuned for artists',
    description:
      'Responsive, accessible interfaces built for high-volume catalogs and mobile-first stakeholders.',
    icon: Sparkles,
    accent: 'bg-gradient-to-br from-rose-500 to-pink-500',
  },
];

const lifecycle: LifecycleStep[] = [
  {
    step: 'Step 1',
    title: 'Register & validate catalog',
    description:
      'Upload works, assign contributors, and sync metadata with our rights management team.',
    detail: 'Support for cue sheets, ISRC/ISWC validation, and conflict resolution.',
  },
  {
    step: 'Step 2',
    title: '24/7 monitoring & detection',
    description:
      'Our fingerprinting network listens across Ghana to capture every qualifying play.',
    detail: 'Escalations trigger if expected spins are missed or logs need manual review.',
  },
  {
    step: 'Step 3',
    title: 'Reconcile & approve royalties',
    description:
      'Review transparent earnings, withholding, and settlements before payouts are triggered.',
    detail: 'Workflow approvals align with PRO standards and local regulatory requirements.',
  },
  {
    step: 'Step 4',
    title: 'Disburse & report to stakeholders',
    description:
      'Automated MoMo and bank transfers deliver funds while partner-ready statements are distributed.',
    detail: 'Comprehensive archives keep regulators, societies, and artists aligned.',
  },
];

const proofPoints: ProofPoint[] = [
  {
    icon: ShieldCheck,
    title: 'Regulatory compliance',
    description:
      'Data residency, consent management, and audit logging mapped to Ghana Data Protection Act & GDPR.',
  },
  {
    icon: Layers,
    title: 'Defense-in-depth security',
    description:
      'Network segmentation, secret rotation, and anomaly detection shield royalty statements from tampering.',
  },
  {
    icon: Globe2,
    title: 'Partnership ready',
    description:
      'Export statements and cue sheets tailored for ASCAP, BMI, BMAT, PRS, and regional PRO integrations.',
  },
];

const testimonials: Testimonial[] = [
  {
    quote:
      'Zamio surfaced 18 undocumented spins within our first month. The reconciled statements mirror what global PROs expect.',
    name: 'Naa Dromo',
    role: 'Label Manager, Accra',
  },
  {
    quote:
      'We finally have transparent visibility from play detection to payout. Our artists trust the numbers again.',
    name: 'Kweku Mensa',
    role: 'Independent Producer',
  },
  {
    quote:
      'The compliance artefacts are plug-and-play with our US PRO partners. Zamio feels enterprise-ready.',
    name: 'Adjoa Boateng',
    role: 'Publisher Relations Lead',
  },
];

const faqs: Faq[] = [
  {
    question: 'Can Zamio onboard international catalogs operating in Ghana?',
    answer:
      'Yes. We support international artists, publishers, and societies seeking Ghanaian collections with localized compliance checks.',
  },
  {
    question: 'How quickly can I see detections after registering a work?',
    answer:
      'Detections generally appear within minutes. We surface verification alerts if metadata conflicts or fingerprints need refinement.',
  },
  {
    question: 'What payout channels are supported?',
    answer:
      'Artists and rights holders can receive settlements via mobile money (MTN, Vodafone, AirtelTigo) or direct bank transfer.',
  },
  {
    question: 'How does Zamio keep my data secure?',
    answer:
      'Role-based access controls, encryption in transit and at rest, and proactive monitoring protect catalog and payment information.',
  },
];

const complianceBadges: string[] = [
  'ASCAP-ready statements',
  'IFPI cue sheet exports',
  'ISO 27001 control mapping',
  'GDPR & Data Protection Act aligned',
];

export default function ZamIOLandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-black" />
        <div className="absolute left-1/2 top-0 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-indigo-600/30 blur-[160px]" />
        <div className="absolute bottom-[-200px] right-[-120px] h-[420px] w-[420px] rounded-full bg-violet-500/20 blur-[180px]" />
      </div>

      <header className="relative">
        <nav className="container mx-auto flex items-center justify-between px-4 py-6">
          <a href="/" className="flex items-center space-x-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <Users className="h-5 w-5" />
            </span>
            <span className="text-2xl font-semibold tracking-tight">Zamio Publisher</span>
          </a>

          <div className="hidden items-center space-x-10 md:flex">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-200 transition hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center space-x-3 md:flex">
            <Link
              to="/signin"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-400 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Sign Up
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="rounded-lg border border-white/10 p-2 text-slate-200 transition hover:border-indigo-400 hover:text-white md:hidden"
            aria-label="Toggle navigation"
          >
            <span className="sr-only">Toggle navigation</span>
            <div className="space-y-1">
              <span
                className={`block h-0.5 w-6 transform bg-current transition duration-200 ${
                  isMenuOpen ? 'translate-y-1.5 rotate-45' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-6 transform bg-current transition duration-200 ${
                  isMenuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-6 transform bg-current transition duration-200 ${
                  isMenuOpen ? '-translate-y-1.5 -rotate-45' : ''
                }`}
              />
            </div>
          </button>
        </nav>

        {isMenuOpen ? (
          <div className="mx-4 mb-6 rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur md:hidden">
            <div className="space-y-4">
              {navigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                to="/signin"
                className="rounded-full border border-white/20 px-4 py-2 text-center text-sm font-medium text-slate-200 transition hover:border-indigo-400 hover:text-white"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                Sign Up
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main className="relative">
        <section className="container mx-auto grid gap-12 px-4 pb-20 pt-10 lg:grid-cols-[minmax(0,1fr)_520px] lg:pb-28 lg:pt-20">
          <div>
            <div className="inline-flex items-center space-x-3 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-widest text-slate-200">
              <ShieldCheck className="h-4 w-4" />
              <span>Royalty intelligence for Ghana & beyond</span>
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Present a PRO-ready royalty platform artists and societies trust.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              Zamio unifies detection, reconciliation, payouts, and compliance so Ghanaian and international catalogs receive every cedi they are owed.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-400"
              >
                Launch publisher portal
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a
                href="/contact"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-base font-semibold text-slate-200 transition hover:border-indigo-400 hover:text-white"
              >
                Talk to our team
              </a>
            </div>
            <ul className="mt-10 grid max-w-lg gap-4 text-sm text-slate-300">
              <li className="flex items-start space-x-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/30 text-indigo-200">
                  <AudioWaveform className="h-3.5 w-3.5" />
                </span>
                <span>Granular logs across FM, TV, and streaming feeds with dispute-ready evidence.</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/30 text-indigo-200">
                  <AudioWaveform className="h-3.5 w-3.5" />
                </span>
                <span>Automated royalty statements tuned to PRO partner formats and regulatory expectations.</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/30 text-indigo-200">
                  <AudioWaveform className="h-3.5 w-3.5" />
                </span>
                <span>Integrated payouts to mobile money and banks with multi-level approvals.</span>
              </li>
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur">
              <div className="absolute inset-x-10 -top-20 h-52 rounded-full bg-indigo-500/30 blur-3xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur h-96 flex items-center justify-center">
                <div className="text-slate-400">Dashboard Preview</div>
              </div>
              <div className="absolute -bottom-6 -right-6 rounded-2xl border border-white/10 bg-indigo-500/80 p-4 shadow-xl">
                <Play className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-20" id="coverage">
          <div className="grid gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="space-y-2">
                <p className="text-3xl font-semibold text-white sm:text-4xl">{metric.value}</p>
                <p className="text-sm font-semibold uppercase tracking-wide text-indigo-200/80">
                  {metric.label}
                </p>
                <p className="text-sm text-slate-300">{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="platform" className="relative overflow-hidden py-20">
          <div className="absolute inset-x-0 top-0 -z-10 h-full bg-gradient-to-b from-white/5 via-transparent to-transparent" />
          <div className="container mx-auto px-4">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold sm:text-4xl">Unified tooling for artists, labels, and PRO partners</h2>
              <p className="mt-4 text-lg text-slate-300">
                Every Zamio module is designed to align with the compliance, transparency, and performance standards global PROs expect.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group flex h-full flex-col rounded-3xl border border-white/10 bg-slate-900/60 p-6 transition hover:-translate-y-1 hover:border-indigo-400/60 hover:bg-slate-900/80"
                >
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white ${feature.accent}`}>
                    <feature.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-6 text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="mt-3 text-sm text-slate-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20" aria-labelledby="lifecycle-heading">
          <div className="max-w-2xl">
            <h2 id="lifecycle-heading" className="text-3xl font-semibold sm:text-4xl">
              Your royalty lifecycle, orchestrated end-to-end
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              Zamio manages every stage from catalog onboarding to cross-border settlements with transparent approvals.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {lifecycle.map((stage) => (
              <div key={stage.title} className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
                <span className="inline-flex items-center rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-200">
                  {stage.step}
                </span>
                <h3 className="mt-4 text-xl font-semibold text-white">{stage.title}</h3>
                <p className="mt-3 text-sm text-slate-300">{stage.description}</p>
                <p className="mt-4 text-xs font-medium uppercase tracking-widest text-slate-400">{stage.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="security" className="relative overflow-hidden py-20">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/60 via-slate-950 to-black" />
          <div className="container mx-auto px-4">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold sm:text-4xl">Security & compliance without compromise</h2>
              <p className="mt-4 text-lg text-slate-300">
                Built with regulators, auditors, and global partners in mind so your catalog stays protected and trusted.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {proofPoints.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-slate-900/60 p-6"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
                    <item.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-6 text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm text-slate-300">{item.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-wrap gap-3">
              {complianceBadges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-indigo-100"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="stories" className="container mx-auto px-4 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold sm:text-4xl">Trusted by artists, labels, and societies</h2>
            <p className="mt-4 text-lg text-slate-300">
              Hear how Zamio restores transparency to royalty collection across Ghana and international partners.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <figure
                key={testimonial.name}
                className="flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/60 p-6"
              >
                <blockquote className="text-sm text-slate-200">“{testimonial.quote}”</blockquote>
                <figcaption className="mt-6 text-sm font-semibold text-white">
                  {testimonial.name}
                  <span className="mt-1 block text-xs font-normal uppercase tracking-widest text-slate-400">
                    {testimonial.role}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="faqs" className="container mx-auto px-4 pb-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold sm:text-4xl">Frequently asked questions</h2>
            <p className="mt-4 text-lg text-slate-300">
              Everything you need to know before partnering with Zamio for royalty management.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
                <h3 className="text-lg font-semibold text-white">{faq.question}</h3>
                <p className="mt-3 text-sm text-slate-300">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-24">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 p-10 text-center shadow-2xl">
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Ready to deliver PRO-grade royalty services?
            </h2>
            <p className="mt-4 text-lg text-indigo-100">
              Deploy Zamio across your artist, label, and society workflows with dedicated onboarding from our team.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                Create publisher account
              </Link>
              <a
                href="/contact"
                className="inline-flex items-center justify-center rounded-full border border-white/70 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Schedule stakeholder review
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950/80 py-12">
        <div className="container mx-auto grid gap-10 px-4 md:grid-cols-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                <Users className="h-5 w-5" />
              </span>
              <span className="text-xl font-semibold">Zamio Publisher</span>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              A unified royalty platform built in Ghana for artists everywhere. Monitor, reconcile, and distribute with confidence.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-200">Product</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-400">
              <li>
                <a href="/features" className="transition hover:text-white">
                  Features
                </a>
              </li>
              <li>
                <a href="/pricing" className="transition hover:text-white">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/support" className="transition hover:text-white">
                  Support
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-200">Company</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-400">
              <li>
                <a href="/about" className="transition hover:text-white">
                  About
                </a>
              </li>
              <li>
                <a href="/partners" className="transition hover:text-white">
                  Partnerships
                </a>
              </li>
              <li>
                <a href="/careers" className="transition hover:text-white">
                  Careers
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-200">Stay in touch</h3>
            <p className="mt-4 text-sm text-slate-400">
              Subscribe for rollout updates, PRO partnerships, and market insights.
            </p>
            <form className="mt-4 flex gap-2">
              <label htmlFor="landing-email" className="sr-only">
                Email address
              </label>
              <input
                id="landing-email"
                type="email"
                placeholder="you@label.com"
                className="w-full rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                Join
              </button>
            </form>
          </div>
        </div>
        <div className="container mx-auto mt-10 flex flex-col gap-4 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Zamio. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <a href="/legal" className="transition hover:text-white">
              Legal
            </a>
            <a href="/privacy" className="transition hover:text-white">
              Privacy
            </a>
            <a href="/security" className="transition hover:text-white">
              Security
            </a>
            <a href="/contact" className="transition hover:text-white">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
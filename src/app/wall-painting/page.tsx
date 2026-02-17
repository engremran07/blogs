import Image from "next/image";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Shield,
  Clock,
  Palette,
  CheckCircle,
  Star,
  ChevronRight,
  ChevronDown,
  Users,
  Award,
  ThumbsUp,
  Brush,
} from "lucide-react";
import { buildWebPageJsonLd, serializeJsonLd } from "@/features/seo/server/json-ld.util";
import type { Metadata } from "next";
import { WallPaintingClient } from "./WallPaintingClient";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"
).replace(/\/$/, "");

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      "Expert Wall Painting Service in Dubai - 30% Off | Professional Painters",
    description:
      "Professional wall painting services in Dubai. Interior & exterior painting, accent walls, textured finishes. 2-year guarantee. 150+ custom colors. Get a free quote today!",
    alternates: { canonical: `${SITE_URL}/wall-painting` },
    openGraph: {
      title: "Expert Wall Painting Service in Dubai - 30% Off",
      description:
        "Professional wall painting services in Dubai. Interior & exterior painting, accent walls, textured finishes. 2-year guarantee on all work.",
      url: `${SITE_URL}/wall-painting`,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: "Expert Wall Painting Service in Dubai - 30% Off",
      description:
        "Professional wall painting services in Dubai. 2-year guarantee. Free quote.",
    },
  };
}

/* ── Service card data ────────────────────────────────────────────────── */

const services = [
  {
    title: "Interior Wall Painting",
    description:
      "We transform your home with smooth-finish, premium paints & coatings that are specifically formulated for Dubai's indoor environments to last longer.",
    image: "/uploads/wall-painting/interior.jpg",
  },
  {
    title: "Exterior Wall Painting",
    description:
      "Durable and weather-proof, our exterior finishes look amazing with weather-resistant coatings that withstand the scorching sun.",
    image: "/uploads/wall-painting/exterior.jpg",
  },
  {
    title: "Textured Wall Painting",
    description:
      "We deliver luxury look and feel, add depth and character to any room with custom textures from subtle to bold.",
    image: "/uploads/wall-painting/textured.jpg",
  },
  {
    title: "Accent Wall Painting",
    description:
      "Bold, eye-catching focal walls that complement your space using contrasting colors, patterns & textures.",
    image: "/uploads/wall-painting/accent.jpg",
  },
  {
    title: "Specialty Wall Painting",
    description:
      "Unique artistic elements — ombré gradients, metallic accents, stripes & geometric innovative solutions for any room.",
    image: "/uploads/wall-painting/specialty.jpg",
  },
  {
    title: "Decorative & Faux Painting",
    description:
      "Luxury finishes that replicate marble, natural stone, wood grain, and other premium effects.",
    image: "/uploads/wall-painting/decorative.jpg",
  },
];

const benefits = [
  {
    icon: Shield,
    title: "Premium Quality Paints",
    description:
      "We use high-grade, weather-resistant paints that last longer and maintain their colour vibrancy.",
  },
  {
    icon: Clock,
    title: "Time & Cost Savings",
    description:
      "Avoid DIY mistakes and rework; our efficient team gets the job done quickly and correctly.",
  },
  {
    icon: ThumbsUp,
    title: "Hassle-Free Service",
    description:
      "From prep to cleanup, we handle everything so you don't have to worry about a thing.",
  },
  {
    icon: Palette,
    title: "Customized Solutions",
    description:
      "Whether modern, classic, or decorative finishes, our palette is limited only by your imagination.",
  },
];

const process_steps = [
  { step: "01", title: "Initial\nConsultation", icon: Users },
  { step: "02", title: "Surface\nPreparation", icon: Brush },
  { step: "03", title: "Painting &\nApplication", icon: Palette },
  { step: "04", title: "Final\nInspection", icon: CheckCircle },
];

const gallery = [
  "/uploads/wall-painting/gallery-1.jpg",
  "/uploads/wall-painting/gallery-2.jpg",
  "/uploads/wall-painting/gallery-3.jpg",
  "/uploads/wall-painting/gallery-4.jpg",
  "/uploads/wall-painting/gallery-5.jpg",
  "/uploads/wall-painting/gallery-6.jpg",
];

const trendingColors = [
  { name: "Desert Sand", hex: "#C2A878" },
  { name: "Ocean Mist", hex: "#6B9DAD" },
  { name: "Midnight Navy", hex: "#1B2A4A" },
  { name: "Warm Terracotta", hex: "#C75B39" },
  { name: "Sage Green", hex: "#87A87C" },
  { name: "Dusty Rose", hex: "#C2858A" },
  { name: "Pearl White", hex: "#F0EAE2" },
  { name: "Charcoal", hex: "#3D3D3D" },
];

const testimonials = [
  {
    name: "Sarah K.",
    location: "Dubai Marina",
    text: "They painted my 3-bedroom apartment in a weekend! Your attention to detail is unmatched. The painters were organized, neat, and the suggestions were spot-on. Highly recommended.",
    rating: 5,
  },
  {
    name: "Ahmed H.",
    location: "Downtown Dubai",
    text: "From the initial consultation to the final walkthrough, the service was top-notch. They understood my vision perfectly. My home is like a new place now!",
    rating: 5,
  },
  {
    name: "Lisa R.",
    location: "Jumeirah",
    text: "I've tried other painters before but these guys are by far the best in Dubai. Professional, clean work, and the colors are vibrant even after months.",
    rating: 5,
  },
];

const faqs = [
  {
    q: "How much does it cost to paint a wall in Dubai?",
    a: "The cost to paint a wall in Dubai typically ranges from AED 10 to AED 25 per square foot, depending on the type of paint, the condition of the walls, and the size of the area. We provide free, no-obligation quotes tailored to your specific needs.",
  },
  {
    q: "How do I prep the walls before painting?",
    a: "Our team handles all preparation including cleaning, sanding, filling cracks and holes, applying primer, and masking/taping edges. Proper preparation is key to a flawless finish and we never skip this critical step.",
  },
  {
    q: "What Type of Paint is Best for Walls in Dubai?",
    a: "For Dubai's climate, we recommend high-quality acrylic paints for interiors and elastomeric coatings for exteriors. These resist humidity, UV rays, and temperature fluctuations common in the UAE.",
  },
  {
    q: "How long can I use the room after painting?",
    a: "Most rooms can be used within 4-6 hours after painting with our quick-dry formulas. Full curing takes 2-3 days. We recommend keeping windows open for ventilation during this period.",
  },
];

/* ── Page Component ───────────────────────────────────────────────────── */

export default function WallPaintingPage() {
  const pageJsonLd = buildWebPageJsonLd({
    name: "Expert Wall Painting Service in Dubai",
    url: `${SITE_URL}/wall-painting`,
    description:
      "Professional wall painting services in Dubai. Interior & exterior painting, accent walls, textured finishes.",
    isPartOf: { name: "MyBlog", url: SITE_URL },
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(pageJsonLd) }}
      />

      {/* ─── Top Bar ─────────────────────────────────────────────────── */}
      <div className="bg-[#1B1464] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between px-4 py-2 text-sm sm:px-6 lg:px-8">
          <a
            href="tel:+971585317499"
            className="flex items-center gap-1.5 hover:text-blue-200"
          >
            <Phone className="h-4 w-4" />
            <span>+971585317499</span>
          </a>
          <a
            href="mailto:info@wallpaintingservice.com"
            className="flex items-center gap-1.5 hover:text-blue-200"
          >
            <Mail className="h-4 w-4" />
            <span>info@wallpaintingservice.com</span>
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#" className="hover:text-blue-200">
              Home
            </Link>
            <Link href="#services" className="hover:text-blue-200">
              Painting Services ▾
            </Link>
            <Link href="#" className="hover:text-blue-200">
              Wallpaper
            </Link>
            <Link href="/blog" className="hover:text-blue-200">
              Blog
            </Link>
          </nav>
        </div>
      </div>

      {/* ─── Hero Section ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-linear-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24 lg:px-8">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight text-gray-900 dark:text-white md:text-5xl">
              Expert Wall Painting Service in Dubai&nbsp;–{" "}
              <span className="text-blue-600">30% Off</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
              Transform your living spaces with expert wall painting services.
              A professional coat of paint can totally transform your space,
              giving it a classy look and a fresh feel. Whether you want to
              refresh your home, office, or site, we have the expertise to
              deliver flawless results.
            </p>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              We use high-quality materials and make sure to protect your
              furniture and belongings from paint splatters, dust, and debris.
              Our team is clean, professional, and ensures that your property
              remains in impeccable condition.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="tel:+971585317499"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700"
              >
                <Phone className="h-5 w-5" />
                Call Now
              </a>
              <a
                href="#quote"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-blue-600 px-6 py-3 font-semibold text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                Get Free Quote
              </a>
            </div>
          </div>
          <div className="relative mx-auto aspect-4/3 w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl">
            <Image
              src="/uploads/wall-painting/hero-painter.jpg"
              alt="Professional wall painting service in Dubai"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* ─── Trust Badges ────────────────────────────────────────────── */}
      <section className="border-y border-gray-200 bg-white py-8 dark:border-gray-700 dark:bg-gray-900">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            {
              icon: Shield,
              title: "2-Year Guarantee on All Work",
              desc: "We stand behind our quality with a full 2-year warranty. If any issues arise, we'll fix them at no cost.",
            },
            {
              icon: Palette,
              title: "150+ Colors with Custom Matching",
              desc: "We can match your preferred color or create an entirely custom shade for the exact finish you need.",
            },
            {
              icon: Clock,
              title: "Flexible Scheduling",
              desc: "Book at your convenience with our easy-to-book, flexible scheduling. We work around your timetable.",
            },
          ].map((badge) => (
            <div
              key={badge.title}
              className="flex items-start gap-4 rounded-xl border border-gray-100 p-5 dark:border-gray-700"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                <badge.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {badge.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {badge.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Professional Painters Section ───────────────────────────── */}
      <section className="bg-white py-16 dark:bg-gray-900">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-center lg:px-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Professional Wall Painters in Dubai – Flawless, Durable & Stress-Free Results
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              Hiring expert wall painting professionals bring the best tools,
              high-quality paints and techniques to ensure a flawless finish.
              Professional painters know which paints and methods work best
              for different surfaces, providing a smooth and durable result.
            </p>
            <p className="mt-3 text-gray-600 dark:text-gray-300">
              Hiring experts saves you time, effort, and money in the long run.
              DIY painting may result in mistakes that are costly to fix.
              Professionals will efficiently apply paint evenly, cover
              tricky areas, and handle necessary preparation.
            </p>
            <a
              href="tel:+971585317499"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-green-700"
            >
              <Phone className="h-5 w-5" />
              Call For a Free Quote!
            </a>
          </div>
          <div className="relative mx-auto aspect-4/3 w-full max-w-lg overflow-hidden rounded-2xl shadow-xl">
            <Image
              src="/uploads/wall-painting/professional-team.jpg"
              alt="Professional wall painters in Dubai"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* ─── Gallery ─────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-16 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-white">
            Our Recently Completed Wall Painting Dubai Project
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
            {gallery.map((src, i) => (
              <div
                key={i}
                className="group relative aspect-4/3 overflow-hidden rounded-xl"
              >
                <Image
                  src={src}
                  alt={`Wall painting project ${i + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Process Steps ───────────────────────────────────────────── */}
      <section className="bg-[#1B1464] py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold uppercase tracking-wider text-blue-300">
            Our Step by Step
          </p>
          <h2 className="mt-2 text-center text-3xl font-bold">
            Wall Painting Process
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
            {process_steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/20">
                  <s.icon className="h-9 w-9 text-blue-300" />
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-blue-300">
                  Step {s.step}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm font-semibold">
                  {s.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Comprehensive Services ──────────────────────────────────── */}
      <section id="services" className="bg-white py-16 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-white">
            Our Comprehensive Wall Painting Services Include
          </h2>
          <p className="mx-auto mb-10 max-w-3xl text-center text-gray-500 dark:text-gray-400">
            We provide a wide range of professional wall painting services,
            from basic interior refreshes to custom decorative finishes. No
            matter whether you want to refresh your home, office, or site, we
            have the expertise to deliver flawless results.
          </p>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <div
                key={svc.title}
                className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="relative aspect-16/10 overflow-hidden">
                  <Image
                    src={svc.image}
                    alt={svc.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {svc.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {svc.description}
                  </p>
                  <a
                    href="#quote"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                  >
                    Get Free Quote
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Benefits ────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-16 dark:bg-gray-800">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-center lg:px-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Benefits of Investing in Our Wall Painting Services in Dubai
            </h2>
            <div className="mt-8 space-y-6">
              {benefits.map((b) => (
                <div key={b.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                    <b.icon className="h-5 w-5 text-green-700 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {b.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {b.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mx-auto aspect-4/3 w-full max-w-lg overflow-hidden rounded-2xl shadow-xl">
            <Image
              src="/uploads/wall-painting/benefits.jpg"
              alt="Benefits of professional wall painting"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* ─── Trusted Painters for Residential & Commercial ───────────── */}
      <section className="bg-white py-16 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
            Dubai&apos;s Trusted Wall Painters for Residential &amp; Commercial
            Spaces
          </h2>
          <div className="mx-auto mt-6 max-w-3xl text-center text-gray-600 dark:text-gray-300">
            <p>
              Our professional painters provide premium painting services for
              both residential and commercial spaces. Whether you&apos;re
              refreshing your villa, apartment, office, restaurant, or retail
              store — we deliver flawless results on time.
            </p>
            <p className="mt-4">
              Our services cover everything from A to Z, including surface
              preparation, minor wall repairs, priming, and cleanup. Our team
              works the way you need — quietly for occupied homes, after hours
              for offices, or fast track for move-in-ready spaces.
            </p>
          </div>
          <div className="mt-8 flex justify-center">
            <a
              href="tel:+971585317499"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-green-700"
            >
              <Phone className="h-5 w-5" />
              Call For Free Consultation
            </a>
          </div>
        </div>
      </section>

      {/* ─── Protection Before Painting ──────────────────────────────── */}
      <section className="bg-gray-50 py-16 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center text-3xl font-bold text-gray-900 dark:text-white">
            How We Protect Your Space Before Wall Painting
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                Interior Protection
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  All furniture removed or covered after painting
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  Furniture covered with clean plastic drop sheets
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  Floor protection using masking tape and plastic covers
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  Door handles &amp; window frames carefully masked
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                Exterior Protection
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  All outdoor landscaping covered to collect debris
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  Pool surfaces covered with plastic or tarp
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  Car parking adjacent areas shielded with protective barriers
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  Pressure-washed surfaces for optimal paint adhesion
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trending Colors ─────────────────────────────────────────── */}
      <section className="bg-white py-16 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-white">
            Trending Wall Paint Colors for Dubai Homes
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-gray-500 dark:text-gray-400">
            Our painting experts curate Dubai&apos;s hottest color trends,
            blending international styles with region-specific adaptations.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-8">
            {trendingColors.map((c) => (
              <div key={c.name} className="text-center">
                <div
                  className="mx-auto h-16 w-16 rounded-full shadow-inner ring-2 ring-gray-200 dark:ring-gray-600"
                  style={{ backgroundColor: c.hex }}
                />
                <p className="mt-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {c.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ──────────────────────────────────────────────── */}
      <section className="bg-[#1B1464] py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold">
            Get Expert Wall Painting Services in Dubai by Top Rated Painters
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-blue-200">
            Transform your home or office into a cozy, elegant retreat with our
            expert painting services. Let us transform your walls with
            timeless finishes, creative palettes, and personalized touches.
          </p>
          <a
            href="#quote"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-8 py-3 font-bold text-white shadow-lg transition hover:bg-orange-600"
          >
            Schedule a Visit Now
            <ChevronRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      {/* ─── Most Demand Services ────────────────────────────────────── */}
      <section className="bg-gray-50 py-16 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-white">
            Our Most Demand and Trending Painting Services in Dubai
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {[
              "Interior Painting",
              "Exterior Painting",
              "Commercial Painting",
              "Villa Painting",
              "Office Painting",
              "Service Painting",
              "Furniture Painting",
              "Bedroom Painting",
            ].map((name) => (
              <div
                key={name}
                className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
              >
                <Brush className="mx-auto h-8 w-8 text-blue-600 dark:text-blue-400" />
                <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Hire Section ────────────────────────────────────────────── */}
      <section className="bg-white py-16 dark:bg-gray-900">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-center lg:px-8">
          <div className="relative mx-auto aspect-4/3 w-full max-w-lg overflow-hidden rounded-2xl shadow-xl">
            <Image
              src="/uploads/wall-painting/contractor.jpg"
              alt="Wall painting contractor in Dubai"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Hire The Best Wall Painting Contractor in Dubai, UAE
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              We are Dubai&apos;s top-rated wall painting experts, delivering
              flawless finishes for homes, offices, and commercial spaces. Our
              services include interior and exterior painting and everything
              from primer to the final coat.
            </p>
            <p className="mt-3 text-gray-600 dark:text-gray-300">
              Whether you need a fresh coat for your villa, apartment, or
              office, our team brings the expertise and quality to transform
              your space. We offer clear pricing, flexible scheduling, and a
              100% satisfaction guarantee.
            </p>
            <a
              href="#quote"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-orange-600"
            >
              Request A Free Quote
              <ChevronRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      {/* ─── Quote Form + Stats ──────────────────────────────────────── */}
      <section id="quote" className="bg-blue-600 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold">
            Get a Free Quote from Top Wall Painting Company in Dubai
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-blue-100">
            Friendly Wall Painting Services
          </p>

          {/* Stats row */}
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-4xl font-extrabold">300+</p>
              <p className="mt-1 text-sm text-blue-200">
                Local Projects Completed
              </p>
            </div>
            <div>
              <p className="text-4xl font-extrabold">500+</p>
              <p className="mt-1 text-sm text-blue-200">Wall Paintings</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold">24/7</p>
              <p className="mt-1 text-sm text-blue-200">
                Emergency Availability
              </p>
            </div>
          </div>

          {/* Contact form (client component) */}
          <WallPaintingClient />
        </div>
      </section>

      {/* ─── FAQs ────────────────────────────────────────────────────── */}
      <section className="bg-white py-16 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white">
            FAQs About Wall Painting Services in Dubai
          </h2>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group py-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between text-left font-semibold text-gray-900 dark:text-white">
                  {faq.q}
                  <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-16 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center text-3xl font-bold text-gray-900 dark:text-white">
            What Our Customers Say
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-sm italic text-gray-600 dark:text-gray-300">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {t.name}
                  </p>
                  <p className="text-xs text-gray-500">{t.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA Footer ───────────────────────────────────────── */}
      <section className="bg-[#1B1464] py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          <div>
            <h3 className="mb-3 text-lg font-bold">Services</h3>
            <ul className="space-y-1 text-sm text-blue-200">
              <li>Interior Painting</li>
              <li>Exterior Painting</li>
              <li>Commercial Painting</li>
              <li>Villa Painting</li>
              <li>Office Painting</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-lg font-bold">Quick Links</h3>
            <ul className="space-y-1 text-sm text-blue-200">
              <li>
                <Link href="/about" className="hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-lg font-bold">Contact Us</h3>
            <ul className="space-y-2 text-sm text-blue-200">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href="tel:+971585317499" className="hover:text-white">
                  +971 585 317 499
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a
                  href="mailto:info@wallpaintingservice.com"
                  className="hover:text-white"
                >
                  info@wallpaintingservice.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Warehouse 12, Office 201, Al Quoz 3, Dubai, UAE
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

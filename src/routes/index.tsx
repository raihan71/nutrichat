import { ThemeToggle } from "@/components/theme-toggle";
import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NutriZenChat — Ahli gizi di saku Anda" },
      {
        name: "description",
        content: "Ide menu dan saran gizi yang dipersonalisasi secara instan lewat chat AI.",
      },
      { property: "og:title", content: "NutriZenChat — Ahli gizi di saku Anda" },
      {
        property: "og:description",
        content: "Ide menu dan saran gizi yang dipersonalisasi secara instan lewat chat AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const prompts = [
  "Makan siang tinggi protein di bawah Rp50 ribu",
  "Makan apa sebelum olahraga?",
  "Sarapan cepat di kos",
  "Camilan yang bikin tetap berenergi",
];

function Index() {
  const { isSignedIn } = useUser();
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="glow-blob bg-glow-1 h-96 w-96 -left-20 top-10" />
      <div
        className="glow-blob bg-glow-2 h-[28rem] w-[28rem] right-0 top-40"
        style={{ animationDelay: "-5s" }}
      />
      <div
        className="glow-blob bg-glow-3 h-80 w-80 left-1/3 bottom-0"
        style={{ animationDelay: "-9s" }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-2xl font-extrabold tracking-tight">
          nutrizen<span className="text-primary">.</span>
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />{" "}
          <Link
            to="/chat"
            search={{}}
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold hover:bg-secondary transition-colors"
          >
            {isSignedIn ? "Mulai Chat" : "Masuk"}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-20 pb-32 text-center">
        <span className="mb-6 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
          Ahli gizi di saku Anda ✦ tanpa ribet
        </span>
        <h1 className="text-5xl font-extrabold leading-[0.95] tracking-tight md:text-8xl">
          Makan lebih cerdas.
          <br />
          <span className="text-gradient">Cukup tanya.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-muted-foreground">
          Menu personal dan saran gizi nyata dalam hitungan detik — tanpa hitung kalori, tanpa info
          yang membingungkan.
        </p>
        <Link
          to="/chat"
          search={{}}
          className="mt-10 rounded-full bg-primary px-9 py-4 text-lg font-bold text-primary-foreground shadow-[0_0_60px_-10px_var(--glow-1)] transition-transform hover:scale-105"
        >
          {isSignedIn ? "Mulai Chat" : "Mulai Sekarang"}
        </Link>
        <div className="mt-16 flex flex-wrap justify-center gap-3">
          {prompts.map((p) => (
            <Link
              key={p}
              to="/chat"
              search={{ q: p }}
              className="rounded-full border border-border bg-card/60 px-4 py-2 text-sm backdrop-blur hover:border-primary transition-colors"
            >
              {p}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

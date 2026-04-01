"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight, Zap, Brain, Layers, Gamepad2, Globe,
  Code, Cpu, Shield, Rocket, Monitor, Volume2, Mountain, Wifi,
  Youtube,
} from "lucide-react"

const features = [
  { icon: Brain, title: "9 AI Agents", desc: "Specialized agents for architecture, rendering, physics, networking, gameplay, audio, procedural gen, optimization, and tooling" },
  { icon: Layers, title: "Full Code Generation", desc: "Production-ready C++ with Unreal UCLASS, replication, Blueprints, and multiplayer support" },
  { icon: Gamepad2, title: "Infinite Genre Possibilities", desc: "Generate any genre, subgenre, or hybrid blend — from shooters and RPGs to cozy sims, political strategy, heists, mysteries, and beyond" },
  { icon: Globe, title: "4 Target Engines", desc: "Generate for Unreal Engine 5, Godot 4, Unity, or custom C++ engines" },
  { icon: Cpu, title: "Self-Improving Brain", desc: "182+ cycles of continuous learning from 6 open-source engines and 16 standalone libraries" },
  { icon: Shield, title: "Production Quality", desc: "Cache-friendly, SIMD-optimized, multiplayer-ready code with proper memory management" },
]

const steps = [
  { num: "1", title: "Describe Your Game", desc: "Tell us what you want to build in plain English. Our AI understands game design." },
  { num: "2", title: "Configure & Customize", desc: "Pick your genre, engine, features, and multiplayer settings. We handle the architecture." },
  { num: "3", title: "Generate & Download", desc: "9 agents work in parallel to generate complete, production-ready game systems." },
]

const BRAND_LOGO_SRC = "/brand-logo-cropped.png"
const SOCIAL_LINKS = {
  discord: "https://discord.com",
  youtube: "https://youtube.com",
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#000000]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src={BRAND_LOGO_SRC}
              alt="Funaloo"
              width={1025}
              height={493}
              priority
              className="h-10 w-auto md:h-11"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/5 to-transparent" />
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(139,92,246,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          <Badge variant="outline" className="mb-6 border-violet-500/30 text-violet-400">
            Powered by 9 Specialized AI Agents
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              AI-Powered
            </span>
            <br />
            Game Development
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Describe your game in plain English. Funaloo generates production-ready C++ code
            with multiplayer, physics, AI, audio, and more.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 h-12 px-8">
                Start Building <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-12 px-8">
                Log In
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { value: "182+", label: "Brain Cycles" },
              { value: "4,962", label: "Training Pairs" },
              { value: "15,827", label: "Lines Generated" },
              { value: "247", label: "Research Links" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold font-mono bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Everything You Need to Build Games</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Each feature is backed by deep domain expertise absorbed from the best open-source game engines in the world.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border/50 bg-card/50 p-6 hover:border-violet-500/30 transition-colors">
                <div className="rounded-lg bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 w-10 h-10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-violet-400" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-t border-border/50 bg-muted/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground">Three steps from idea to production code.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div className="text-5xl font-bold font-mono text-violet-500/20 mb-4">{step.num}</div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Fleet */}
      <section className="py-20 border-t border-border/50 bg-muted/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Meet Your AI Agent Fleet</h2>
            <p className="text-muted-foreground">9 specialized agents work in parallel to build your game.</p>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { icon: Code, name: "Architect" },
              { icon: Monitor, name: "Renderer" },
              { icon: Wifi, name: "Network" },
              { icon: Zap, name: "Physics" },
              { icon: Gamepad2, name: "Gameplay" },
              { icon: Volume2, name: "Audio" },
              { icon: Mountain, name: "Procedural" },
              { icon: Rocket, name: "Optimizer" },
              { icon: Cpu, name: "Tooling" },
            ].map((agent) => (
              <div key={agent.name} className="rounded-xl border border-border/50 bg-card/50 p-4 text-center hover:border-violet-500/30 transition-colors">
                <agent.icon className="h-6 w-6 mx-auto mb-2 text-violet-400" />
                <p className="text-sm font-medium">{agent.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border/50">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build Your Game?</h2>
          <p className="text-muted-foreground mb-8">
            Join Funaloo and let AI generate production-ready game code in minutes, not months.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 h-12 px-10">
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#000000] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src={BRAND_LOGO_SRC}
                alt="Funaloo"
                width={1025}
                height={493}
                className="h-12 w-auto md:h-14"
              />
            </Link>
          </div>
          <div className="flex items-center gap-3 sm:justify-end">
            <a
              href={SOCIAL_LINKS.discord}
              target="_blank"
              rel="noreferrer"
              aria-label="Discord"
              className="rounded-full border border-white/10 bg-white/5 p-2.5 text-white/70 transition-colors hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.078.037 13.336 13.336 0 0 0-.608 1.249 18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.249.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.143 14.143 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.04.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.836 19.836 0 0 0 6.002-3.03.077.077 0 0 0 .031-.057c.5-5.177-.838-9.673-3.548-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.331c-1.182 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.175 1.094 2.156 2.418 0 1.334-.955 2.419-2.156 2.419Zm7.975 0c-1.183 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.175 1.094 2.156 2.418 0 1.334-.946 2.419-2.156 2.419Z" />
              </svg>
            </a>
            <a
              href={SOCIAL_LINKS.youtube}
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className="rounded-full border border-white/10 bg-white/5 p-2.5 text-white/70 transition-colors hover:text-white"
            >
              <Youtube className="h-5 w-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

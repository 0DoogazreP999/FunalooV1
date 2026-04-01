"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import {
  AtSign,
  ExternalLink,
  Github,
  Globe,
  ImagePlus,
  Linkedin,
  PencilLine,
  Twitter,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { RegisteredUser, UserConnections } from "@/lib/user-store"

const CONNECTION_FIELDS = [
  { key: "discord", label: "Discord", icon: AtSign, placeholder: "username, discord.gg link, or user id" },
  { key: "twitter", label: "X / Twitter", icon: Twitter, placeholder: "@handle or https://x.com/handle" },
  { key: "github", label: "GitHub", icon: Github, placeholder: "username or https://github.com/username" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "profile slug or profile URL" },
  { key: "website", label: "Website", icon: Globe, placeholder: "https://your-site.com" },
] as const

type ConnectionKey = typeof CONNECTION_FIELDS[number]["key"]

interface SidebarProfileCardProps {
  user: RegisteredUser | null
  collapsed: boolean
  onSaveProfile: (updates: Partial<RegisteredUser>) => void
}

function createDraft(user: RegisteredUser) {
  return {
    name: user.name,
    tagline: user.tagline,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    connections: {
      discord: user.connections.discord,
      twitter: user.connections.twitter,
      github: user.connections.github,
      linkedin: user.connections.linkedin,
      website: user.connections.website,
    },
  }
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U"
}

function ensureUrl(value: string) {
  if (!value) return ""
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function resolveConnectionHref(key: ConnectionKey, value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  switch (key) {
    case "twitter":
      return `https://x.com/${trimmed.replace(/^@/, "")}`
    case "github":
      return `https://github.com/${trimmed.replace(/^@/, "")}`
    case "linkedin":
      return `https://www.linkedin.com/in/${trimmed.replace(/^@/, "")}`
    case "discord":
      if (/^\d+$/.test(trimmed)) {
        return `https://discord.com/users/${trimmed}`
      }
      if (/discord\.gg|discord\.com/i.test(trimmed)) {
        return ensureUrl(trimmed)
      }
      return ""
    case "website":
      return ensureUrl(trimmed)
    default:
      return ""
  }
}

function hasAnyConnections(connections: UserConnections) {
  return Object.values(connections).some((value) => value.trim().length > 0)
}

export function SidebarProfileCard({
  user,
  collapsed,
  onSaveProfile,
}: SidebarProfileCardProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() =>
    user
      ? createDraft(user)
      : {
          name: "",
          tagline: "",
          bio: "",
          avatarUrl: "",
          connections: {
            discord: "",
            twitter: "",
            github: "",
            linkedin: "",
            website: "",
          },
        },
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    setDraft(createDraft(user))
  }, [user])

  const visibleConnections = useMemo(() => {
    if (!user) return []

    return CONNECTION_FIELDS
      .map((field) => ({
        ...field,
        value: user.connections[field.key],
        href: resolveConnectionHref(field.key, user.connections[field.key]),
      }))
      .filter((field) => field.value.trim())
  }, [user])

  if (!user) return null

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string") return
      setDraft((current) => ({ ...current, avatarUrl: result }))
    }
    reader.readAsDataURL(file)
  }

  const saveProfile = () => {
    onSaveProfile({
      name: draft.name.trim() || user.name,
      tagline: draft.tagline.trim(),
      bio: draft.bio.trim(),
      avatarUrl: draft.avatarUrl.trim(),
      connections: {
        discord: draft.connections.discord.trim(),
        twitter: draft.connections.twitter.trim(),
        github: draft.connections.github.trim(),
        linkedin: draft.connections.linkedin.trim(),
        website: draft.connections.website.trim(),
      },
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`w-full rounded-xl border border-border/50 bg-background/50 text-left transition-colors hover:bg-accent/40 ${
            collapsed ? "flex items-center justify-center p-2" : "space-y-3 p-3"
          }`}
        >
          {collapsed ? (
            <Avatar className="h-9 w-9 border border-border/50">
              <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 border border-border/50">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <PencilLine className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {user.tagline || "Add a profile photo and your creator links."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {visibleConnections.slice(0, 4).map((connection) => {
                  const Icon = connection.icon
                  return (
                    <div
                      key={connection.key}
                      className="rounded-full border border-border/50 p-1.5 text-muted-foreground"
                      aria-label={connection.label}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  )
                })}
                {!hasAnyConnections(user.connections) && (
                  <Badge variant="outline" className="text-[10px]">
                    Add links
                  </Badge>
                )}
              </div>
            </>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile photo, creator identity, and public connection links for the sidebar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 border border-border/50">
                <AvatarImage src={draft.avatarUrl || undefined} alt={draft.name || user.name} />
                <AvatarFallback className="text-lg">{getInitials(draft.name || user.name)}</AvatarFallback>
              </Avatar>
              <p className="mt-3 text-sm font-semibold">{draft.name || user.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {draft.tagline || "Creator profile preview"}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="mr-2 h-4 w-4" />
                Upload Photo
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setDraft((current) => ({ ...current, avatarUrl: "" }))}
              >
                Remove Photo
              </Button>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Display Name</Label>
                <Input
                  id="profile-name"
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Your creator name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-tagline">Tagline</Label>
                <Input
                  id="profile-tagline"
                  value={draft.tagline}
                  onChange={(event) => setDraft((current) => ({ ...current, tagline: event.target.value }))}
                  placeholder="What kind of games do you build?"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-avatar-url">Photo URL</Label>
              <Input
                id="profile-avatar-url"
                value={draft.avatarUrl}
                onChange={(event) => setDraft((current) => ({ ...current, avatarUrl: event.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-bio">Short Bio</Label>
              <Textarea
                id="profile-bio"
                rows={4}
                value={draft.bio}
                onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
                placeholder="Tell people what you make, what you care about, or where to find you."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {CONNECTION_FIELDS.map((field) => {
                const Icon = field.icon

                return (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={`profile-${field.key}`}>{field.label}</Label>
                    <div className="relative">
                      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id={`profile-${field.key}`}
                        value={draft.connections[field.key]}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            connections: {
                              ...current.connections,
                              [field.key]: event.target.value,
                            },
                          }))
                        }
                        placeholder={field.placeholder}
                        className="pl-9"
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live Connection Preview</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CONNECTION_FIELDS.map((field) => {
                  const value = draft.connections[field.key].trim()
                  if (!value) return null

                  const href = resolveConnectionHref(field.key, value)
                  return href ? (
                    <a
                      key={field.key}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <field.icon className="h-3.5 w-3.5" />
                      <span>{field.label}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <Badge key={field.key} variant="outline" className="gap-1">
                      <field.icon className="h-3.5 w-3.5" />
                      {field.label}
                    </Badge>
                  )
                })}
                {!CONNECTION_FIELDS.some((field) => draft.connections[field.key].trim()) && (
                  <p className="text-sm text-muted-foreground">Add handles or links to see them preview here.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={saveProfile}>
            Save Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

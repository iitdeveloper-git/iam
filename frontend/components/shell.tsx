"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut as nextAuthSignOut } from "next-auth/react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AppWindow,
  Bell,
  BookOpen,
  ChevronDown,
  CircleHelp,
  FileClock,
  KeyRound,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import { MaintenanceState } from "@/components/ui";
import { clearStoredAccessToken, getMe, getSystemHealth } from "@/lib/api/client";

const navGroups = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Overview", icon: LayoutDashboard }]
  },
  {
    label: "Identity",
    items: [
      { href: "/applications", label: "Applications", icon: AppWindow },
      { href: "/users", label: "Users", icon: UserRound },
      { href: "/invitations", label: "Invitations", icon: FileClock }
    ]
  },
  {
    label: "Governance",
    items: [
      { href: "/security", label: "Security", icon: Shield },
      { href: "/audit", label: "Audit", icon: Activity },
      { href: "/developer", label: "Developer", icon: KeyRound }
    ]
  }
];

type AuthSession = {
  accessToken?: string;
  expiresAt?: number;
  user?: {
    email?: string | null;
    name?: string | null;
  };
};

function hasFreshAccessToken(session: AuthSession | null) {
  if (!session?.accessToken) return false;
  return typeof session.expiresAt !== "number" || session.expiresAt > Math.floor(Date.now() / 1000) + 30;
}

function startIamSignIn() {
  if (typeof window === "undefined") return;
  const callbackUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl || "/")}`;
}

function useProfile() {
  const [email, setEmail] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    getMe()
      .then((profile) => {
        if (!alive) return;
        setEmail(profile.email);
        setRoles(profile.roles);
      })
      .catch(() => {
        if (!alive) return;
        setEmail(null);
        setRoles([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { email, roles };
}

function initials(email: string | null) {
  if (!email) return "IAM";
  const name = email.split("@")[0]?.replace(/[._-]+/g, " ") ?? email;
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "IAM";
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar({
  collapsed,
  onNavigate
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <aside className="flex h-full flex-col border-r border-line bg-white">
      <div className="flex h-[72px] items-center gap-3 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand/10 text-brand">
          <ShieldCheck className="h-6 w-6" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-tight text-ink">IITD IAM</div>
            <div className="text-sm text-slate-500">Admin Console</div>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed ? <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{group.label}</div> : null}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                      active
                        ? "bg-brand/10 text-brand shadow-[inset_3px_0_0_#0f8f7a]"
                        : "text-slate-700 hover:bg-slate-50 hover:text-ink"
                    } ${collapsed ? "justify-center" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <Link
          href="/security"
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-5 w-5" />
          {!collapsed ? <span>Settings</span> : null}
        </Link>
        {!collapsed ? (
          <div className="mt-3 rounded-md border border-line bg-slate-50 p-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              System status
            </div>
            <Link href="/" className="mt-2 inline-flex items-center gap-1 text-brand hover:text-brand-dark">
              View dashboard
            </Link>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function TopNavigation({
  collapsed,
  onToggleSidebar,
  onOpenMobile
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobile: () => void;
}) {
  const pathname = usePathname();
  const { email, roles } = useProfile();
  const [profileOpen, setProfileOpen] = useState(false);
  const breadcrumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return ["Overview"];
    return parts.map((part) => part.replaceAll("-", " "));
  }, [pathname]);

  const handleSignOut = () => {
    clearStoredAccessToken();
    setProfileOpen(false);
    void nextAuthSignOut({ callbackUrl: "/" });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="flex h-[72px] items-center gap-4 px-4 md:px-6">
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-md border border-line p-2 text-slate-600 hover:bg-slate-50 md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden rounded-md border border-line p-2 text-slate-600 hover:bg-slate-50 md:inline-flex"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden min-w-0 text-sm text-slate-500 lg:block">
          <span className="font-medium text-ink">IAM</span>
          {breadcrumbs.map((part) => (
            <span key={part} className="capitalize"> / {part}</span>
          ))}
        </div>

        <div className="mx-auto hidden w-full max-w-xl md:block">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search users, applications, policies..."
              className="h-11 w-full rounded-md border border-line bg-white pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </label>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/developer" className="hidden rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex">
            <BookOpen className="mr-2 h-4 w-4" />
            Docs
          </Link>
          <Link href="/security" className="rounded-md border border-line p-2 text-slate-600 hover:bg-slate-50" aria-label="Help and support">
            <CircleHelp className="h-5 w-5" />
          </Link>
          <Link href="/audit" className="relative rounded-md border border-line p-2 text-slate-600 hover:bg-slate-50" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">!</span>
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-slate-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{initials(email)}</span>
              <span className="hidden min-w-0 md:block">
                <span className="block max-w-[180px] truncate text-sm font-semibold text-ink">{email ?? "Not signed in"}</span>
                <span className="block text-xs text-slate-500">{roles[0] ?? "Administrator"}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-slate-500 md:block" />
            </button>
            {profileOpen ? (
              <div className="absolute right-0 mt-2 w-72 rounded-md border border-line bg-white p-2 shadow-xl">
                <div className="border-b border-line px-3 py-3">
                  <div className="text-sm font-semibold text-ink">{email ?? "No active admin session"}</div>
                  <div className="mt-1 text-xs text-slate-500">{roles.length ? roles.join(", ") : "Sign in to load protected IAM data."}</div>
                </div>
                <Link href="/users" className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setProfileOpen(false)}>
                  <UsersRound className="h-4 w-4" />
                  Profile and access
                </Link>
                <Link href="/security" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setProfileOpen(false)}>
                  <Shield className="h-4 w-4" />
                  Security settings
                </Link>
                {email ? (
                  <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-brand hover:bg-brand/10"
                    onClick={() => {
                      setProfileOpen(false);
                      startIamSignIn();
                    }}
                  >
                    <LogIn className="h-4 w-4" />
                    Sign in with IAM
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("iitd_iam_sidebar_collapsed");
    if (stored) setCollapsed(stored === "true");
  }, []);

  useEffect(() => {
    let alive = true;
    async function requireSession() {
      try {
        const health = await getSystemHealth();
        if (!alive) return;
        if (health.status !== "ready") {
          setMaintenanceMessage(`Current service status: ${health.status}`);
          return;
        }

        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const session = response.ok ? ((await response.json()) as AuthSession) : null;
        if (!alive) return;
        if (!hasFreshAccessToken(session)) {
          clearStoredAccessToken();
          startIamSignIn();
          return;
        }
        setAuthReady(true);
      } catch {
        if (!alive) return;
        setMaintenanceMessage("The IAM backend is not reachable right now.");
      }
    }

    void requireSession();
    return () => {
      alive = false;
    };
  }, []);

  const toggleSidebar = () => {
    setCollapsed((next) => {
      window.localStorage.setItem("iitd_iam_sidebar_collapsed", String(!next));
      return !next;
    });
  };

  if (maintenanceMessage) {
    return <MaintenanceState detail={<span>{maintenanceMessage}</span>} />;
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa] px-6 text-center text-sm text-slate-600">
        <div>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-brand/10 text-brand">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="text-base font-semibold text-ink">Redirecting to IAM sign in</div>
          <div className="mt-1">Authentication is required to access the admin console.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-ink">
      <div className={`fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 md:block ${collapsed ? "w-[76px]" : "w-[268px]"}`}>
        <Sidebar collapsed={collapsed} />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-[280px] bg-white shadow-xl">
            <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 rounded-md p-2 text-slate-500 hover:bg-slate-50" aria-label="Close navigation">
              <X className="h-5 w-5" />
            </button>
            <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className={`min-h-screen transition-[padding] duration-200 ${collapsed ? "md:pl-[76px]" : "md:pl-[268px]"}`}>
        <TopNavigation collapsed={collapsed} onToggleSidebar={toggleSidebar} onOpenMobile={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-[1520px] px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

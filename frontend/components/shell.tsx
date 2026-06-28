import Link from "next/link";
import type React from "react";
import { Activity, AppWindow, FileClock, KeyRound, LayoutDashboard, Shield, UserRound } from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: AppWindow },
  { href: "/users", label: "Users", icon: UserRound },
  { href: "/invitations", label: "Invitations", icon: FileClock },
  { href: "/security", label: "Security", icon: Shield },
  { href: "/audit", label: "Audit", icon: Activity },
  { href: "/developer", label: "Developer", icon: KeyRound }
];

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white px-4 py-5 md:block">
        <div className="mb-8">
          <div className="text-lg font-semibold tracking-normal text-ink">IITD IAM</div>
          <div className="text-sm text-slate-500">Admin Console</div>
        </div>
        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl px-5 py-6">{children}</div>
      </main>
    </div>
  );
}

"use client";

import { signIn } from "next-auth/react";
import { Shield, LogIn, Cpu, Globe } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { MaintenanceState } from "@/components/ui";
import { getSystemHealth } from "@/lib/api/client";

function LoginContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null);

  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorMessage = useMemo(() => {
    const error = searchParams.get("error");
    if (!error) return null;
    if (error === "authentication_required") return "Authentication is required before opening the IAM admin console.";
    if (error === "authentication_failed") return "Authentication could not be verified. Please sign in again.";
    if (error === "OAuthCallback") return "The identity provider callback could not be completed. Please restart sign in.";
    return "Sign in was not completed. Please try again.";
  }, [searchParams]);

  useEffect(() => {
    let alive = true;
    getSystemHealth()
      .then((health) => {
        if (!alive) return;
        if (health.status !== "ready") {
          setMaintenanceMessage(`Current service status: ${health.status}`);
        }
      })
      .catch(() => {
        if (!alive) return;
        setMaintenanceMessage("The IAM backend is not reachable right now.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("iitd-iam", { callbackUrl });
    } catch (error) {
      console.error("Sign in failed:", error);
      setIsLoading(false);
    }
  };

  if (maintenanceMessage) {
    return <MaintenanceState detail={<span>{maintenanceMessage}</span>} />;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0b0f19] text-slate-100 overflow-hidden font-sans select-none">
      {/* Background glowing mesh circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      
      {/* Decorative grid pattern in background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Main container wrapper */}
      <div className="w-full max-w-md px-6 relative z-10">
        
        {/* Top Branding Section */}
        <div className="flex flex-col items-center mb-8 text-center animate-fade-in">
          {/* Glowing logo badge */}
          <div className="relative w-20 h-20 flex items-center justify-center rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl mb-4 group overflow-hidden">
            {/* Logo background gradient animation */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Custom SVG logo representing Shield & Keyhole */}
            <svg
              className="w-12 h-12 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300 relative z-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <circle cx="12" cy="11" r="3" />
              <path d="M12 14v4" />
              <path d="M10 16h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            IITD <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-400">IAM</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-xs">
            Identity &amp; Access Management Console
          </p>
        </div>

        {/* Frosted Glass Login Card */}
        <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative">
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 opacity-50 pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              Welcome Back
            </h2>
            <p className="text-slate-400 text-xs text-center mb-8">
              Sign in to manage application registration, permissions, and security policies.
            </p>

            {errorMessage ? (
              <div className="mb-5 rounded-md border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                {errorMessage}
              </div>
            ) : null}

            {/* Action Button */}
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="relative group overflow-hidden w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-emerald-500/10 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting to Keycloak...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 text-emerald-100 group-hover:translate-x-0.5 transition-transform duration-200" />
                  <span>Sign in with IITD IAM</span>
                </>
              )}
            </button>

            {/* System Status Grid */}
            <div className="mt-8 pt-6 border-t border-slate-800/60 grid grid-cols-2 gap-4 text-xs font-medium">
              <div className="flex items-center gap-2 text-slate-400">
                <Shield className="w-4 h-4 text-emerald-500/80" />
                <span>OIDC / PKCE</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Globe className="w-4 h-4 text-emerald-500/80" />
                <span>Single Sign-On</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Cpu className="w-4 h-4 text-emerald-500/80" />
                <span>API Status: Online</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Secure Session</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Footnote */}
        <div className="text-center mt-6 text-[10px] text-slate-500 tracking-wide uppercase">
          Authorized Access Only • AES-256 encrypted
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<MaintenanceState title="Preparing IAM sign in" description="Loading the secure sign-in experience." />}>
      <LoginContent />
    </Suspense>
  );
}

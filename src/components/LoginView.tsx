/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LogIn, 
  Key, 
  Mail, 
  Shield, 
  User as UserIcon, 
  Briefcase,
  Users,
  Calendar,
  MessageSquare,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { User } from '../types.js';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemoInfo, setShowDemoInfo] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.showLoginDemoInfo === 'boolean') {
            setShowDemoInfo(data.showLoginDemoInfo);
          }
        }
      } catch (err) {
        console.error("Failed to fetch login settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  const triggerQuickLogin = async (roleEmail: string, rolePass: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: roleEmail, password: rolePass }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* Left panel: Modern Enterprise Hero Showcase (Visible on Desktop / Tablet) */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden select-none">
        
        {/* Abstract futuristic background grid and glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-wider uppercase bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              RecruitCore
            </span>
            <span className="text-[10px] block text-indigo-400 font-semibold tracking-widest uppercase">
              Management Suite
            </span>
          </div>
        </div>

        {/* Feature Copy */}
        <div className="relative z-10 my-auto max-w-lg space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
              Streamline Your Entire <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                Hiring Ecosystem
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Experience the unified enterprise workspace for modern talent acquisition. Speed up screening cycles, manage scheduling, and sync your collaborative team pipelines seamlessly.
            </p>
          </div>

          {/* Highlight Cards */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 mt-0.5 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Interactive Pipeline Management</h4>
                <p className="text-xs text-slate-400">Track and move candidates across fully custom recruiting workflows in real-time.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 mt-0.5 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Unified Interview Scheduling</h4>
                <p className="text-xs text-slate-400">Book interview rounds, sync scores, and coordinate panel feedbacks on a central calendar.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 mt-0.5 shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Real-time Team Broadcasts</h4>
                <p className="text-xs text-slate-400">Instantly converse with co-recruiters and leaders using our integrated channel chat.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="relative z-10 pt-6 border-t border-slate-800 grid grid-cols-3 gap-4">
          <div>
            <div className="text-lg font-bold text-slate-100 flex items-center space-x-1">
              <TrendingUp className="w-4 h-4 text-emerald-400 inline" />
              <span>98.6%</span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Offer Acceptance</p>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-100">12.4 Days</div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Average Time-to-Hire</p>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-100">Active</div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Enterprise SLA</p>
          </div>
        </div>

      </div>

      {/* Right panel: Modern Credentials Input Form (Centered on mobile, beautifully integrated on desktop) */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 bg-slate-50 relative">
        
        {/* Glow Effects on mobile / subtle accents on desktop */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none md:hidden" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none md:hidden" />

        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-xl p-8 space-y-6 relative overflow-hidden">
          
          {/* Accent Line top */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700" />

          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 mb-2 md:hidden">
              <Briefcase className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Welcome to RecruitCore
            </h2>
            <p className="text-xs text-slate-500">
              Sign in with your credentials or select a quick demo role below.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-450 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-450 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all shadow-md hover:shadow-indigo-600/10 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In Securely</span>
                </>
              )}
            </button>
          </form>

          {showDemoInfo && (
            <>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-3 text-slate-400 font-bold tracking-widest">
                    Quick Secure Login
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  id="demo-login-admin"
                  type="button"
                  onClick={() => triggerQuickLogin("rohitrajj0921@gmail.com", "9523103315")}
                  className="w-full bg-slate-50/50 hover:bg-indigo-50/20 hover:border-indigo-100 border border-slate-200 rounded-xl p-3 text-left transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 border border-indigo-100 transition-colors shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Rohit Raj</div>
                      <div className="text-[10px] text-slate-500 font-medium">rohitrajj0921@gmail.com • Admin</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 group-hover:translate-x-1 transition-transform uppercase tracking-wider shrink-0">Login →</span>
                </button>

                <button
                  id="demo-login-leader"
                  type="button"
                  onClick={() => triggerQuickLogin("rohitrajj2109@gmail.com", "9523103315")}
                  className="w-full bg-slate-50/50 hover:bg-indigo-50/20 hover:border-indigo-100 border border-slate-200 rounded-xl p-3 text-left transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-200 border border-slate-200 transition-colors shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Rohit Raj (Alternative)</div>
                      <div className="text-[10px] text-slate-500 font-medium">rohitrajj2109@gmail.com • Admin</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 group-hover:translate-x-1 transition-transform uppercase tracking-wider shrink-0">Login →</span>
                </button>
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  );
}

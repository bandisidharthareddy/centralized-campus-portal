'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('sidhartha@vnrvjiet.in');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-configured test personas from database seed
  const testPersonas = [
    {
      role: 'STUDENT',
      name: 'Sidhartha Reddy',
      email: 'sidhartha@vnrvjiet.in',
      badge: 'STU / CSE',
      desk: 'Student Portal (Requester)',
      target: '/',
      icon: 'school',
      color: 'bg-[#fef8ea] text-[#925f0a] border-[#f3d99e]'
    },
    {
      role: 'CLUB_COORDINATOR',
      name: 'Pavan Sai Abhishek',
      email: 'pavan.club@vnrvjiet.in',
      badge: 'CLUB / CSI',
      desk: 'Club Portal (Requester)',
      target: '/',
      icon: 'groups',
      color: 'bg-[#edf5f8] text-[#1e617a] border-[#b8dae6]'
    },
    {
      role: 'DEPT_HEAD',
      name: 'Ishanth Kulkarni',
      email: 'ishanth.head@vnrvjiet.in',
      badge: 'HOD / CSE',
      desk: 'Processor Queue (Admin Only)',
      target: '/admin',
      icon: 'account_balance',
      color: 'bg-[#edf7f2] text-[#1c6943] border-[#b2e0ca]'
    },
    {
      role: 'FACULTY_COORDINATOR',
      name: 'Bairu Vamshi Krishna',
      email: 'vamshi.faculty@vnrvjiet.in',
      badge: 'FACULTY',
      desk: 'Mentor Queue (Admin Only)',
      target: '/admin',
      icon: 'supervisor_account',
      color: 'bg-[#f5f0f9] text-[#643485] border-[#d9c4e8]'
    },
    {
      role: 'ADMIN_STAFF',
      name: 'Balagolla Isaac Vivek',
      email: 'isaac.staff@vnrvjiet.in',
      badge: 'ESTATE STAFF',
      desk: 'Operations Queue (Admin Only)',
      target: '/admin',
      icon: 'badge',
      color: 'bg-[#fdf2f2] text-[#9e2a2b] border-[#f5c2c2]'
    }
  ];

  const handleLogin = async (loginEmail?: string, loginPassword?: string, forcedTarget?: string) => {
    const finalEmail = loginEmail || email;
    const finalPassword = loginPassword || password;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: finalEmail, password: finalPassword })
      });

      const data = await res.json();

      if (data.success) {
        const userRole = (data.data.role || '').toLowerCase().replace(/_/g, '');
        localStorage.setItem('vnr_user', JSON.stringify(data.data));

        if (forcedTarget) {
          router.push(forcedTarget);
        } else if (['student', 'clubcoordinator'].includes(userRole)) {
          router.push('/');
        } else {
          router.push('/admin');
        }
      } else {
        setErrorMessage(data.message || 'Invalid credentials or inactive account.');
      }
    } catch (err) {
      setErrorMessage('Network error connecting to Campus Governance API.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen beige-mesh-bg font-sans text-[#28221a] flex flex-col justify-between p-4 sm:p-8 selection:bg-[#ecd6ad]">
      {/* Top Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-4 border-b border-[#dfd5c3]">
        <div className="flex items-center gap-3">
          <div className="bg-[#2a241b] text-white p-2.5 rounded-2xl shadow-xs flex items-center gap-2.5">
            <img src="/icon.png" alt="VNR VJIET" className="w-8 h-8 object-contain rounded-lg bg-white/10 p-0.5" />
            <div>
              <div className="font-bold text-sm leading-tight tracking-wider">VNR VJIET</div>
              <div className="text-[10px] font-mono text-[#a89985] leading-none">Autonomous &bull; Hyderabad</div>
            </div>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-[#faeed6] text-[#694e19] border border-[#d8c5a5] text-xs font-bold shadow-2xs">
            BACHUPALLY CAMPUS
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#7e6f5c]">
          <span className="w-2 h-2 rounded-full bg-[#279962] animate-pulse"></span>
          <span>CAMPUS SSO GATEWAY &bull; AY 2024-25</span>
        </div>
      </header>

      {/* Main Login Card - Frosted Beige Glass */}
      <main className="max-w-5xl w-full mx-auto my-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-6 beige-glass-card p-8 relative flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <span className="text-[11px] font-mono text-[#8a7b68] uppercase font-bold tracking-wider block">
                  LEGAL AUTHENTICATION DESK
                </span>
                <h1 className="text-2xl font-black text-[#28221a] tracking-tight mt-1">
                  Sign In to Governance Portal
                </h1>
                <p className="text-xs text-[#6a5b47] mt-1 leading-relaxed">
                  Authenticate your institutional credentials to submit petitions, manage venue dockets, or process administrative clearances.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-[#fae8e8] border border-[#eed0d0] text-[#9c2b2d] text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[#4a3e2c] mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">mail</span>
                    <span>Institutional VNR Email ID</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rollno@vnrvjiet.in or staff@vnrvjiet.in"
                    className="w-full bg-white/90 text-[#28221a] text-xs p-3 rounded-xl border border-[#dfd5c3] focus:outline-none focus:ring-2 focus:ring-[#d4a359] shadow-xs"
                  />
                  <span className="text-[11px] text-[#8a7b68] font-mono mt-1 block">
                    Institutional domain: @vnrvjiet.in
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[#4a3e2c] mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">key</span>
                    <span>Encrypted Passkey</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full bg-white/90 text-[#28221a] text-xs p-3 rounded-xl border border-[#dfd5c3] focus:outline-none focus:ring-2 focus:ring-[#d4a359] shadow-xs"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#d4a359] hover:bg-[#c69446] text-[#1c1404] font-bold py-3 px-4 rounded-xl shadow-[0_4px_16px_rgba(212,163,89,0.35)] transition-all flex items-center justify-center gap-2 text-xs ios-btn-tactile"
                  >
                    <span className="material-symbols-outlined text-base">verified</span>
                    <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate & Enter'}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-6 pt-3 border-t border-[#dfd5c3] text-[11px] font-mono text-[#8a7b68] flex items-center justify-between">
              <span>STATELESS JWT / BCRYPT HASH</span>
              <span className="font-semibold text-[#4a3e2c]">SECURE SESSION</span>
            </div>
          </div>

          {/* Right Column: One-Click Demo Personas */}
          <div className="lg:col-span-6 beige-glass-card p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#dfd5c3] pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-mono text-[#966719] font-bold uppercase tracking-wider block">
                    INSTITUTIONAL ROLES
                  </span>
                  <h2 className="text-base font-bold text-[#28221a]">
                    One-Click Persona Access
                  </h2>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#ede4d4] text-[#4a3e2c] font-bold border border-[#dfd5c3]">
                  TEST PERSONAS
                </span>
              </div>

              <div className="bg-[#fef8ea] border border-[#f3d99e] rounded-2xl p-3 mb-4 text-xs">
                <span className="font-bold text-[#7a5412] block mb-0.5">Strict RBAC Boundary Enforced:</span>
                <p className="text-[#6d4d16] leading-relaxed text-[11px]">
                  Students cannot access administrative processor desks. Logging in as a student locks your account exclusively to the <strong>Student Portal</strong>.
                </p>
              </div>

              <div className="space-y-2.5">
                {testPersonas.map((persona) => (
                  <div
                    key={persona.email}
                    onClick={() => handleLogin(persona.email, 'password123', persona.target)}
                    className="p-3 rounded-2xl bg-white/70 border border-[#dfd5c3] hover:border-[#cfb68d] hover:bg-[#faf4ea] hover:shadow-md cursor-pointer transition-all flex items-center justify-between gap-3 ios-btn-tactile"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-base ${persona.color}`}>
                        <span className="material-symbols-outlined text-lg">{persona.icon}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#28221a] text-xs">
                            {persona.name}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-[#ede4d4] font-bold text-[#4a3e2c]">
                            {persona.badge}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#7a6b57] font-mono mt-0.5">
                          {persona.email} &bull; {persona.desk}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl bg-[#d4a359] hover:bg-[#c69446] text-[#1c1404] text-xs font-bold whitespace-nowrap shadow-xs"
                    >
                      Login &rarr;
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-[#dfd5c3] text-[11px] text-[#8a7b68] font-mono flex items-center justify-between">
              <span>VNR-SSO-NODE-01</span>
              <span>RULE 1: STRICT OWNERSHIP ISOLATION</span>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center text-xs font-mono text-[#8a7b68] border-t border-[#dfd5c3] pt-4">
        &copy; 2024-25 VNR Vignana Jyothi Institute of Engineering and Technology &bull; Autonomous &bull; Bachupally, Hyderabad - 500090
      </footer>
    </div>
  );
}

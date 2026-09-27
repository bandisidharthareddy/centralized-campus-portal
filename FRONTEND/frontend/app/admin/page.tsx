'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AdminRequestItem {
  _id: string;
  service?: {
    _id?: string;
    name: string;
    department: string;
    category?: string;
  };
  submittedBy?: {
    _id?: string;
    name: string;
    email: string;
    role: string;
  };
  processedBy?: {
    _id?: string;
    name: string;
    role: string;
  };
  payload: {
    title?: string;
    department?: string;
    justification?: string;
    notes?: string;
    proof?: {
      fileName?: string;
      fileType?: string;
      documentUrl?: string;
      proofType?: string;
    };
    proofs?: {
      fileName?: string;
      fileType?: string;
      documentUrl?: string;
      proofType?: string;
    };
    [key: string]: any;
  };
  status: string;
  adminRemarks?: string;
  createdAt: string;
}

interface NotificationItem {
  _id?: string;
  id?: string;
  title: string;
  message: string;
  createdAt?: string;
  time?: string;
  type: string;
  isRead: boolean;
}

export default function AdminProcessorQueue() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Docket Processed Successfully');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [requests, setRequests] = useState<AdminRequestItem[]>([]);
  
  // Ticketing Modes: Active Scrutiny Queue vs Historical Archive
  const [ticketView, setTicketView] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');

  const [selectedDocket, setSelectedDocket] = useState<AdminRequestItem | null>(null);
  const [determination, setDetermination] = useState<'inReview' | 'approved' | 'rejected' | 'completed'>('approved');
  const [remarks, setRemarks] = useState('');
  const [dbStatus, setDbStatus] = useState('SYNCING');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Notifications for HOD
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/v1/notifications');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error('Error fetching admin notifications:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/v1/notifications/markRead', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const verifyAdminAuth = async () => {
    try {
      const meRes = await fetch('/api/v1/auth/me');
      const meData = await meRes.json();

      if (!meData.success || !meData.data) {
        const stored = localStorage.getItem('vnr_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          const role = (parsed.role || '').toLowerCase();
          if (['student', 'clubcoordinator'].includes(role)) {
            setIsAccessDenied(true);
            setIsCheckingAuth(false);
            return;
          }
        }
        router.push('/login');
        return;
      }

      const user = meData.data;
      setCurrentUser(user);

      const userRole = (user.role || '').toLowerCase();
      // Strict Block: Students and Club Coordinators are forbidden from accessing admin processor queue
      if (['student', 'clubcoordinator'].includes(userRole)) {
        setIsAccessDenied(true);
        setIsCheckingAuth(false);
        return;
      }

      setDbStatus('LIVE SYNC OK');
      setIsCheckingAuth(false);

      const queueRes = await fetch('/api/v1/admin/all');
      const queueData = await queueRes.json();
      if (queueData.success && Array.isArray(queueData.data)) {
        setRequests(queueData.data);
        
        const activeItems = queueData.data.filter((r: any) => {
          const s = (r.status || '').toLowerCase();
          return s === 'pending' || s === 'inreview';
        });
        if (activeItems.length > 0) {
          setSelectedDocket(activeItems[0]);
          setRemarks(activeItems[0].adminRemarks || '');
          const s = (activeItems[0].status || '').toLowerCase();
          if (['inreview', 'approved', 'rejected', 'completed'].includes(s)) {
            setDetermination(s === 'inreview' ? 'inReview' : s as any);
          }
        } else if (queueData.data.length > 0) {
          setSelectedDocket(queueData.data[0]);
        }
      }

      fetchNotifications();
    } catch (err) {
      console.error('Error verifying admin authorization:', err);
      router.push('/login');
    }
  };

  useEffect(() => {
    verifyAdminAuth();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout');
      localStorage.removeItem('vnr_user');
      router.push('/login');
    } catch (err) {
      router.push('/login');
    }
  };

  const handleSelectDocket = (item: AdminRequestItem) => {
    setSelectedDocket(item);
    setRemarks(item.adminRemarks || '');
    const s = (item.status || '').toLowerCase();
    if (['inreview', 'approved', 'rejected', 'completed'].includes(s)) {
      setDetermination(s === 'inreview' ? 'inReview' : s as any);
    } else {
      setDetermination('approved');
    }
  };

  const handleProcessDocket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocket) return;

    if (determination === 'rejected' && !remarks.trim()) {
      alert('Governance Rule: When rejecting a request, official admin remarks must explain the deficiency to the student.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/${selectedDocket._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: determination,
          adminRemarks: remarks
        })
      });

      const data = await res.json();
      if (data.success) {
        const isNowArchived = ['approved', 'rejected', 'completed'].includes(determination);
        setToastMessage(
          isNowArchived
            ? `Docket #${selectedDocket._id.slice(-6).toUpperCase()} marked as ${determination} and archived.`
            : `Docket #${selectedDocket._id.slice(-6).toUpperCase()} marked as ${determination}.`
        );
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
        
        const queueRes = await fetch('/api/v1/admin/all');
        const queueData = await queueRes.json();
        if (queueData.success) {
          setRequests(queueData.data);
          const activeItems = queueData.data.filter((r: any) => {
            const s = (r.status || '').toLowerCase();
            return s === 'pending' || s === 'inreview';
          });
          if (activeItems.length > 0) {
            setSelectedDocket(activeItems[0]);
            setRemarks(activeItems[0].adminRemarks || '');
          }
        }
        fetchNotifications();
      } else {
        alert(data.message || 'Failed to update docket status');
      }
    } catch (err) {
      alert('Error updating status on server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRequests = requests.filter(r => {
    const s = (r.status || '').toLowerCase();
    return s === 'pending' || s === 'inreview';
  });

  const archivedRequests = requests.filter(r => {
    const s = (r.status || '').toLowerCase();
    return ['approved', 'rejected', 'completed', 'cancelled'].includes(s);
  });

  const listToFilter = ticketView === 'ACTIVE' ? activeRequests : archivedRequests;

  const filteredRequests = listToFilter.filter((r) => {
    const dept = (r.service?.department || '').toLowerCase();
    const selDomain = selectedDomain.toLowerCase();
    const matchesDomain = selDomain === 'all' || dept === selDomain;
    const matchesSearch =
      searchQuery === '' ||
      r.payload?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.submittedBy?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.service?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Strict 403 Forbidden Screen
  if (isAccessDenied) {
    return (
      <div className="min-h-screen beige-mesh-bg flex items-center justify-center p-4">
        <div className="max-w-xl w-full beige-glass-modal p-8 relative text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fde8e8] text-[#9c2b2d] border border-[#f5c2c2] font-mono text-xs font-bold uppercase mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ba3335]"></span>
            Strict RBAC Isolation &bull; HTTP 403
          </div>

          <div className="w-16 h-16 bg-[#fae8e8] text-[#9c2b2d] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#eed0d0]">
            <span className="material-symbols-outlined text-3xl">block</span>
          </div>

          <h1 className="text-xl font-black text-[#28221a] mb-2">
            Access Restricted: Department Head Desk
          </h1>

          <p className="text-[#5f513d] text-sm leading-relaxed mb-6">
            Your current account role (<strong>{currentUser?.role || 'student'}</strong>) does not have clearance to inspect the administrative adjudication ledger. Processor queues are restricted to designated department heads.
          </p>

          <div className="flex gap-3 justify-center text-xs font-bold">
            <Link
              href="/"
              className="bg-[#d4a359] hover:bg-[#c69446] text-[#1c1404] py-2.5 px-4 rounded-xl shadow-[0_4px_16px_rgba(212,163,89,0.35)] flex items-center gap-2 transition-all ios-btn-tactile"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Return to Student Portal</span>
            </Link>

            <button
              onClick={handleLogout}
              className="bg-white/80 hover:bg-white text-[#28221a] py-2.5 px-4 rounded-xl border border-[#dfd5c3] transition-all ios-btn-tactile"
            >
              Sign In as Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen beige-mesh-bg flex items-center justify-center font-mono text-sm">
        <div className="p-6 rounded-3xl beige-glass-card border border-[#dfd5c3] shadow-xl flex items-center gap-3">
          <img src="/icon.png" alt="VNR VJIET" className="w-8 h-8 object-contain rounded-lg animate-pulse" />
          <span className="font-semibold text-[#4a3e2c]">Verifying Administrative Clearance...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen beige-mesh-bg text-[#28221a] selection:bg-[#ecd6ad] relative font-sans">
      {/* SIDEBAR NAVIGATION - Frosted Linen Glass Jurisdiction Panel */}
      <aside className="fixed left-0 top-0 h-full w-72 beige-glass-sidebar z-50 flex flex-col justify-between overflow-y-auto">
        <div className="p-5">
          {/* Header with Official VNRVJIET Logo */}
          <div className="mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2a241b] text-white text-[11px] font-bold uppercase tracking-wider mb-2.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e5be7a]"></span>
              Administrative Clearance
            </div>
            <div className="p-3.5 rounded-2xl bg-white/80 backdrop-blur-xl border border-[#ded2bf] shadow-sm flex items-center gap-3">
              <img src="/icon.png" alt="VNR VJIET Logo" className="w-10 h-10 object-contain rounded-xl bg-white p-1 border border-[#ded2bf] shadow-2xs" />
              <div>
                <span className="text-[10px] font-mono text-[#8a7a64] block uppercase tracking-wide">
                  VNR VJIET &bull; AY 2024-25
                </span>
                <span className="text-base font-black text-[#28221a] tracking-tight block">
                  Processor Queue
                </span>
              </div>
            </div>
          </div>

          {/* Ticketing Navigation */}
          <div className="mb-5">
            <span className="text-[11px] font-mono uppercase text-[#968670] tracking-wider font-bold block mb-2 px-1">
              PROCESSING QUEUES
            </span>
            <nav className="space-y-1.5 mb-3">
              <button
                onClick={() => setTicketView('ACTIVE')}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ios-btn-tactile ${
                  ticketView === 'ACTIVE'
                    ? 'bg-[#e8d8be] text-[#3d2c0b] font-bold border border-[#cbb38f] shadow-sm'
                    : 'text-[#5f5341] hover:bg-[#ede5d6]/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-lg">inbox</span>
                  <span className="text-sm font-semibold">Active Review Queue</span>
                </div>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/90 border border-[#d8cabb] font-bold shadow-xs">
                  {activeRequests.length}
                </span>
              </button>

              <button
                onClick={() => setTicketView('ARCHIVE')}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ios-btn-tactile ${
                  ticketView === 'ARCHIVE'
                    ? 'bg-[#e8d8be] text-[#3d2c0b] font-bold border border-[#cbb38f] shadow-sm'
                    : 'text-[#5f5341] hover:bg-[#ede5d6]/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-lg">archive</span>
                  <span className="text-sm font-semibold">Archived / Resolved</span>
                </div>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/90 border border-[#d8cabb] font-bold shadow-xs">
                  {archivedRequests.length}
                </span>
              </button>
            </nav>
          </div>

          {/* DOMAIN JURISDICTION - Clean camelCase Chips */}
          <div className="mb-4">
            <span className="text-[11px] font-mono uppercase text-[#968670] tracking-wider font-bold block mb-2 px-1">
              DEPARTMENT JURISDICTION
            </span>
            <nav className="space-y-1 text-xs">
              {[
                { id: 'all', label: 'All Jurisdictions', code: 'ALL', icon: 'apps' },
                { id: 'attendanceAcademic', label: 'Attendance & OD', code: 'ACAD', icon: 'school' },
                { id: 'certificatesCredentials', label: 'Certificates & Bonafide', code: 'CERT', icon: 'history_edu' },
                { id: 'idCardsExams', label: 'ID Card & Hall Tickets', code: 'ID', icon: 'badge' },
                { id: 'feesFinance', label: 'Fee & Scholarships', code: 'FEE', icon: 'payments' },
                { id: 'transportBus', label: 'Transport & Bus Routes', code: 'TRAN', icon: 'directions_bus' },
                { id: 'securityGate', label: 'Security & Gate Pass', code: 'SEC', icon: 'shield' },
                { id: 'venueFacilities', label: 'Venue & Auditorium', code: 'EST', icon: 'meeting_room' },
                { id: 'itNetworking', label: 'IT CoE & Server Lab', code: 'IT', icon: 'terminal' },
                { id: 'maintenanceRepairs', label: 'Repairs & Maintenance', code: 'REP', icon: 'build' },
                { id: 'miscServices', label: 'Misc & Lost Property', code: 'MISC', icon: 'inventory' }
              ].map((domain) => (
                <div
                  key={domain.id}
                  onClick={() => setSelectedDomain(domain.id)}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ios-btn-tactile ${
                    selectedDomain.toLowerCase() === domain.id.toLowerCase()
                      ? 'bg-[#d4a359] text-[#1c1404] font-bold shadow-xs'
                      : 'text-[#5f5341] hover:bg-[#ede5d6]/70'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-base">{domain.icon}</span>
                    <span className="truncate text-xs">{domain.label}</span>
                  </div>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-white/70 font-bold ml-1">
                    {domain.code}
                  </span>
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer with Logout & Admin Identity */}
        <div className="p-4 border-t border-[#dfd5c3] space-y-2 bg-[#f4ece0]/60 backdrop-blur-md">
          <div className="p-3 rounded-2xl bg-white/80 border border-[#ded2bf] text-xs">
            <div className="font-bold text-[#28221a] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#b58838]">badge</span>
              <span className="truncate">{currentUser?.name || 'Department Head'}</span>
            </div>
            <div className="text-[11px] font-mono text-[#7b6d58] mt-0.5">
              Role: {currentUser?.role || 'deptHead'}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-[#fae8e8]/80 hover:bg-[#fae8e8] text-[#9c2b2d] font-bold py-2.5 px-3 rounded-xl border border-[#eed0d0] transition-all flex items-center justify-center gap-2 text-xs ios-btn-tactile"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="pl-72">
        {/* HEADER - Frosted Cream Glass Bar with Official Logo */}
        <header className="fixed top-0 left-72 right-0 h-16 beige-glass-header z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-[#2a241b] text-white px-3 py-1.5 rounded-xl shadow-xs">
              <img src="/icon.png" alt="VNR VJIET" className="w-5 h-5 object-contain" />
              <span className="font-bold text-xs tracking-wider">VNR VJIET</span>
            </div>
            <span className="hidden lg:inline-block font-mono text-xs text-[#7e6f5c]">
              Department Clearance Desk &bull; Institutional Scrutiny Ledger
            </span>
          </div>

          <div className="flex-1 max-w-sm hidden md:block mx-4">
            <input
              className="w-full bg-white/80 text-[#28221a] placeholder:text-[#968670] text-xs py-2 px-3 rounded-xl border border-[#dfd5c3] focus:outline-none focus:ring-2 focus:ring-[#d4a359] shadow-xs"
              placeholder="Search docket title, student name, or ID..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#edf6f0] text-[#1c6943] border border-[#bfe0cc] text-xs font-mono font-medium shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#279962] animate-pulse"></span>
              <span>{dbStatus}</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-2xl bg-white/80 hover:bg-white border border-[#dfd5c3] shadow-xs flex items-center justify-center transition-all ios-btn-tactile"
                title="Notifications"
              >
                <span className="material-symbols-outlined text-[#4a3e2c] text-xl">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#ba3335] text-white rounded-full text-[10px] font-bold w-4 h-4 flex items-center justify-center shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 beige-glass-modal p-4 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#dfd5c3]">
                    <span className="font-bold text-[#3d3221] uppercase tracking-wide text-[11px] font-mono">
                      Department Alerts
                    </span>
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[#966719] hover:underline font-bold text-[11px]"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-[#9a8c78] font-mono">No pending alerts</div>
                    ) : (
                      notifications.map((notif, idx) => (
                        <div
                          key={notif._id || idx}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            notif.isRead ? 'bg-white/40 border-[#e6dcce] opacity-75' :
                            (notif.type || '').toLowerCase() === 'approved' ? 'bg-[#edf7f2]/90 border-[#b2e0ca]' :
                            'bg-[#fef9ee]/90 border-[#f3ddb0]'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-[#2a241b] mb-0.5">
                            <span className="truncate pr-1">{notif.title}</span>
                            <span className="text-[10px] font-mono text-[#8a7b68] whitespace-nowrap">
                              {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : notif.time || 'Live'}
                            </span>
                          </div>
                          <p className="text-[#5c503e] text-[11px] leading-snug">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-right hidden sm:block border-l border-[#dfd5c3] pl-3.5">
              <div className="font-bold text-[#28221a] leading-tight text-xs">{currentUser?.name}</div>
              <div className="text-[10px] font-mono text-[#8a7b68] uppercase">{currentUser?.role}</div>
            </div>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="relative pt-20 w-full px-8 pb-14">
          {/* View Switcher Header & Metrics Strip */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 p-4 beige-glass-card">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setTicketView('ACTIVE')}
                className={`px-3.5 py-1.5 rounded-full font-bold text-xs flex items-center gap-2 transition-all ios-btn-tactile ${
                  ticketView === 'ACTIVE'
                    ? 'bg-[#d4a359] text-[#1c1404] shadow-[0_2px_10px_rgba(212,163,89,0.35)]'
                    : 'bg-white/80 text-[#5f513d] hover:bg-white border border-[#dfd5c3]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">inbox</span>
                <span>Active Scrutiny Queue ({activeRequests.length})</span>
              </button>

              <button
                onClick={() => setTicketView('ARCHIVE')}
                className={`px-3.5 py-1.5 rounded-full font-bold text-xs flex items-center gap-2 transition-all ios-btn-tactile ${
                  ticketView === 'ARCHIVE'
                    ? 'bg-[#d4a359] text-[#1c1404] shadow-[0_2px_10px_rgba(212,163,89,0.35)]'
                    : 'bg-white/80 text-[#5f513d] hover:bg-white border border-[#dfd5c3]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">archive</span>
                <span>Archived / Resolved ({archivedRequests.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[#7e6f5c]">
              <span>Jurisdiction: <strong className="text-[#352b1d]">{selectedDomain}</strong></span>
              <span>&bull;</span>
              <span>Mode: <strong className="text-[#352b1d]">{ticketView === 'ACTIVE' ? 'Awaiting Verdict' : 'Closed Ledger'}</strong></span>
            </div>
          </div>

          {/* SPLIT LAYOUT: QUEUE LIST & VERDICT CASE PANEL */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Column: Requests list */}
            <div className="xl:col-span-7 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider px-1 text-[#8a7b68] font-mono">
                <span>
                  {ticketView === 'ACTIVE' ? 'Incoming Petitions Awaiting Review' : 'Archived Petitions'} ({filteredRequests.length})
                </span>
                <span>
                  {ticketView === 'ACTIVE' ? 'Stage 2 Ingestion' : 'Resolved'}
                </span>
              </div>

              <div className="space-y-3">
                {filteredRequests.length === 0 ? (
                  <div className="p-12 text-center beige-glass-card text-xs font-mono text-[#968670]">
                    {ticketView === 'ACTIVE'
                      ? 'All incoming dockets cleared. No pending petitions in this jurisdiction.'
                      : 'No historical records found for this department.'}
                  </div>
                ) : (
                  filteredRequests.map((item) => {
                    const isSelected = selectedDocket?._id === item._id;
                    const proofData = item.payload?.proof || item.payload?.proofs;
                    const statusStr = (item.status || '').toLowerCase();
                    return (
                      <article
                        key={item._id}
                        onClick={() => handleSelectDocket(item)}
                        className={`relative rounded-2xl p-4 cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-[#faeed6]/80 border-[#d4a359] shadow-md ring-2 ring-[#d4a359]/30'
                            : 'bg-white/75 backdrop-blur-xl border-[#dfd5c3] hover:border-[#cfb68d] shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-[#2a241b] text-white text-[11px]">
                                #{item._id.slice(-6).toUpperCase()}
                              </span>
                              <span className="font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#ede4d4] text-[#4a3e2c] border border-[#dfd5c3] text-[11px]">
                                {item.service?.department || item.payload?.department || 'general'}
                              </span>
                              <span className={`font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${
                                statusStr === 'approved' ? 'bg-[#edf7f2] text-[#1c6943] border border-[#b2e0ca]' :
                                statusStr === 'rejected' ? 'bg-[#fdf2f2] text-[#9e2a2b] border border-[#f5c2c2]' :
                                statusStr === 'inreview' ? 'bg-[#edf5f8] text-[#1e617a] border border-[#b8dae6]' :
                                'bg-[#fef8ea] text-[#925f0a] border border-[#f3d99e]'
                              }`}>
                                {item.status}
                              </span>
                              {proofData && (
                                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#edf5f8] text-[#1e617a] border border-[#b8dae6] font-semibold flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">attach_file</span>
                                  <span>Proof</span>
                                </span>
                              )}
                            </div>

                            <div>
                              <h3 className="font-bold text-[#28221a] text-sm">
                                {item.payload?.title || item.service?.name}
                              </h3>
                              <p className="text-xs text-[#7a6b57] mt-0.5">
                                Filed by: <strong className="text-[#352b1d]">{item.submittedBy?.name || 'Student'}</strong> ({item.submittedBy?.role || 'student'})
                              </p>
                            </div>

                            {item.adminRemarks && (
                              <div className="p-2.5 rounded-xl bg-[#fef8ea] border border-[#f3d99e] text-xs text-[#7a5412]">
                                <span className="font-bold">Recorded Remark:</span> {item.adminRemarks}
                              </div>
                            )}
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between self-stretch gap-2 min-w-[100px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectDocket(item);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-[#d4a359] hover:bg-[#c69446] text-[#1c1404] font-bold text-xs shadow-xs transition-all ios-btn-tactile"
                            >
                              Inspect
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Case Details & Determination Panel (Beige Glass) */}
            <div className="xl:col-span-5 sticky top-20">
              <div className="beige-glass-card p-6 text-xs">
                {selectedDocket ? (
                  <div>
                    <div className="flex items-start justify-between border-b border-[#dfd5c3] pb-3 mb-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#8a7b68] block font-mono tracking-wider">
                          CASE FILE VERIFICATION
                        </span>
                        <span className="font-black text-[#28221a] font-mono text-base">
                          #{selectedDocket._id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#edf6f0] text-[#1c6943] border border-[#bfe0cc] font-bold text-[10px] tracking-wide">
                        VNR VERIFIED
                      </span>
                    </div>

                    {/* Case Overview Card */}
                    <div className="p-4 rounded-2xl bg-white/70 border border-[#dfd5c3] mb-4 space-y-2">
                      <div>
                        <span className="text-[10px] font-mono text-[#8a7b68] uppercase block">Petition Title</span>
                        <h4 className="font-bold text-[#28221a] text-sm">
                          {selectedDocket.payload?.title || selectedDocket.service?.name}
                        </h4>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-[#8a7b68] uppercase block">Requester Justification &amp; Purpose</span>
                        <p className="text-[#5f513d] text-xs leading-relaxed mt-0.5">
                          {selectedDocket.payload?.justification || selectedDocket.payload?.notes || 'Standard petition submitted for department head verification.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#dfd5c3]/60 text-[11px] font-mono text-[#7a6b57]">
                        <div>
                          <span>Applicant: </span>
                          <strong className="text-[#28221a]">{selectedDocket.submittedBy?.name || 'Student'}</strong>
                        </div>
                        <div>
                          <span>Department: </span>
                          <strong className="text-[#28221a]">{selectedDocket.service?.department || selectedDocket.payload?.department || 'general'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Attached Documentary Evidence */}
                    {(selectedDocket.payload?.proof || selectedDocket.payload?.proofs) && (
                      <div className="mb-4 p-3.5 rounded-2xl bg-[#edf5f8]/80 border border-[#b8dae6]">
                        <div className="font-bold text-[#1e617a] mb-1.5 flex items-center gap-1.5 text-xs">
                          <span className="material-symbols-outlined text-sm text-[#2983a5]">attach_file</span>
                          <span>Attached Documentary Evidence</span>
                        </div>
                        <div className="bg-white/90 p-2.5 rounded-xl border border-[#b8dae6] flex items-center justify-between text-[#1c4d5f]">
                          <div className="flex items-center gap-2 truncate">
                            <span className="material-symbols-outlined text-[#2983a5] text-base">description</span>
                            <span className="font-mono text-xs font-semibold truncate">
                              {selectedDocket.payload.proof?.fileName || selectedDocket.payload.proofs?.fileName || 'Evidence_Document.pdf'}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#d6ecf2] text-[#1e617a] font-bold ml-2">
                            VERIFIED
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Determination Verdict Form in camelCase */}
                    <form className="space-y-3 pt-1" onSubmit={handleProcessDocket}>
                      <div>
                        <label className="block font-bold text-[#4a3e2c] uppercase tracking-wide text-[11px] mb-1">
                          1. Determination Verdict *
                        </label>
                        <select
                          value={determination}
                          onChange={(e) => setDetermination(e.target.value as any)}
                          className="w-full bg-white/90 p-2.5 rounded-xl border border-[#dfd5c3] font-semibold text-[#28221a] focus:outline-none focus:ring-2 focus:ring-[#d4a359] text-xs"
                        >
                          <option value="inReview">inReview (Claim Task Ownership &bull; Lock Docket)</option>
                          <option value="approved">approved (Affix Institutional Clearance &bull; Archive)</option>
                          <option value="rejected">rejected (Document Deficiencies &bull; Archive)</option>
                          <option value="completed">completed (Final Service Fulfilled &bull; Archive)</option>
                        </select>
                        <span className="text-[10px] font-mono text-[#8a7b68] block mt-1">
                          * Approved, Rejected, and Completed items are automatically moved to Archive.
                        </span>
                      </div>

                      <div>
                        <label className="block font-bold text-[#4a3e2c] uppercase tracking-wide text-[11px] mb-1">
                          2. Official Remarks &amp; Clearance Notes
                        </label>
                        <textarea
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="State approval terms, venue requirements, or reasons for document deficiency..."
                          className="w-full bg-white/90 p-2.5 rounded-xl border border-[#dfd5c3] text-[#28221a] focus:outline-none focus:ring-2 focus:ring-[#d4a359] text-xs leading-relaxed"
                          rows={3}
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          disabled={isSubmitting}
                          className="w-full bg-[#d4a359] hover:bg-[#c69446] text-[#1c1404] font-bold py-3 px-4 rounded-xl shadow-[0_4px_16px_rgba(212,163,89,0.35)] transition-all flex items-center justify-center gap-2 text-xs ios-btn-tactile"
                          type="submit"
                        >
                          <span className="material-symbols-outlined text-base">draw</span>
                          <span>{isSubmitting ? 'Recording Verdict...' : 'Affix Determination & Notify Student'}</span>
                        </button>
                      </div>
                    </form>

                    <div className="mt-4 pt-3 border-t border-[#dfd5c3] flex items-center justify-between text-[11px] font-mono text-[#8a7b68]">
                      <span>Processor: {currentUser?.name}</span>
                      <span className="font-semibold text-[#4a3e2c]">Rule 3: Admin Accountability</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center text-[#968670] font-mono text-xs">
                    Select a docket from the queue to inspect and adjudicate.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Success Toast */}
          {showToast && (
            <div className="fixed bottom-6 right-6 z-50 bg-[#2a241b] text-white py-3 px-5 rounded-2xl shadow-xl text-xs font-semibold max-w-sm flex items-center gap-2.5 animate-bounce">
              <span className="material-symbols-outlined text-[#e5be7a] text-base">check_circle</span>
              <span>{toastMessage}</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
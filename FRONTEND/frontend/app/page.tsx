'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RequestItem {
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

export default function CampusGovernancePortal() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [dbStatus, setDbStatus] = useState<'OFFLINE' | 'SYNCING' | 'LIVE SYNC OK'>('SYNCING');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  
  // Ticketing Modes: Active In-Flight vs Resolved Archive
  const [ticketView, setTicketView] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
  const [activeSubFilter, setActiveSubFilter] = useState<string>('all');
  const [archiveSubFilter, setArchiveSubFilter] = useState<string>('all');

  const [selectedDocket, setSelectedDocket] = useState<RequestItem | null>(null);
  const [showLifecycleGuide, setShowLifecycleGuide] = useState<boolean>(false);
  
  // Custom Petition Creation State in camelCase
  const [showDraftModal, setShowDraftModal] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<'studentServices' | 'campusPermissions' | 'miscServices'>('studentServices');
  const [draftDepartment, setDraftDepartment] = useState<string>('attendanceAcademic');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [proofType, setProofType] = useState('Official Event Acceptance / Medical Slip');
  const [proofFileName, setProofFileName] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  // Live Notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/v1/notifications');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
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

  const verifyAuthAndFetch = async () => {
    try {
      const meRes = await fetch('/api/v1/auth/me');
      const meData = await meRes.json();

      if (!meData.success || !meData.data) {
        router.push('/login');
        return;
      }

      const user = meData.data;
      setCurrentUser(user);

      const userRole = (user.role || '').toLowerCase();
      if (!['student', 'clubcoordinator'].includes(userRole)) {
        router.push('/admin');
        return;
      }

      setDbStatus('LIVE SYNC OK');
      setIsCheckingAuth(false);

      const reqRes = await fetch('/api/v1/requests/myRequests');
      const reqData = await reqRes.json();
      if (reqData.success && Array.isArray(reqData.data)) {
        setRequests(reqData.data);
      }

      fetchNotifications();
    } catch (err) {
      console.error('Error fetching student data:', err);
      router.push('/login');
    }
  };

  useEffect(() => {
    verifyAuthAndFetch();
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

  const handleCancelRequest = async (requestId: string, status: string) => {
    if ((status || '').toLowerCase() !== 'pending') {
      triggerToast('Rule 2 Lock: Cannot cancel a request that is already under review or decided.');
      return;
    }

    if (!confirm('Are you sure you want to cancel this pending petition?')) return;

    try {
      const res = await fetch(`/api/v1/requests/${requestId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('Request cancelled and moved to Archive.');
        verifyAuthAndFetch();
        if (selectedDocket?._id === requestId) {
          setSelectedDocket(prev => prev ? { ...prev, status: 'cancelled' } : null);
        }
      } else {
        triggerToast(data.message || 'Failed to cancel request');
      }
    } catch (err) {
      triggerToast('Network error cancelling request');
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim()) {
      alert('Please enter a petition title');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanProof = (proofFileName.trim() || proofUrl.trim()) ? {
        proofType,
        fileName: proofFileName.trim() || 'Supporting_Document.pdf',
        fileType: proofFileName.endsWith('.png') || proofFileName.endsWith('.jpg') ? 'image' : 'pdf',
        documentUrl: proofUrl.trim() || 'https://vnr.edu/storage/evidence/doc_' + Date.now() + '.pdf'
      } : undefined;

      const res = await fetch('/api/v1/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: draftDepartment,
          title: draftTitle.trim(),
          justification: draftNotes.trim(),
          proof: cleanProof,
          payload: {
            title: draftTitle.trim(),
            department: draftDepartment,
            justification: draftNotes.trim(),
            proof: cleanProof
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        triggerToast('Petition filed and dispatched to Department Head.');
        setShowDraftModal(false);
        setDraftTitle('');
        setDraftNotes('');
        setProofFileName('');
        setProofUrl('');
        setTicketView('ACTIVE');
        verifyAuthAndFetch();
      } else {
        triggerToast(data.message || 'Submission failed');
      }
    } catch (err) {
      triggerToast('Failed to connect to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Warm Beige Glassmorphic Status Badges in camelCase
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-[#fef7e7]/90 text-[#925f0a] border border-[#f3d38c]/60 shadow-[0_2px_8px_rgba(230,175,70,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d49724] animate-pulse"></span>
            <span>pending</span>
          </span>
        );
      case 'inreview':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-[#edf5f8]/90 text-[#1e617a] border border-[#b8dae6]/60 shadow-[0_2px_8px_rgba(50,130,170,0.12)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2983a5] animate-ping"></span>
            <span>inReview</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-[#edf7f2]/90 text-[#1c6943] border border-[#b2e0ca]/60 shadow-[0_2px_8px_rgba(40,150,90,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#279962]"></span>
            <span>approved</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-[#fdf2f2]/90 text-[#9e2a2b] border border-[#f5c2c2]/60 shadow-[0_2px_8px_rgba(180,50,50,0.12)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ba3335]"></span>
            <span>rejected</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-[#f5f0f9]/90 text-[#643485] border border-[#d9c4e8]/60 shadow-[0_2px_8px_rgba(120,60,160,0.12)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8247ab]"></span>
            <span>completed</span>
          </span>
        );
      case 'cancelled':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-[#ece7df]/80 text-[#7a7266] border border-[#d2c7b7]/60 line-through">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9a9184]"></span>
            <span>cancelled</span>
          </span>
        );
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

  const displayedRequests = ticketView === 'ACTIVE'
    ? activeRequests.filter(r => activeSubFilter === 'all' || (r.status || '').toLowerCase() === activeSubFilter)
    : archivedRequests.filter(r => archiveSubFilter === 'all' || (r.status || '').toLowerCase() === archiveSubFilter);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen beige-mesh-bg flex items-center justify-center font-mono text-sm">
        <div className="p-6 rounded-3xl beige-glass-card border border-[#dfd5c3] shadow-xl flex items-center gap-3">
          <img src="/icon.png" alt="VNR VJIET" className="w-8 h-8 object-contain rounded-lg animate-pulse" />
          <span className="font-semibold text-[#4a3e2c]">Connecting to VNR Governance Node...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen beige-mesh-bg text-[#28221a] selection:bg-[#ecd6ad] relative font-sans">
      {/* SIDEBAR NAVIGATION - Frosted Linen Glass */}
      <aside className="fixed left-0 top-0 h-full w-72 beige-glass-sidebar z-50 flex flex-col justify-between overflow-y-auto">
        <div className="p-5">
          {/* Brand header with Official VNRVJIET Logo */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ede2ce]/90 text-[#694e19] border border-[#d8c5a5]/80 text-[11px] font-bold uppercase tracking-wider mb-2.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#b58838]"></span>
              Student Service Node
            </div>
            <div className="p-3.5 rounded-2xl bg-white/80 backdrop-blur-xl border border-[#ded2bf] shadow-sm flex items-center gap-3">
              <img src="/icon.png" alt="VNR VJIET Logo" className="w-10 h-10 object-contain rounded-xl bg-white p-1 border border-[#ded2bf] shadow-2xs" />
              <div>
                <span className="text-[10px] font-mono text-[#8a7a64] block uppercase tracking-wide">
                  VNR VJIET &bull; AY 2024-25
                </span>
                <span className="text-base font-black text-[#28221a] tracking-tight block">
                  Governance Portal
                </span>
              </div>
            </div>
          </div>

          {/* Ticketing Navigation */}
          <div className="mb-5">
            <span className="text-[11px] font-mono uppercase text-[#968670] tracking-wider font-bold block mb-2 px-1">
              PORTAL TICKETING QUEUE
            </span>
            <nav className="space-y-1.5">
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
                  <span className="text-sm font-semibold">Active In-Flight</span>
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
                  <span className="text-sm font-semibold">Archival &amp; History</span>
                </div>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/90 border border-[#d8cabb] font-bold shadow-xs">
                  {archivedRequests.length}
                </span>
              </button>
            </nav>
          </div>

          {/* New Request Action */}
          <div className="mb-5">
            <button
              onClick={() => {
                setSelectedCategory('studentServices');
                setDraftDepartment('attendanceAcademic');
                setDraftTitle('');
                setDraftNotes('');
                setShowDraftModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#d4a359] hover:bg-[#c69446] text-[#1c1404] font-bold text-sm shadow-[0_4px_16px_rgba(212,163,89,0.35)] transition-all ios-btn-tactile"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              <span>Draft New Petition</span>
            </button>
          </div>

          {/* Blueprint Toggle */}
          <div className="pt-3 border-t border-[#dfd5c3]">
            <button
              onClick={() => setShowLifecycleGuide(!showLifecycleGuide)}
              className="w-full text-left p-3 rounded-2xl bg-white/60 hover:bg-white/90 border border-[#dfd5c3] transition-all flex items-center justify-between text-xs ios-btn-tactile"
            >
              <span className="font-semibold text-[#5a4c37] flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#b58838]">account_tree</span>
                <span>Governance Blueprint</span>
              </span>
              <span className="text-[#968670] text-[10px] font-mono">{showLifecycleGuide ? 'CLOSE' : 'OPEN'}</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer with Logout & Student Profile */}
        <div className="p-4 border-t border-[#dfd5c3] space-y-2 bg-[#f4ece0]/60 backdrop-blur-md">
          <div className="p-3 rounded-2xl bg-white/80 border border-[#ded2bf] text-xs">
            <div className="font-bold text-[#28221a] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#b58838]">school</span>
              <span className="truncate">{currentUser?.name || 'Student Requester'}</span>
            </div>
            <div className="text-[11px] font-mono text-[#7b6d58] mt-0.5">
              Roll: 22071A05M2 &bull; {currentUser?.role}
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
        {/* TOP HEADER - Frosted Cream Glass Bar with Official Logo */}
        <header className="fixed top-0 left-72 right-0 h-16 beige-glass-header z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-[#2a241b] text-white px-3 py-1.5 rounded-xl shadow-xs">
              <img src="/icon.png" alt="VNR VJIET" className="w-5 h-5 object-contain" />
              <span className="font-bold text-xs tracking-wider">VNR VJIET</span>
            </div>
            <span className="hidden lg:inline-block font-mono text-xs text-[#7e6f5c]">
              Centralized Campus Governance &bull; Academic Lifecycle Desk
            </span>
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

              {/* Notification Drawer - Frosted Linen */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 beige-glass-modal p-4 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#dfd5c3]">
                    <span className="font-bold text-[#3d3221] uppercase tracking-wide text-[11px] font-mono">
                      Institutional Feed
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
                      <div className="p-4 text-center text-[#9a8c78] font-mono">No active alerts</div>
                    ) : (
                      notifications.map((notif, idx) => (
                        <div
                          key={notif._id || idx}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            notif.isRead ? 'bg-white/40 border-[#e6dcce] opacity-75' :
                            (notif.type || '').toLowerCase() === 'approved' ? 'bg-[#edf7f2]/90 border-[#b2e0ca]' :
                            (notif.type || '').toLowerCase() === 'rejected' ? 'bg-[#fdf2f2]/90 border-[#f5c2c2]' :
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
          {/* LIFECYCLE GUIDE ACCORDION */}
          {showLifecycleGuide && (
            <div className="mb-6 p-5 beige-glass-card text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#dfd5c3] pb-2">
                <span className="font-bold text-[#352b1d] text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#b58838] text-base">account_tree</span>
                  Campus Governance Lifecycle Map
                </span>
                <span className="font-mono text-[#8a7b68] text-[11px]">Strict State Machine Flow</span>
              </div>
              <p className="text-[#5f513d] leading-relaxed">
                Petitions move through deterministic stages: <strong>stage 1: pending</strong> (editable/cancellable) &rarr; 
                <strong>stage 2: inReview</strong> (locked by Rule 2 State Immutability) &rarr; 
                <strong>stage 3: verdict</strong> (approved, rejected, or completed).
              </p>
            </div>
          )}

          {/* SERVICE CATALOGUE - Frosted Beige Glass Tile Grid */}
          <section className="mb-8 p-6 beige-glass-card">
            <div className="flex items-center justify-between border-b border-[#dfd5c3] pb-3 mb-5">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#966719] tracking-wider block">
                  INSTITUTIONAL SERVICE DIRECTORY
                </span>
                <h2 className="text-lg font-black text-[#28221a] tracking-tight">
                  Service Request Catalogue
                </h2>
              </div>
              <span className="text-xs font-mono text-[#8a7b68]">Select category to draft petition</span>
            </div>

            {/* Scope 1: Student Services */}
            <div className="mb-5">
              <div className="flex items-center gap-1.5 mb-2.5 font-bold text-xs uppercase tracking-wider text-[#4a3e2c]">
                <span className="material-symbols-outlined text-base text-[#b58838]">school</span>
                <span>1. Academic &amp; Credential Services</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {[
                  { title: 'Attendance & OD', subtitle: 'Academic & medical exemption', dep: 'attendanceAcademic', defNotes: '5 academic days attendance exemption for academic competition.' },
                  { title: 'Certificates & LOR', subtitle: 'Bonafide, custodian & LOR', dep: 'certificatesCredentials', defNotes: 'Official study certificate requested for application verification.' },
                  { title: 'ID Cards & Exams', subtitle: 'Smartcard & hall ticket reissue', dep: 'idCardsExams', defNotes: 'Replacement request for misplaced institutional smartcard ID.' },
                  { title: 'Fee & Scholarships', subtitle: 'Fee concession review', dep: 'feesFinance', defNotes: 'Fee receipt verification and e-Pass clearance review.' },
                ].map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedCategory('studentServices');
                      setDraftDepartment(s.dep);
                      setDraftTitle(s.title);
                      setDraftNotes(s.defNotes);
                      setShowDraftModal(true);
                    }}
                    className="p-3.5 rounded-2xl bg-white/70 hover:bg-[#faeed6] border border-[#dfd5c3] hover:border-[#cfb68d] text-left transition-all shadow-xs ios-btn-tactile"
                  >
                    <div className="font-bold text-[#2a241b] text-xs">{s.title}</div>
                    <div className="text-[#7a6b57] text-[11px] mt-0.5">{s.subtitle}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scope 2: Campus Permissions */}
            <div className="mb-5 pt-4 border-t border-[#dfd5c3]">
              <div className="flex items-center gap-1.5 mb-2.5 font-bold text-xs uppercase tracking-wider text-[#4a3e2c]">
                <span className="material-symbols-outlined text-base text-[#2983a5]">verified</span>
                <span>2. Permissions &amp; Logistics</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {[
                  { title: 'Transport & Bus', subtitle: 'Bus pass renewal & route change', dep: 'transportBus', defNotes: 'Semester bus pass route change requested.' },
                  { title: 'Security & Gate Pass', subtitle: 'Late exit & equipment outward pass', dep: 'securityGate', defNotes: 'Gate clearance for late night project work and transit.' },
                  { title: 'Venue Allocation', subtitle: 'Auditorium & SAC seminar halls', dep: 'venueFacilities', defNotes: 'Venue reservation for technical workshop and rehearsal.' },
                  { title: 'IT & Lab Access', subtitle: 'AI CoE & GPU server cluster', dep: 'itNetworking', defNotes: 'Compute cluster access requested for research experiments.' },
                ].map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedCategory('campusPermissions');
                      setDraftDepartment(s.dep);
                      setDraftTitle(s.title);
                      setDraftNotes(s.defNotes);
                      setShowDraftModal(true);
                    }}
                    className="p-3.5 rounded-2xl bg-white/70 hover:bg-[#e7f2f5] border border-[#dfd5c3] hover:border-[#b5d3dc] text-left transition-all shadow-xs ios-btn-tactile"
                  >
                    <div className="font-bold text-[#2a241b] text-xs">{s.title}</div>
                    <div className="text-[#7a6b57] text-[11px] mt-0.5">{s.subtitle}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scope 3: Misc & Operations */}
            <div className="pt-4 border-t border-[#dfd5c3]">
              <div className="flex items-center gap-1.5 mb-2.5 font-bold text-xs uppercase tracking-wider text-[#4a3e2c]">
                <span className="material-symbols-outlined text-base text-[#279962]">build</span>
                <span>3. Maintenance &amp; Operations</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {[
                  { title: 'Repairs & Maintenance', subtitle: 'Projector, electrical & plumbing', dep: 'maintenanceRepairs', defNotes: 'Classroom equipment maintenance ticket.' },
                  { title: 'Lost & Found / Lockers', subtitle: 'Property claim & semester locker', dep: 'miscServices', defNotes: 'Recovery of belongings from proctor office.' },
                ].map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedCategory('miscServices');
                      setDraftDepartment(s.dep);
                      setDraftTitle(s.title);
                      setDraftNotes(s.defNotes);
                      setShowDraftModal(true);
                    }}
                    className="p-3.5 rounded-2xl bg-white/70 hover:bg-[#e8f5ee] border border-[#dfd5c3] hover:border-[#a8d9bf] text-left transition-all shadow-xs ios-btn-tactile"
                  >
                    <div className="font-bold text-[#2a241b] text-xs">{s.title}</div>
                    <div className="text-[#7a6b57] text-[11px] mt-0.5">{s.subtitle}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* MAIN TICKETING CONTAINER */}
          <div className="beige-glass-card overflow-hidden mb-8">
            {/* View Switcher Header: Active vs Archive */}
            <div className="bg-[#ede4d4]/60 border-b border-[#dfd5c3] px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
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
                  <span>Active In-Flight ({activeRequests.length})</span>
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
                  <span>Archive &amp; Resolved ({archivedRequests.length})</span>
                </button>
              </div>

              {/* Sub-Filters in camelCase */}
              <div className="flex items-center gap-1.5 text-xs">
                {ticketView === 'ACTIVE' ? (
                  <>
                    <span className="font-mono text-[#8a7b68] mr-1 text-[11px]">Filter:</span>
                    {['all', 'pending', 'inReview'].map(sub => (
                      <button
                        key={sub}
                        onClick={() => setActiveSubFilter(sub.toLowerCase())}
                        className={`px-3 py-1 rounded-full font-mono text-[11px] transition-all ${
                          activeSubFilter === sub.toLowerCase() ? 'bg-[#2a241b] text-white font-bold' : 'bg-white/70 text-[#675742] border border-[#ded2bf] hover:bg-white'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <span className="font-mono text-[#8a7b68] mr-1 text-[11px]">Filter Archive:</span>
                    {['all', 'approved', 'rejected', 'completed', 'cancelled'].map(sub => (
                      <button
                        key={sub}
                        onClick={() => setArchiveSubFilter(sub.toLowerCase())}
                        className={`px-3 py-1 rounded-full font-mono text-[11px] transition-all ${
                          archiveSubFilter === sub.toLowerCase() ? 'bg-[#2a241b] text-white font-bold' : 'bg-white/70 text-[#675742] border border-[#ded2bf] hover:bg-white'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Requests Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#dfd5c3] bg-[#f7f2e9]/50 text-[#7a6b57] font-mono uppercase text-[11px]">
                    <th className="py-3 px-5">Docket ID</th>
                    <th className="py-3 px-5">Petition &amp; Jurisdiction</th>
                    <th className="py-3 px-5">Proof Evidence</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Rule 2 Lock</th>
                    <th className="py-3 px-5 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebd8c0]/50">
                  {displayedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#968670] font-mono text-xs">
                        {ticketView === 'ACTIVE'
                          ? 'No active petitions currently in queue. Select any service above to submit.'
                          : 'No archived petitions found matching filter.'}
                      </td>
                    </tr>
                  ) : (
                    displayedRequests.map((item) => {
                      const isPending = (item.status || '').toLowerCase() === 'pending';
                      const proofData = item.payload?.proof || item.payload?.proofs;
                      return (
                        <tr key={item._id} className="hover:bg-[#f6ebd8]/40 transition-colors">
                          <td className="py-3.5 px-5 font-mono font-bold whitespace-nowrap">
                            <span className="bg-[#ede3d1] text-[#3d3221] px-2.5 py-1 rounded-lg border border-[#d8c8b4] text-xs shadow-2xs">
                              #{item._id.slice(-6).toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="font-bold text-[#28221a] text-sm">
                              {item.payload?.title || item.service?.name || 'General Petition'}
                            </div>
                            <div className="text-[11px] font-mono text-[#7e6f5c] mt-0.5">
                              Jurisdiction: <span className="font-semibold text-[#4a3e2c]">{item.service?.department || item.payload?.department || 'general'}</span>
                            </div>
                            {item.adminRemarks && (
                              <div className="mt-1.5 text-[11px] bg-[#fef8ea] text-[#7a5412] border border-[#f3d99e] rounded-xl p-2.5 font-sans">
                                <strong>Official Verdict Remark:</strong> {item.adminRemarks}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            {proofData ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#edf5f8] text-[#1e617a] border border-[#b8dae6] font-mono text-[10px] shadow-2xs">
                                <span className="material-symbols-outlined text-xs">attach_file</span>
                                <span>{proofData.fileType || 'pdf'}</span>
                              </span>
                            ) : (
                              <span className="text-[#b5a794] font-mono">&mdash;</span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap font-mono text-[11px]">
                            {isPending ? (
                              <span className="text-[#1c6943] font-bold inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#279962]"></span>
                                Unlocked
                              </span>
                            ) : (
                              <span className="text-[#7a6b57] font-medium inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#9a9184]"></span>
                                Locked (Rule 2)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right pr-6 whitespace-nowrap space-x-2">
                            <button
                              onClick={() => setSelectedDocket(item)}
                              className="px-3.5 py-1.5 rounded-xl border border-[#ded2bf] bg-white/80 hover:bg-white font-bold text-xs shadow-xs transition-all ios-btn-tactile"
                            >
                              Inspect
                            </button>

                            {isPending && (
                              <button
                                onClick={() => handleCancelRequest(item._id, item.status)}
                                className="px-3.5 py-1.5 rounded-xl bg-[#fae8e8]/80 text-[#9c2b2d] hover:bg-[#fae8e8] border border-[#eed0d0] font-bold text-xs transition-all ios-btn-tactile"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-[#ede4d4]/60 border-t border-[#dfd5c3] px-6 py-3 text-xs font-mono text-[#7e6f5c] flex items-center justify-between">
              <span>Student Single Source of Truth &bull; Strict Ownership Isolation</span>
              <span>Showing {displayedRequests.length} Record(s)</span>
            </div>
          </div>
        </main>
      </div>

      {/* INSPECTION SLIP MODAL - Beige Glassmorphic Modal */}
      {selectedDocket && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="beige-glass-modal p-7 max-w-xl w-full relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#dfd5c3] pb-3.5 mb-4">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-[#8a7b68] block tracking-wider">
                  DOCKET IDENTIFIER #{selectedDocket._id.slice(-6).toUpperCase()}
                </span>
                <h3 className="text-lg font-black text-[#28221a] tracking-tight mt-0.5">
                  {selectedDocket.payload?.title || selectedDocket.service?.name || 'Campus Petition'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDocket(null)}
                className="w-8 h-8 rounded-full bg-[#ede4d4] hover:bg-[#e2d5c0] text-[#3d3221] flex items-center justify-center font-bold text-sm transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Status & Jurisdiction Strip */}
              <div className="grid grid-cols-2 gap-3 bg-[#ede4d4]/50 p-3.5 rounded-2xl border border-[#dfd5c3]">
                <div>
                  <span className="font-semibold block text-[#7a6b57] text-[11px] mb-1">Current Lifecycle Status</span>
                  {getStatusBadge(selectedDocket.status)}
                </div>
                <div>
                  <span className="font-semibold block text-[#7a6b57] text-[11px] mb-1">Handling Jurisdiction</span>
                  <span className="font-mono font-bold text-[#352b1d] text-xs">
                    {selectedDocket.service?.department || selectedDocket.payload?.department || 'general'}
                  </span>
                </div>
              </div>

              {/* Formatted Case Justification Card */}
              <div className="p-4 rounded-2xl bg-white/70 border border-[#dfd5c3]">
                <span className="font-bold text-[#3d3221] block mb-1 text-xs">
                  Applicant's Statement &amp; Purpose:
                </span>
                <p className="text-[#5f513d] text-xs leading-relaxed">
                  {selectedDocket.payload?.justification || selectedDocket.payload?.notes || 'Standard student request submitted for institutional review and processing.'}
                </p>
              </div>

              {/* Documentary Proof Card */}
              {(selectedDocket.payload?.proof || selectedDocket.payload?.proofs) && (
                <div className="p-4 rounded-2xl bg-[#edf5f8]/80 border border-[#b8dae6]">
                  <div className="font-bold text-[#1e617a] mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#2983a5]">attach_file</span>
                    <span>Attached Documentary Evidence</span>
                  </div>
                  <div className="bg-white/90 p-3 rounded-xl border border-[#b8dae6] flex items-center justify-between text-[#1c4d5f]">
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-[#2983a5] text-lg">description</span>
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

              {/* Admin Remarks Card */}
              {selectedDocket.adminRemarks && (
                <div className="p-4 rounded-2xl bg-[#fef8ea] border border-[#f3d99e]">
                  <span className="font-bold text-[#7a5412] block mb-1">Official Administration Remarks:</span>
                  <p className="text-[#593d0c] leading-relaxed">{selectedDocket.adminRemarks}</p>
                </div>
              )}

              {/* Submission Metadata Footprint */}
              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-[#8a7b68] pt-1">
                <div>
                  <span>Submitted At: </span>
                  <span className="text-[#352b1d] font-semibold">
                    {new Date(selectedDocket.createdAt).toLocaleDateString()} {new Date(selectedDocket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span>Service Group: </span>
                  <span className="text-[#352b1d] font-semibold">{selectedDocket.service?.category || 'studentServices'}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-[#dfd5c3] flex items-center justify-between text-xs">
              <span className="font-mono text-[#7a6b57]">
                Requester: {currentUser?.name}
              </span>
              {(selectedDocket.status || '').toLowerCase() === 'pending' && (
                <button
                  onClick={() => handleCancelRequest(selectedDocket._id, selectedDocket.status)}
                  className="bg-[#fae8e8] text-[#9c2b2d] hover:bg-[#f6d7d7] font-bold px-4 py-1.5 rounded-xl border border-[#eed0d0] transition-all ios-btn-tactile"
                >
                  Cancel Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DRAFT PETITION MODAL - Frosted Beige Glass */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="beige-glass-modal p-7 max-w-lg w-full relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#dfd5c3] pb-3.5 mb-4">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-[#966719] block tracking-wider">
                  CAMPUS SERVICE DISPATCH
                </span>
                <h3 className="text-lg font-black text-[#28221a] tracking-tight mt-0.5">
                  File Service Request
                </h3>
              </div>
              <button
                onClick={() => setShowDraftModal(false)}
                className="w-8 h-8 rounded-full bg-[#ede4d4] hover:bg-[#e2d5c0] text-[#3d3221] flex items-center justify-center font-bold text-sm transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              {/* Category selector */}
              <div>
                <label className="block font-bold text-[#4a3e2c] uppercase tracking-wide text-[11px] mb-1.5">
                  Service Classification Scope
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'studentServices', label: '1. Student Services' },
                    { id: 'campusPermissions', label: '2. Permissions' },
                    { id: 'miscServices', label: '3. Operations' }
                  ].map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id as any);
                        if (cat.id === 'studentServices') setDraftDepartment('attendanceAcademic');
                        else if (cat.id === 'campusPermissions') setDraftDepartment('securityGate');
                        else setDraftDepartment('maintenanceRepairs');
                      }}
                      className={`p-2.5 rounded-xl text-center font-bold text-[11px] transition-all ios-btn-tactile ${
                        selectedCategory === cat.id ? 'bg-[#d4a359] text-[#1c1404] shadow-xs' : 'bg-white/70 text-[#5f513d] hover:bg-white border border-[#dfd5c3]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department Target */}
              <div>
                <label className="block font-bold text-[#4a3e2c] uppercase tracking-wide text-[11px] mb-1">
                  Target Department Head *
                </label>
                <select
                  value={draftDepartment}
                  onChange={(e) => setDraftDepartment(e.target.value)}
                  className="w-full bg-white/90 p-2.5 rounded-xl border border-[#dfd5c3] font-semibold text-[#28221a] focus:outline-none focus:ring-2 focus:ring-[#d4a359]"
                >
                  {selectedCategory === 'studentServices' && (
                    <>
                      <option value="attendanceAcademic">attendanceAcademic &rarr; Attendance &amp; OD Exemptions</option>
                      <option value="certificatesCredentials">certificatesCredentials &rarr; Bonafide, Custodian &amp; LOR</option>
                      <option value="idCardsExams">idCardsExams &rarr; Duplicate ID &amp; Exam Hall Tickets</option>
                      <option value="feesFinance">feesFinance &rarr; Fee Concession &amp; Scholarships</option>
                    </>
                  )}
                  {selectedCategory === 'campusPermissions' && (
                    <>
                      <option value="transportBus">transportBus &rarr; College Bus Pass &amp; Route Change</option>
                      <option value="securityGate">securityGate &rarr; Security Outward &amp; Gate Pass</option>
                      <option value="venueFacilities">venueFacilities &rarr; Auditorium &amp; Venue Allocation</option>
                      <option value="itNetworking">itNetworking &rarr; AI CoE &amp; IT Lab Access</option>
                    </>
                  )}
                  {selectedCategory === 'miscServices' && (
                    <>
                      <option value="maintenanceRepairs">maintenanceRepairs &rarr; Infrastructure &amp; Repairs</option>
                      <option value="miscServices">miscServices &rarr; Lost &amp; Found Property / Lockers</option>
                    </>
                  )}
                </select>
              </div>

              {/* Petition Title */}
              <div>
                <label className="block font-bold text-[#4a3e2c] uppercase tracking-wide text-[11px] mb-1">
                  Petition Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. On-Duty Attendance Exemption for Hackathon Finale"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="w-full bg-white/90 p-2.5 rounded-xl border border-[#dfd5c3] font-medium text-[#28221a] focus:outline-none focus:ring-2 focus:ring-[#d4a359]"
                />
              </div>

              {/* Justification / Notes */}
              <div>
                <label className="block font-bold text-[#4a3e2c] uppercase tracking-wide text-[11px] mb-1">
                  Justification &amp; Purpose *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail the circumstances, exact dates, and requirement for administrative clearance..."
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  className="w-full bg-white/90 p-2.5 rounded-xl border border-[#dfd5c3] text-[#28221a] focus:outline-none focus:ring-2 focus:ring-[#d4a359] text-xs leading-relaxed"
                />
              </div>

              {/* Documentary Proof Section */}
              <div className="p-3.5 rounded-2xl bg-[#ede4d4]/60 border border-[#dfd5c3] space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[#3d3221] text-[11px] uppercase">
                  <span className="material-symbols-outlined text-sm text-[#2983a5]">attach_file</span>
                  <span>Documentary Evidence (Optional)</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#7a6b57] mb-0.5">Proof Category</label>
                    <select
                      value={proofType}
                      onChange={(e) => setProofType(e.target.value)}
                      className="w-full bg-white/90 p-1.5 rounded-lg border border-[#dfd5c3] text-xs"
                    >
                      <option value="Event Acceptance Letter">Event Acceptance Letter</option>
                      <option value="Medical Discharge Slip">Medical Discharge Slip</option>
                      <option value="Fee Payment Receipt">Fee Payment Receipt</option>
                      <option value="Faculty Recommendation Slip">Faculty Recommendation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#7a6b57] mb-0.5">Filename Reference</label>
                    <input
                      type="text"
                      placeholder="e.g. SIH_Selection_Letter.pdf"
                      value={proofFileName}
                      onChange={(e) => setProofFileName(e.target.value)}
                      className="w-full bg-white/90 p-1.5 rounded-lg border border-[#dfd5c3] text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#d4a359] hover:bg-[#c69446] text-[#1c1404] font-bold py-3 px-4 rounded-xl shadow-[0_4px_16px_rgba(212,163,89,0.35)] transition-all flex items-center justify-center gap-2 text-sm ios-btn-tactile"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>{isSubmitting ? 'Transmitting to HOD...' : 'Submit Petition to Department Head'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2a241b] text-white py-3 px-5 rounded-2xl shadow-xl text-xs font-semibold max-w-sm flex items-center gap-2.5 animate-bounce">
          <span className="material-symbols-outlined text-[#e5be7a] text-base">info</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
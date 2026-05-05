import React, { useState, useEffect } from 'react';
import CandidateOverview  from './CandidateOverview';
import CandidateProfile   from './CandidateProfile';
import FindJobs           from './FindJobs';
import EligibilityCheck   from './EligibilityCheck';
import MyApplications     from './MyApplications';
import ServiceMarketplace from './ServiceMarketplace';

const navItems = [
  { id: 'overview',     label: 'Dashboard'          },
  { id: 'profile',      label: 'My Profile'         },
  { id: 'findJobs',     label: 'Find Jobs'          },
  { id: 'eligibility',  label: 'Eligibility Check'  },
  { id: 'applications', label: 'My Applications'    },
  { id: 'marketplace',  label: 'Service Marketplace'},
];

const CandidateDashboard = ({ user, onLogout }) => {
  const [activeTab,      setActiveTab]      = useState('overview');
  const [notifications,  setNotifications]  = useState([]);
  const [showNotif,      setShowNotif]      = useState(false);
  const [unread,         setUnread]         = useState(0);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const all    = data.notifications || [];
        const unseen = all.filter(n => !n.IsRead);
        setNotifications(unseen);
        setUnread(unseen.length);
      }
    } catch (_) {}
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:5000/api/notifications/read-all', {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` }
      });
      setUnread(0);
      setNotifications([]);
    } catch (_) {}
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':     return <CandidateOverview  user={user} onNavigate={setActiveTab} />;
      case 'profile':      return <CandidateProfile   user={user} />;
      case 'findJobs':     return <FindJobs           user={user} />;
      case 'eligibility':  return <EligibilityCheck   user={user} />;
      case 'applications': return <MyApplications     user={user} />;
      case 'marketplace':  return <ServiceMarketplace user={user} />;
      default:             return <CandidateOverview  user={user} onNavigate={setActiveTab} />;
    }
  };

  const pageTitle = navItems.find(n => n.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="cd-root">

      {/* ════════════════ SIDEBAR ════════════════ */}
      <aside className="cd-sidebar">

        {/* Brand header */}
        <div className="cd-sidebar-header">
          <div className="cd-brand-row">
            <div className="cd-brand-dot">H</div>
            <span className="cd-brand-name">Hirely</span>
          </div>
          <p className="cd-brand-sub">Candidate Portal</p>
        </div>

        {/* User info */}
        <div className="cd-user-info">
          <div className="cd-user-avatar">
            {(user?.name || 'C').charAt(0).toUpperCase()}
          </div>
          <div className="cd-user-text">
            <strong>{user?.name || 'Candidate'}</strong>
            <span>Candidate</span>
          </div>
        </div>

        {/* Nav */}
        <div className="cd-nav-scroll">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`cd-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}

          <div className="cd-nav-spacer" />
          <div className="cd-nav-divider" />

          <button className="cd-logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* ════════════════ TOPBAR ════════════════ */}
      <header className="cd-topbar">
        <span className="cd-topbar-label">{pageTitle}</span>

        <div className="cd-topbar-right">
          {/* Notification bell */}
          <div className="cd-notif-wrap">
            <button
              className="cd-notif-btn"
              onClick={() => {
                setShowNotif(s => !s);
                if (!showNotif && unread > 0) markAllRead();
              }}
            >
              🔔
              {unread > 0 && <span className="cd-badge cd-badge-gold">{unread}</span>}
            </button>

            {showNotif && (
              <div className="cd-notif-drop">
                <div className="cd-notif-hdr">Notifications</div>
                {notifications.length === 0
                  ? <div className="cd-notif-empty">No new notifications</div>
                  : notifications.slice(0, 6).map(n => (
                    <div key={n.NotificationID} className="cd-notif-row">
                      <span>{n.Message}</span>
                      <small>{new Date(n.CreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* User chip */}
          <div className="cd-chip">
            <div className="cd-chip-av">
              {(user?.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="cd-chip-name">{user?.name || 'Candidate'}</div>
              <div className="cd-chip-role">Candidate</div>
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════ MAIN ════════════════ */}
      <main className="cd-main">
        {renderContent()}
      </main>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        .cd-root {
          display: flex;
          min-height: 100vh;
          background: #F1F5F9;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        /* ── Sidebar ── */
        .cd-sidebar {
          position: fixed; top: 0; left: 0;
          width: 250px; height: 100vh;
          background: linear-gradient(160deg, #667eea );
          color: white;
          display: flex; flex-direction: column;
          overflow: hidden;
          z-index: 200;
        }

        /* Brand header */
        .cd-sidebar-header {
          padding: 22px 20px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          flex-shrink: 0;
        }
        .cd-brand-row {
          display: flex; align-items: center; gap: 10px; margin-bottom: 3px;
        }
        .cd-brand-dot {
          width: 32px; height: 32px;
          background: rgba(255,255,255,0.25);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 17px;
        }
        .cd-brand-name { font-size: 21px; font-weight: 700; }
        .cd-brand-sub  { font-size: 11px; opacity: 0.65; margin: 0; padding-left: 42px; }

        /* User info */
        .cd-user-info {
          display: flex; align-items: center; gap: 10px;
          padding: 13px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          flex-shrink: 0;
        }
        .cd-user-avatar {
          width: 36px; height: 36px;
          background: rgba(255,255,255,0.25);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 15px; flex-shrink: 0;
        }
        .cd-user-text { min-width: 0; }
        .cd-user-text strong {
          display: block; font-size: 13px; color: white;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cd-user-text span {
          display: block; font-size: 11px; opacity: 0.7;
        }

        /* Scrollable nav */
        .cd-nav-scroll {
          flex: 1; min-height: 0;
          overflow-y: auto; overflow-x: hidden;
          display: flex; flex-direction: column;
          padding: 10px 10px 12px; gap: 2px;
        }
        .cd-nav-scroll::-webkit-scrollbar { width: 4px; }
        .cd-nav-scroll::-webkit-scrollbar-track { background: transparent; }
        .cd-nav-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.3); border-radius: 4px;
        }

        .cd-nav-item {
          width: 100%; padding: 11px 13px;
          background: transparent; border: none;
          color: rgba(255,255,255,0.85);
          cursor: pointer; border-radius: 9px;
          display: flex; align-items: center;
          font-size: 13.5px; font-weight: 400;
          text-align: left; transition: background 0.15s;
          flex-shrink: 0;
        }
        .cd-nav-item:hover  { background: rgba(255,255,255,0.15); }
        .cd-nav-item.active {
          background: rgba(255,255,255,0.25);
          font-weight: 600; color: white;
        }

        .cd-nav-spacer  { flex: 1; min-height: 10px; }
        .cd-nav-divider {
          height: 1px;
          background: rgba(255,255,255,0.15);
          margin: 6px 4px;
        }

        .cd-logout-btn {
          width: 100%; padding: 11px 13px;
          background: rgba(214,20,10,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          color: rgba(255,255,255,0.85);
          cursor: pointer; border-radius: 9px;
          display: flex; align-items: center;
          font-size: 13.5px; font-weight: 400;
          text-align: left; transition: background 0.15s, border-color 0.15s;
          flex-shrink: 0;
        }
        .cd-logout-btn:hover {
          background: rgba(239,68,68,0.55);
          border-color: transparent; color: white;
        }

        /* ── Topbar ── */
        .cd-topbar {
          position: fixed; top: 0; left: 250px; right: 0;
          height: 62px; background: #fff;
          border-bottom: 1px solid #E2E8F0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 28px; z-index: 100;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .cd-topbar-label  { font-size: 16px; font-weight: 600; color: #111827; }
        .cd-topbar-right  { display: flex; align-items: center; gap: 14px; }

        /* Notification */
        .cd-notif-wrap { position: relative; }
        .cd-notif-btn {
          position: relative;
          background: none; border: none; cursor: pointer;
          color: #6B7280; padding: 8px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .cd-notif-btn:hover { background: #F1F5F9; color: #374151; }
        .cd-badge {
          position: absolute; top: 2px; right: 2px;
          background: #EF4444; color: #fff;
          border-radius: 50%; width: 15px; height: 15px;
          font-size: 9px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
        .cd-badge-gold {
          background: linear-gradient(135deg, #F59E0B, #D97706);
          box-shadow: 0 0 0 2px #FDE68A, 0 0 8px rgba(245,158,11,0.6);
        }
        .cd-notif-drop {
          position: absolute; top: 46px; right: 0;
          width: 310px; background: #fff;
          border: 1px solid #E2E8F0; border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.12);
          overflow: hidden; z-index: 999;
        }
        .cd-notif-hdr {
          padding: 12px 16px; font-weight: 600; font-size: 13px;
          color: #111827; border-bottom: 1px solid #F1F5F9;
        }
        .cd-notif-empty {
          padding: 22px 16px; color: #9CA3AF; font-size: 13px; text-align: center;
        }
        .cd-notif-row {
          padding: 12px 16px; border-bottom: 1px solid #F8FAFC;
          display: flex; flex-direction: column; gap: 3px;
          background: #F8FAFF;
        }
        .cd-notif-row span  { font-size: 13px; color: #374151; line-height: 1.4; }
        .cd-notif-row small { font-size: 11px; color: #9CA3AF; }

        /* User chip */
        .cd-chip { display: flex; align-items: center; gap: 8px; }
        .cd-chip-av {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, #667eea);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 700; font-size: 13px;
        }
        .cd-chip-name { font-size: 13px; font-weight: 600; color: #1E293B; }
        .cd-chip-role { font-size: 11px; color: #94A3B8; }

        /* ── Main ── */
        .cd-main {
          margin-left: 250px; margin-top: 62px;
          padding: 28px; min-height: calc(100vh - 62px);
        }

        @media (max-width: 768px) {
          .cd-sidebar { width: 100%; position: relative; height: auto; }
          .cd-topbar  { left: 0; }
          .cd-main    { margin-left: 0; padding: 16px; }
        }
      `}</style>
    </div>
  );
};

export default CandidateDashboard;
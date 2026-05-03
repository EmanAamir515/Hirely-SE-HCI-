import React from 'react';

const EmployerSidebar = ({ activeTab, setActiveTab, user, onLogout, companyLogo }) => {
  const menuItems = [
    { id: 'dashboard',      label: 'Dashboard',      icon: '📊' },
    { id: 'profile',        label: 'Company Profile', icon: '🏢' },
    { id: 'post-job',       label: 'Post Job',        icon: '📝' },
    { id: 'manage-jobs',    label: 'Manage Jobs',     icon: '📋' },
    { id: 'all-applicants', label: 'All Applicants',  icon: '👥' },
    { id: 'services',       label: 'Services',        icon: '🔧' },
    { id: 'products',       label: 'Products',        icon: '📦' },
  ];

  const getActiveId = () =>
    activeTab === 'job-applicants' ? 'manage-jobs' : activeTab;

  return (
    <>
      <div className="sidebar">
        {/* ── Brand header ── */}
        <div className="sidebar-header">
          <div className="brand-row">
            <div className="brand-dot">H</div>
            <span className="brand-name">Hirely</span>
          </div>
          <p className="brand-sub">Employer Portal</p>
        </div>

        {/* ── User info ── */}
        <div className="user-info">
          <div className="user-avatar">
            {companyLogo
              ? <img src={companyLogo} alt="logo" className="avatar-img" />
              : <span>{user.name?.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div className="user-text">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
        </div>

        {/* ── Scrollable nav area ── */}
        <div className="nav-scroll-area">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${getActiveId() === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}

          {/* This spacer grows to push logout to the bottom */}
          <div className="nav-flex-spacer" />

          {/* Divider line above logout */}
          <div className="nav-divider" />

          {/* Logout — last item in the scrollable list */}
          <button className="logout-nav-btn" onClick={onLogout}>
            <span className="nav-icon">🚪</span>
            Logout
          </button>
        </div>
      </div>

      <style>{`
        /* ─── Sidebar shell — NEVER scrolls itself ─── */
        .sidebar {
          position: fixed;
          top: 0; left: 0;
          width: 250px;
          height: 100vh;
          background: linear-gradient(160deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          flex-direction: column;
          overflow: hidden;          /* ← outer shell does NOT scroll */
          z-index: 1000;
        }

        /* ─── Brand ─── */
        .sidebar-header {
          padding: 22px 20px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          flex-shrink: 0;
        }
        .brand-row {
          display: flex; align-items: center; gap: 10px; margin-bottom: 3px;
        }
        .brand-dot {
          width: 32px; height: 32px;
          background: rgba(255,255,255,0.25);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 17px;
        }
        .brand-name { font-size: 21px; font-weight: 700; }
        .brand-sub { font-size: 11px; opacity: 0.65; margin: 0; padding-left: 42px; }

        /* ─── User info ─── */
        .user-info {
          display: flex; align-items: center; gap: 10px;
          padding: 13px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          flex-shrink: 0;
        }
        .user-avatar {
          width: 36px; height: 36px;
          background: rgba(255,255,255,0.25);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 15px;
          flex-shrink: 0; overflow: hidden;
        }
        .avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .user-text { min-width: 0; }
        .user-text strong {
          display: block; font-size: 13px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .user-text span {
          display: block; font-size: 11px; opacity: 0.7;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ─── Scrollable nav area ─── */
        .nav-scroll-area {
          flex: 1;               /* takes all remaining height */
          min-height: 0;         /* lets it shrink below content size → scroll */
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          padding: 10px 10px 12px;
          gap: 2px;
        }

        /* Thin custom scrollbar inside nav */
        .nav-scroll-area::-webkit-scrollbar { width: 4px; }
        .nav-scroll-area::-webkit-scrollbar-track { background: transparent; }
        .nav-scroll-area::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.3); border-radius: 4px;
        }
        .nav-scroll-area::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.5);
        }

        /* Spacer that grows → pushes logout to the bottom */
        .nav-flex-spacer { flex: 1; min-height: 10px; }

        /* Divider line */
        .nav-divider {
          height: 1px;
          background: rgba(255,255,255,0.15);
          margin: 6px 4px;
        }

        /* ─── Normal nav items ─── */
        .nav-item {
          width: 100%;
          padding: 11px 13px;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.85);
          cursor: pointer;
          border-radius: 9px;
          display: flex; align-items: center; gap: 10px;
          font-size: 13.5px; font-weight: 400;
          text-align: left;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .nav-item:hover  { background: rgba(255,255,255,0.15); }
        .nav-item.active {
          background: rgba(255,255,255,0.25);
          font-weight: 600; color: white;
        }

        /* ─── Logout — same row style, different colour ─── */
        .logout-nav-btn {
          width: 100%;
          padding: 11px 13px;
          background: rgba(255,80,70,0.12);
          border: 1px solid rgba(255,255,255,0.18);
          color: rgba(255,255,255,0.85);
          cursor: pointer;
          border-radius: 9px;
          display: flex; align-items: center; gap: 10px;
          font-size: 13.5px; font-weight: 400;
          text-align: left;
          transition: background 0.15s, border-color 0.15s;
          flex-shrink: 0;
        }
        .logout-nav-btn:hover {
          background: rgba(239,68,68,0.55);
          border-color: transparent; color: white;
        }

        .nav-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
      `}</style>
    </>
  );
};

export default EmployerSidebar;
import React, { useState, useEffect } from 'react';

const CandidateOverview = ({ user, onNavigate }) => {
  const [stats, setStats] = useState({ applicationsSent: 0, profileViews: 0, interviewsScheduled: 0, jobMatches: 0, profileCompletion: 20 });
  const [recentApps, setRecentApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentApplications();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/candidate/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (_) {} finally { setLoading(false); }
  };

  const fetchRecentApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/applications/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setRecentApps((data.applications || []).slice(0, 4));
    } catch (_) {}
  };

  const statusColor = { Pending: '#F59E0B', Shortlisted: '#3B82F6', Interview: '#8B5CF6', Accepted: '#10B981', Rejected: '#EF4444' };
  const statusBg   = { Pending: '#FFFBEB', Shortlisted: '#EFF6FF', Interview: '#F5F3FF', Accepted: '#ECFDF5', Rejected: '#FEF2F2' };

  const statCards = [
    { label: 'Applications Sent',    value: stats.applicationsSent,     color: '#6366F1', bg: '#EEF2FF', nav: 'applications' },
    { label: 'Profile Views',        value: stats.profileViews,         color: '#10B981', bg: '#ECFDF5', nav: 'profile'      },
    { label: 'Interviews Scheduled', value: stats.interviewsScheduled,  color: '#F59E0B', bg: '#FFFBEB', nav: 'applications' },
    { label: 'Job Matches',          value: stats.jobMatches,           color: '#3B82F6', bg: '#EFF6FF', nav: 'findJobs'     },
  ];

  const completionPct = stats.profileCompletion;
  const completionTips = [
    { label: 'Add Skills',       done: completionPct >= 40, nav: 'profile' },
    { label: 'Upload CV',        done: completionPct >= 70, nav: 'profile' },
    { label: 'Add Experience',   done: completionPct >= 85, nav: 'profile' },
  ];

  return (
    <div className="ov-root">
      {/* Welcome */}
      <div className="ov-welcome">
        <div>
          <h1>Welcome, {(user?.name || 'User').split(' ')[0]}! </h1>
          <p>Here's your job search progress and recommendations</p>
        </div>
        <button className="ov-browse-btn" onClick={() => onNavigate('findJobs')}>
          🔍 Browse Jobs
        </button>
      </div>

      {/* Profile Completion */}
      <div className="ov-completion-card">
        <div className="ov-comp-header">
          <div>
            <div className="ov-comp-label">Profile Completion</div>
            <div className="ov-comp-sub">Complete your profile to get better job matches</div>
          </div>
          <span className="ov-comp-pct">{completionPct}%</span>
        </div>
        <div className="ov-progress-track">
          <div className="ov-progress-fill" style={{ width: `${completionPct}%` }} />
        </div>
        <div className="ov-comp-actions">
          {completionTips.map(tip => (
            <button
              key={tip.label}
              className={`ov-comp-action ${tip.done ? 'done' : ''}`}
              onClick={() => !tip.done && onNavigate(tip.nav)}
            >
              {tip.done ? '✓ ' : '+ '}{tip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="ov-stats-grid">
        {statCards.map(card => (
          <div key={card.label} className="ov-stat-card" onClick={() => onNavigate(card.nav)}>
            <div className="ov-stat-icon" style={{ background: card.bg, color: card.color }}>
               {loading ? '—' : card.value}
            </div>
            <div className="ov-stat-body">
              <span className="ov-stat-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="ov-section">
        <div className="ov-section-hdr">
          <h3>Recent Applications</h3>
          <button className="ov-link-btn" onClick={() => onNavigate('applications')}>View All →</button>
        </div>
        {recentApps.length === 0 ? (
          <div className="ov-empty">
            <span>📭</span>
            <p>No applications yet. <button onClick={() => onNavigate('findJobs')}>Find jobs to apply</button></p>
          </div>
        ) : (
          <div className="ov-app-list">
            {recentApps.map(app => (
              <div key={app.ApplicationID} className="ov-app-row">
                <div className="ov-app-logo">
                  {(app.CompanyName || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="ov-app-info">
                  <span className="ov-app-title">{app.Title}</span>
                  <span className="ov-app-company">{app.CompanyName} · {app.JobType}</span>
                </div>
                <div>
                  <span className="ov-app-date">
                    {new Date(app.AppliedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <span
                  className="ov-status-badge"
                  style={{ color: statusColor[app.Status] || '#6B7280', background: statusBg[app.Status] || '#F3F4F6' }}
                >
                  {app.Status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="ov-section">
        <h3>Quick Actions</h3>
        <div className="ov-qa-grid">
          {[
            { label: 'Post New Application', icon: '📝', nav: 'findJobs' },
            { label: 'Check Eligibility',    icon: '✅', nav: 'eligibility' },
            { label: 'Update Profile',       icon: '👤', nav: 'profile' },
            { label: 'Browse Marketplace',   icon: '🛍️', nav: 'marketplace' },
          ].map(qa => (
            <button key={qa.label} className="ov-qa-btn" onClick={() => onNavigate(qa.nav)}>
              <span>{qa.icon}</span>
              <span>{qa.label}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .ov-root { display: flex; flex-direction: column; gap: 20px; }

        .ov-welcome {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
        }
        .ov-welcome h1 { font-size: 26px; font-weight: 700; color: #0F172A; margin: 0 0 4px; }
        .ov-welcome p  { color: #64748B; margin: 0; font-size: 14px; }
        .ov-browse-btn {
          padding: 10px 22px;
          background: linear-gradient(135deg, #667eea);
          color: #fff; border: none; border-radius: 8px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: opacity 0.2s; white-space: nowrap;
        }
        .ov-browse-btn:hover { opacity: 0.88; }

        /* Completion */
        .ov-completion-card {
          background: #fff; border-radius: 14px;
          padding: 22px 24px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .ov-comp-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
        .ov-comp-label { font-size: 15px; font-weight: 600; color: #1E293B; }
        .ov-comp-sub   { font-size: 13px; color: #64748B; margin-top: 2px; }
        .ov-comp-pct   { font-size: 22px; font-weight: 700; color: #667eea; }
        .ov-progress-track {
          height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;
        }
        .ov-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          border-radius: 4px;
          transition: width 0.6s ease;
        }
        .ov-comp-actions { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
        .ov-comp-action {
          padding: 7px 16px;
          background: #F1F5F9; color: #475569;
          border: 1px solid #E2E8F0; border-radius: 6px;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.15s;
        }
        .ov-comp-action:hover:not(.done) { background: #EEF2FF; color: #4338CA; border-color: #C7D2FE; }
        .ov-comp-action.done { background: #ECFDF5; color: #059669; border-color: #A7F3D0; cursor: default; }

        /* Stats */
        .ov-stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
        }
        .ov-stat-card {
          background: #fff; border-radius: 14px;
          padding: 20px; display: flex; align-items: center; gap: 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          cursor: pointer; transition: all 0.2s;
        }
        .ov-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
        .ov-stat-icon {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; flex-shrink: 0;
        }
        .ov-stat-body { flex: 1; display: flex; flex-direction: column; }
        .ov-stat-value { font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1.2; }
        .ov-stat-label { font-size: 12px; color: #64748B; margin-top: 2px; }
        .ov-stat-arrow { color: #CBD5E1; font-size: 14px; }

        /* Sections */
        .ov-section { background: #fff; border-radius: 14px; padding: 22px 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .ov-section-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .ov-section h3  { font-size: 16px; font-weight: 600; color: #1E293B; margin: 0 0 16px; }
        .ov-section-hdr h3 { margin: 0; }
        .ov-link-btn { background: none; border: none; color: #667eea; font-size: 13px; font-weight: 600; cursor: pointer; }
        .ov-link-btn:hover { text-decoration: underline; }

        /* Empty */
        .ov-empty { text-align: center; padding: 30px 0; color: #94A3B8; }
        .ov-empty span { font-size: 36px; display: block; margin-bottom: 8px; }
        .ov-empty p { margin: 0; font-size: 14px; }
        .ov-empty button { background: none; border: none; color: #667eea; cursor: pointer; font-weight: 600; }

        /* App list */
        .ov-app-list { display: flex; flex-direction: column; gap: 10px; }
        .ov-app-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; background: #F8FAFC; border-radius: 10px;
          transition: background 0.15s;
        }
        .ov-app-row:hover { background: #F1F5F9; }
        .ov-app-logo {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 700; font-size: 16px; flex-shrink: 0;
        }
        .ov-app-info { flex: 1; display: flex; flex-direction: column; }
        .ov-app-title   { font-size: 14px; font-weight: 600; color: #1E293B; }
        .ov-app-company { font-size: 12px; color: #64748B; }
        .ov-app-date    { font-size: 12px; color: #94A3B8; white-space: nowrap; }
        .ov-status-badge {
          padding: 4px 12px; border-radius: 20px;
          font-size: 12px; font-weight: 600; white-space: nowrap;
        }

        /* Quick Actions */
        .ov-qa-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
        }
        .ov-qa-btn {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 18px 12px;
          background: #F8FAFC; border: 2px solid #E2E8F0;
          border-radius: 10px; cursor: pointer;
          font-size: 13px; color: #475569; font-weight: 500;
          transition: all 0.2s;
        }
        .ov-qa-btn:hover { background: #EEF2FF; border-color: #667eea; color: #4338CA; }
        .ov-qa-btn span:first-child { font-size: 24px; }

        @media (max-width: 1100px) { .ov-stats-grid { grid-template-columns: repeat(2, 1fr); } .ov-qa-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .ov-stats-grid { grid-template-columns: 1fr; } .ov-qa-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </div>
  );
};

export default CandidateOverview;
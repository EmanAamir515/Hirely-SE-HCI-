import React, { useState, useEffect } from 'react';

const MyApplications = ({ user, onStartInterview }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/applications/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setApplications(data.applications || []);
    } catch (_) {} finally { setLoading(false); }
  };

  const statusConfig = {
    Pending:     { color: '#92400E', bg: '#FEF3C7', border: '#FCD34D', icon: '⏳', label: 'Pending Review' },
    Shortlisted: { color: '#1D4ED8', bg: '#DBEAFE', border: '#93C5FD', icon: '⭐', label: 'Shortlisted' },
    Interview:   { color: '#5B21B6', bg: '#EDE9FE', border: '#C4B5FD', icon: '📞', label: 'Interview Scheduled' },
    Interviewed: { color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7', icon: '✅', label: 'Interview Done' },
    Accepted:    { color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7', icon: '🎉', label: 'Accepted' },
    Rejected:    { color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5', icon: '❌', label: 'Rejected' },
  };

  const filterOptions = ['All', 'Pending', 'Shortlisted', 'Interview', 'Interviewed', 'Accepted', 'Rejected'];
  const filtered = filter === 'All' ? applications : applications.filter(a => a.Status === filter);

  const statusCounts = filterOptions.slice(1).reduce((acc, s) => {
    acc[s] = applications.filter(a => a.Status === s).length;
    return acc;
  }, {});

  const getDaysAgo = (d) => {
    if (!d) return '';
    const diff = Math.ceil(Math.abs(new Date() - new Date(d)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return '1 day ago';
    if (diff < 7)  return `${diff} days ago`;
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="ma-root">
      {/* Header */}
      <div className="ma-header">
        <div>
          <h2>My Applications</h2>
          <p>Track all your job and internship applications</p>
        </div>
        <span className="ma-total-badge">{applications.length} Total</span>
      </div>

      {/* Interview Banner — show if any application is in Interview status */}
      {applications.some(a => a.Status === 'Interview') && (
        <div className="ma-interview-banner">
          <span>🎙️</span>
          <div>
            <strong>You have been selected for an AI Interview!</strong>
            <p>Scroll down to find the job and click "Take Interview" to begin.</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="ma-summary-grid">
        {filterOptions.slice(1).map(s => {
          const cfg = statusConfig[s];
          if (!cfg) return null;
          return (
            <div
              key={s}
              className={`ma-summary-card ${filter === s ? 'active' : ''}`}
              onClick={() => setFilter(filter === s ? 'All' : s)}
              style={{ borderColor: filter === s ? cfg.border : 'transparent' }}
            >
              <span className="ma-sum-icon">{cfg.icon}</span>
              <div>
                <div className="ma-sum-count" style={{ color: cfg.color }}>{statusCounts[s] || 0}</div>
                <div className="ma-sum-label">{s}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="ma-filter-row">
        {filterOptions.map(f => (
          <button
            key={f}
            className={`ma-filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
            {f !== 'All' && statusCounts[f] > 0 && (
              <span className="ma-tab-count">{statusCounts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="ma-loading">
          {[1,2,3].map(i => <div key={i} className="ma-skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ma-empty">
          <span>📭</span>
          <p>{filter === 'All' ? "You haven't applied to any jobs yet." : `No ${filter.toLowerCase()} applications.`}</p>
        </div>
      ) : (
        <div className="ma-list">
          {filtered.map(app => {
            const cfg = statusConfig[app.Status] || statusConfig.Pending;
            const canInterview = app.Status === 'Interview';
            const doneInterview = app.Status === 'Interviewed';

            return (
              <div key={app.ApplicationID} className={`ma-card ${canInterview ? 'ma-card-highlight' : ''}`}>
                {/* Left: Company Logo */}
                <div className="ma-logo">
                  {(app.CompanyName || 'C').charAt(0).toUpperCase()}
                </div>

                {/* Center: Job info */}
                <div className="ma-info">
                  <div className="ma-info-top">
                    <h4 className="ma-job-title">{app.Title}</h4>
                    <span
                      className="ma-status-badge"
                      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
                    >
                      {cfg.icon} {app.Status}
                    </span>
                  </div>
                  <div className="ma-meta">
                    <span>🏢 {app.CompanyName}</span>
                    <span>📋 {app.JobType}</span>
                    <span>🕒 Applied {getDaysAgo(app.AppliedDate)}</span>
                  </div>
                  {app.CoverNote && (
                    <p className="ma-cover-note">"{app.CoverNote}"</p>
                  )}

                  {/* ── Interview Action ── */}
                  {canInterview && (
                    <button
                      className="ma-interview-btn"
                      onClick={() => onStartInterview && onStartInterview(app.ApplicationID, app.Title)}
                    >
                      🎙️ Take AI Interview
                    </button>
                  )}
                  {doneInterview && (
                    <div className="ma-interviewed-note">
                      ✅ Interview completed — awaiting employer review
                    </div>
                  )}
                </div>

                {/* Status timeline */}
                <div className="ma-timeline">
                  {['Pending', 'Shortlisted', 'Interview'].map((step, idx) => {
                    const steps = ['Pending', 'Shortlisted', 'Interview', 'Interviewed', 'Accepted'];
                    const currentIdx = steps.indexOf(app.Status);
                    const isRejected = app.Status === 'Rejected';
                    const done = !isRejected && currentIdx >= idx;
                    const current = !isRejected && currentIdx === idx;
                    return (
                      <React.Fragment key={step}>
                        <div className={`ma-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                          <div className="ma-step-dot">
                            {done && !current && '✓'}
                          </div>
                          <span>{step}</span>
                        </div>
                        {idx < 2 && <div className={`ma-step-line ${done && currentIdx > idx ? 'done' : ''}`} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .ma-root { display: flex; flex-direction: column; gap: 16px; }
        .ma-header {
          display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 10px;
        }
        .ma-header h2 { font-size: 24px; font-weight: 700; color: #0F172A; margin: 0 0 4px; }
        .ma-header p  { color: #64748B; margin: 0; font-size: 14px; }
        .ma-total-badge {
          padding: 6px 14px;
          background: #EEF2FF; color: #4338CA;
          border-radius: 20px; font-size: 13px; font-weight: 600;
        }

        /* Interview Banner */
        .ma-interview-banner {
          display: flex; align-items: flex-start; gap: 14px;
          background: linear-gradient(135deg, #EDE9FE, #F5F3FF);
          border: 2px solid #C4B5FD; border-radius: 14px;
          padding: 16px 20px;
        }
        .ma-interview-banner span { font-size: 28px; flex-shrink: 0; }
        .ma-interview-banner strong { display: block; color: #5B21B6; font-size: 15px; margin-bottom: 3px; }
        .ma-interview-banner p { margin: 0; font-size: 13px; color: #7C3AED; }

        /* Summary */
        .ma-summary-grid {
          display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px;
        }
        .ma-summary-card {
          background: #fff; border-radius: 12px;
          padding: 14px 12px; display: flex; align-items: center; gap: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          cursor: pointer; transition: all 0.15s;
          border: 2px solid transparent;
        }
        .ma-summary-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .ma-summary-card.active { background: #F8FAFF; }
        .ma-sum-icon  { font-size: 20px; }
        .ma-sum-count { font-size: 20px; font-weight: 700; line-height: 1.2; }
        .ma-sum-label { font-size: 11px; color: #64748B; }

        /* Filters */
        .ma-filter-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .ma-filter-tab {
          padding: 7px 14px; border-radius: 20px;
          border: 1.5px solid #E2E8F0;
          background: #F8FAFC; color: #475569;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.15s; display: flex; align-items: center; gap: 6px;
        }
        .ma-filter-tab:hover  { border-color: #667eea; color: #4338CA; }
        .ma-filter-tab.active { background: #EEF2FF; color: #4338CA; border-color: #C7D2FE; font-weight: 600; }
        .ma-tab-count {
          background: #E0E7FF; color: #4338CA;
          border-radius: 10px; padding: 1px 6px; font-size: 11px; font-weight: 700;
        }

        /* Loading / Empty */
        .ma-loading { display: flex; flex-direction: column; gap: 12px; }
        .ma-skeleton {
          height: 110px; border-radius: 14px;
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%; animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .ma-empty { text-align: center; padding: 60px 0; color: #94A3B8; }
        .ma-empty span { font-size: 48px; display: block; margin-bottom: 12px; }
        .ma-empty p    { font-size: 15px; margin: 0; }

        /* Cards */
        .ma-list { display: flex; flex-direction: column; gap: 12px; }
        .ma-card {
          background: #fff; border-radius: 14px;
          padding: 20px 22px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          display: flex; align-items: flex-start; gap: 16px;
          transition: box-shadow 0.15s; border: 2px solid transparent;
        }
        .ma-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.09); }
        .ma-card-highlight { border-color: #C4B5FD; background: #FDFBFF; }

        .ma-logo {
          width: 46px; height: 46px; border-radius: 12px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 700; font-size: 18px; flex-shrink: 0;
        }

        .ma-info { flex: 1; min-width: 0; }
        .ma-info-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
        .ma-job-title { font-size: 15px; font-weight: 600; color: #1E293B; margin: 0; }
        .ma-status-badge {
          padding: 4px 12px; border-radius: 20px;
          font-size: 12px; font-weight: 600; white-space: nowrap;
        }
        .ma-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 6px; }
        .ma-meta span { font-size: 12px; color: #64748B; }
        .ma-cover-note {
          font-size: 13px; color: #94A3B8; font-style: italic; margin: 0 0 10px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* Interview button */
        .ma-interview-btn {
          margin-top: 10px;
          padding: 10px 22px;
          background: linear-gradient(135deg, #7C3AED, #5B21B6);
          color: white; border: none; border-radius: 9px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: opacity .2s, transform .15s;
          display: inline-block;
        }
        .ma-interview-btn:hover { opacity: .88; transform: translateY(-1px); }

        .ma-interviewed-note {
          margin-top: 10px;
          padding: 8px 14px;
          background: #ECFDF5; color: #166534;
          border-radius: 8px; font-size: 13px; font-weight: 500;
          display: inline-block;
        }

        /* Timeline */
        .ma-timeline {
          display: flex; align-items: center; gap: 4px; flex-shrink: 0;
        }
        .ma-step { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .ma-step-dot {
          width: 22px; height: 22px; border-radius: 50%;
          border: 2px solid #E2E8F0; background: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; color: #fff;
          transition: all 0.3s;
        }
        .ma-step.done .ma-step-dot { background: #667eea; border-color: #667eea; color: #fff; }
        .ma-step.current .ma-step-dot { background: #fff; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.2); }
        .ma-step span { font-size: 9px; color: #94A3B8; white-space: nowrap; }
        .ma-step.done span { color: #667eea; font-weight: 600; }
        .ma-step-line {
          width: 24px; height: 2px; background: #E2E8F0; margin-bottom: 14px; transition: background 0.3s;
        }
        .ma-step-line.done { background: #667eea; }

        @media (max-width: 900px) { .ma-summary-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 640px) {
          .ma-summary-grid { grid-template-columns: repeat(2, 1fr); }
          .ma-timeline { display: none; }
          .ma-card { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
};

export default MyApplications;
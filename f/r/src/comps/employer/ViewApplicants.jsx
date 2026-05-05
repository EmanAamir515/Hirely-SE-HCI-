import React, { useState, useEffect } from 'react';

const ViewApplicants = ({ user, jobId, onBack }) => {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (jobId) fetchApplicants();
  }, [jobId]);

  const fetchApplicants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}/applicants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setApplicants(data.applicants || []);
    } catch (error) {
      console.error('Error fetching applicants:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (applicationId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:5000/api/applications/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ applicationId, status: newStatus })
      });
      fetchApplicants();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusStyle = (status) => {
    const map = {
      'Pending':     { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
      'Shortlisted': { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
      'Interview':   { bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD' },
      'Accepted':    { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
      'Rejected':    { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' }
    };
    return map[status] || { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };
  };

  const getInitials = (name) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  // True when a candidate has at least one detail to show
  const hasDetails = (app) =>
    (app.Education && app.Education.trim()) ||
    (app.Experience && app.Experience.trim()) ||
    app.CVPath;

  if (loading) return (
    <div className="loading-state">
      <div className="spinner" />
      <p>Loading applicants…</p>
    </div>
  );

  return (
    <div className="applicants-page">
      <div className="page-header">
        {onBack && (
          <button className="back-btn" onClick={onBack}>
            ← Back to Jobs
          </button>
        )}
        <div>
          <h1>Job Applicants</h1>
          <p className="subtitle">
            {applicants.length} applicant{applicants.length !== 1 ? 's' : ''} for this position
          </p>
        </div>
      </div>

      {applicants.length === 0 ? (
        <div className="empty-state">
          <span>👥</span>
          <h3>No applicants yet</h3>
          <p>Candidates who apply for this job will appear here</p>
        </div>
      ) : (
        <div className="applicants-grid">
          {applicants.map(app => {
            const st = getStatusStyle(app.Status);
            return (
              <div key={app.ApplicationID} className="applicant-card">

                {/* ── Header ── */}
                <div className="applicant-header">
                  <div className="avatar">{getInitials(app.Name)}</div>
                  <div className="applicant-info">
                    <h3>{app.Name || 'Unknown Candidate'}</h3>
                    <p className="email">✉️ {app.Email}</p>
                    {app.Phone && <p className="phone">📱 {app.Phone}</p>}
                  </div>
                  {/* Status badge pill */}
                  <span
                    className="status-pill"
                    style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                  >
                    {app.Status}
                  </span>
                </div>

                {/* ── Details: education / experience / CV ── */}
                {hasDetails(app) ? (
                  <div className="applicant-details">
                    {app.Education && app.Education.trim() && (
                      <div className="detail-item">
                        <span>🎓</span>
                        <div>
                          <small>Education</small>
                          <p>{app.Education}</p>
                        </div>
                      </div>
                    )}
                    {app.Experience && app.Experience.trim() && (
                      <div className="detail-item">
                        <span>💼</span>
                        <div>
                          <small>Experience</small>
                          <p>{app.Experience}</p>
                        </div>
                      </div>
                    )}
                    {app.CVPath && (
                      <div className="detail-item">
                        <span>📄</span>
                        <div>
                          <small>CV / Resume</small>
                          <a
                            href={app.CVPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cv-link"
                          >
                            View CV ↗
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Shown when Education, Experience, and CVPath are all empty ── */
                  <div className="no-details">
                    <span>📋</span>
                    <p>No profile details provided yet</p>
                  </div>
                )}

                {/* ── Cover note ── */}
                {app.CoverNote && app.CoverNote.trim() && (
                  <div className="cover-note">
                    <small>💬 Cover Note</small>
                    <p>"{app.CoverNote}"</p>
                  </div>
                )}

                {/* ── Footer ── */}
                <div className="applicant-footer">
                  <span className="date-info">
                    📅 Applied: {new Date(app.AppliedDate).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </span>

                  <select
                    value={app.Status}
                    onChange={(e) => updateStatus(app.ApplicationID, e.target.value)}
                    className="status-select"
                    style={{ borderColor: st.border, color: st.text }}
                  >
                    <option value="Pending">⏳ Pending</option>
                    <option value="Shortlisted">⭐ Shortlisted</option>
                    <option value="Interview">📅 Interview</option>
                    <option value="Accepted">✅ Accepted</option>
                    <option value="Rejected">❌ Rejected</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .applicants-page { max-width: 1100px; }

        .page-header {
          display: flex; align-items: center; gap: 20px;
          margin-bottom: 28px;
        }

        .back-btn {
          padding: 10px 20px;
          border: 2px solid #E5E7EB;
          background: white; border-radius: 10px;
          cursor: pointer; font-size: 14px; color: #374151;
          transition: all 0.2s; white-space: nowrap;
        }
        .back-btn:hover {
          border-color: #667EEA; color: #667EEA; background: #EEF2FF;
        }

        .page-header h1 { font-size: 26px; color: #111827; margin: 0 0 4px 0; }
        .subtitle { color: #6B7280; margin: 0; font-size: 14px; }

        .applicants-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(460px, 1fr));
          gap: 20px;
        }

        /* ── Empty whole-page state ── */
        .empty-state {
          text-align: center; padding: 80px 20px;
          background: white; border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .empty-state span { font-size: 60px; display: block; margin-bottom: 14px; }
        .empty-state h3 { color: #111827; margin-bottom: 6px; }
        .empty-state p { color: #6B7280; }

        /* ── Card ── */
        .applicant-card {
          background: white; border-radius: 16px; padding: 22px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
          transition: transform 0.2s, box-shadow 0.2s;
          border: 1.5px solid transparent;
        }
        .applicant-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.09);
          border-color: #e0e7ff;
        }

        /* ── Card header ── */
        .applicant-header {
          display: flex; align-items: flex-start; gap: 14px;
          margin-bottom: 16px;
        }

        .avatar {
          width: 46px; height: 46px;
          background: linear-gradient(135deg, #667EEA);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 17px; font-weight: 700; flex-shrink: 0;
        }

        .applicant-info { flex: 1; min-width: 0; }
        .applicant-info h3 { margin: 0 0 3px; font-size: 15px; color: #111827; }
        .applicant-info .email,
        .applicant-info .phone {
          margin: 2px 0; font-size: 12px; color: #6B7280;
        }

        .status-pill {
          padding: 4px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 600; white-space: nowrap;
          flex-shrink: 0;
        }

        /* ── Details block ── */
        .applicant-details {
          background: #F8F9FF; border-radius: 10px;
          padding: 14px 16px; margin-bottom: 12px;
          border: 1px solid #E8EAFF;
        }

        .detail-item {
          display: flex; gap: 10px; align-items: flex-start;
          margin-bottom: 10px;
        }
        .detail-item:last-child { margin-bottom: 0; }
        .detail-item > span { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
        .detail-item small {
          display: block; color: #9CA3AF; font-size: 10px;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .detail-item p { margin: 2px 0 0; color: #374151; font-size: 13px; }

        .cv-link { color: #667EEA; text-decoration: none; font-size: 13px; font-weight: 500; }
        .cv-link:hover { text-decoration: underline; }

        /* ── No-details placeholder ── */
        .no-details {
          display: flex; align-items: center; gap: 10px;
          background: #F9FAFB; border: 1px dashed #D1D5DB;
          border-radius: 10px; padding: 12px 16px;
          margin-bottom: 12px;
        }
        .no-details span { font-size: 18px; }
        .no-details p { margin: 0; font-size: 13px; color: #9CA3AF; font-style: italic; }

        /* ── Cover note ── */
        .cover-note {
          background: #FFFBEB; border-left: 3px solid #FCD34D;
          border-radius: 0 8px 8px 0; padding: 10px 14px;
          margin-bottom: 12px;
        }
        .cover-note small {
          display: block; font-size: 11px; color: #92400E;
          font-weight: 600; margin-bottom: 3px;
        }
        .cover-note p { margin: 0; font-size: 13px; color: #78350F; font-style: italic; }

        /* ── Footer ── */
        .applicant-footer {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 14px; border-top: 1px solid #F3F4F6;
        }

        .date-info { color: #9CA3AF; font-size: 12px; }

        .status-select {
          padding: 7px 12px; border: 2px solid #E5E7EB;
          border-radius: 8px; font-size: 13px;
          background: white; cursor: pointer; font-weight: 500;
        }
        .status-select:focus { outline: none; }

        /* ── Loading ── */
        .loading-state { text-align: center; padding: 80px; color: #666; }
        .spinner {
          width: 40px; height: 40px;
          border: 3px solid #F3F4F6; border-top-color: #667EEA;
          border-radius: 50%; animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 900px) {
          .applicants-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default ViewApplicants;
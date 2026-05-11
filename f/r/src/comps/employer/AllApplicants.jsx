import React, { useState, useEffect } from 'react';
import { sendNotification } from './notifyHelperE';

// Props:
//   user               – current logged-in user
//   onViewJobApplicants(jobId) – called when "View Job" is clicked; parent switches to job-applicants tab
const AllApplicants = ({ user, onViewJobApplicants, onViewInterview }) => {
  const [applicants, setApplicants] = useState([]);
  const [filteredApplicants, setFilteredApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchAllApplicants();
  }, []);

  useEffect(() => {
    filterApplicants();
  }, [searchTerm, statusFilter, applicants]);

  const fetchAllApplicants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/applicants/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setApplicants(data.applicants || []);
        setFilteredApplicants(data.applicants || []);
      }
    } catch (error) {
      console.error('Error fetching applicants:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterApplicants = () => {
    let filtered = [...applicants];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(app =>
        app.CandidateName?.toLowerCase().includes(term) ||
        app.Email?.toLowerCase().includes(term) ||
        app.JobTitle?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(app => app.Status === statusFilter);
    }

    setFilteredApplicants(filtered);
  };

  const updateStatus = async (applicationId, newStatus) => {
    // Optimistically update UI
    const applicant = applicants.find(a => a.ApplicationID === applicationId);
    setApplicants(prev =>
      prev.map(a => a.ApplicationID === applicationId ? { ...a, Status: newStatus } : a)
    );
    setFilteredApplicants(prev =>
      prev.map(a => a.ApplicationID === applicationId ? { ...a, Status: newStatus } : a)
    );

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

      // ── Notify the candidate ─────────────────────────────────────────────
      // Your GET /api/applicants/all should include CandidateUserID (the UserId
      // of the candidate account). Add it to the query if it's missing.
      const candidateUserId = applicant?.CandidateUserID ?? applicant?.CandidateID;
      if (candidateUserId) {
        const jobTitle = applicant?.JobTitle || 'a position';
        const candidateName = applicant?.CandidateName || 'there';
        const statusMessages = {
          Shortlisted: `🌟 Great news! Your application for "${jobTitle}" has been shortlisted.`,
          Interview:   `🎙️ You've been selected for an AI Interview for "${jobTitle}". Log in to take it now!`,
          Accepted:    `🎉 Congratulations! Your application for "${jobTitle}" has been accepted!`,
          Rejected:    `Thank you for applying to "${jobTitle}". Unfortunately, you were not selected this time.`,
          Pending:     `Your application for "${jobTitle}" status has been updated to Pending.`,
        };
        const msg = statusMessages[newStatus] || `Your application status changed to: ${newStatus}`;
        await sendNotification(token, candidateUserId, msg);
      }
      // ────────────────────────────────────────────────────────────────────

      fetchAllApplicants();
    } catch (error) {
      console.error('Error updating status:', error);
      fetchAllApplicants(); // revert on error
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending':     { bg: '#FEF3C7', text: '#92400E' },
      'Shortlisted': { bg: '#DBEAFE', text: '#1E40AF' },
      'Interview':   { bg: '#EDE9FE', text: '#5B21B6' },
      'Accepted':    { bg: '#D1FAE5', text: '#065F46' },
      'Rejected':    { bg: '#FEE2E2', text: '#991B1B' }
    };
    return colors[status] || { bg: '#F3F4F6', text: '#374151' };
  };

  if (loading) return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Loading applicants…</p>
    </div>
  );

  return (
    <div className="all-applicants-page">
      <div className="page-header">
        <h1>All Applicants</h1>
        <p className="subtitle">View and manage every application across all your jobs</p>
      </div>

      {/* Stats */}
      <div className="stats-row">
        {[
          { val: applicants.length,                                      lbl: 'Total Applicants', bg: '#EEF2FF', color: '#667eea' },
          { val: applicants.filter(a => a.Status === 'Pending').length,  lbl: 'Pending',          bg: '#FEF3C7', color: '#92400E' },
          { val: applicants.filter(a => a.Status === 'Shortlisted').length, lbl: 'Shortlisted',   bg: '#DBEAFE', color: '#1E40AF' },
          { val: applicants.filter(a => a.Status === 'Accepted').length, lbl: 'Accepted',         bg: '#D1FAE5', color: '#065F46' },
        ].map(s => (
          <div key={s.lbl} className="stat-card">
            <div className="stat-num-box" style={{ background: s.bg, color: s.color }}>{s.val}</div>
            <span className="stat-label">{s.lbl}</span>
          </div>
        ))}
      </div>
     

      {/* Search and Filter */}
      <div className="controls">
        <div className="search-box">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
              stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, or job title…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="All">All Status</option>
          <option value="Pending">⏳ Pending</option>
          <option value="Shortlisted"> Shortlisted</option>
          <option value="Interview"> Interview</option>
          <option value="Accepted"> Accepted</option>
          <option value="Rejected">❌ Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Job Position</th>
              <th>Applied Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplicants.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-cell">
                  <span>👥</span>
                  <p>No applicants found</p>
                  <small>Try adjusting your search or filter</small>
                </td>
              </tr>
            ) : (
              filteredApplicants.map(app => {
                const statusStyle = getStatusColor(app.Status);
                return (
                  <tr key={app.ApplicationID}>
                    <td>
                      <div className="applicant-info">
                        <div className="applicant-avatar">
                          {app.CandidateName?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <strong>{app.CandidateName}</strong>
                          <span className="email">{app.Email}</span>
                          {app.Phone && <span className="phone">{app.Phone}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="job-title-badge">{app.JobTitle}</span>
                    </td>
                    <td className="date-cell">
                      {new Date(app.AppliedDate).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </td>
                    <td>
                      <select
                        value={app.Status}
                        onChange={(e) => updateStatus(app.ApplicationID, e.target.value)}
                        className="status-select"
                        style={{
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.text,
                          border: `1.5px solid ${statusStyle.text}30`
                        }}
                      >
                        <option value="Pending">⏳ Pending</option>
                        <option value="Shortlisted"> Shortlisted</option>
                        <option value="Interview"> Interview</option>
                        <option value="Accepted"> Accepted</option>
                        <option value="Rejected">❌ Rejected</option>
                      </select>
                    </td>
                    <td>
  <button
    className="view-btn"
    onClick={() => onViewJobApplicants && onViewJobApplicants(app.JobID)}
    title="See all applicants for this job"
  >
    👁 View Job
  </button>
  <button
    className="view-btn"
    style={{ marginLeft: 8, background: '#F0FDF4', color: '#166534' }}
    onClick={() => onViewInterview && onViewInterview(app.ApplicationID)}
    title="View interview result"
  >
    🎙️ Interview
  </button>
</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .all-applicants-page { max-width: 1200px; }

        .page-header { margin-bottom: 24px; }
        .page-header h1 { font-size: 28px; color: #111827; margin: 0 0 4px 0; }
        .subtitle { color: #6B7280; margin: 0; font-size: 15px; }

        /* Stats */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          padding: 18px 20px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .stat-card span:first-child { font-size: 28px; }
        .stat-value { display: block; font-size: 22px; font-weight: 700; color: #111827; }
        .stat-label { font-size: 12px; color: #6B7280; }

        /* Controls */
        .controls {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .search-box {
          flex: 1;
          background: white;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          display: flex;
          align-items: center;
          padding: 0 14px;
          gap: 10px;
        }

        .search-input {
          flex: 1;
          border: none;
          padding: 13px 0;
          font-size: 14px;
          outline: none;
          background: transparent;
        }

        .filter-select {
          padding: 12px 16px;
          border: 2px solid #E5E7EB;
          border-radius: 10px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          outline: none;
        }

        .filter-select:focus { border-color: #667EEA; }

        /* Table */
        .table-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          overflow: hidden;
        }

        table { width: 100%; border-collapse: collapse; }

        thead {
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
        }

        th {
          padding: 13px 20px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        td {
          padding: 14px 20px;
          border-bottom: 1px solid #F3F4F6;
          font-size: 14px;
          vertical-align: middle;
        }

        tr:hover td { background: #F9FAFB; }
        tr:last-child td { border-bottom: none; }

        /* Applicant cell */
        .applicant-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .applicant-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea);
          color: white;
          font-weight: 700;
          font-size: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .applicant-info strong { display: block; color: #111827; }
        .applicant-info .email { display: block; color: #6B7280; font-size: 12px; }
        .applicant-info .phone { display: block; color: #9CA3AF; font-size: 12px; }

        .job-title-badge {
          display: inline-block;
          padding: 4px 10px;
          background: #EEF2FF;
          color: #4338CA;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .date-cell { color: #6B7280; font-size: 13px; }

        .status-select {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .view-btn {
          padding: 7px 14px;
          background: #EEF2FF;
          color: #4338CA;
          border: none;
          border-radius: 7px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: background 0.2s;
        }

        .view-btn:hover { background: #DDD6FE; }

        /* Empty */
        .empty-cell {
          text-align: center;
          padding: 60px 20px !important;
          color: #9CA3AF;
        }
        .empty-cell span { font-size: 48px; display: block; margin-bottom: 12px; }
        .empty-cell p { font-size: 16px; margin: 0 0 4px 0; font-weight: 500; }
        .empty-cell small { font-size: 13px; }

        /* Loading */
        .loading { text-align: center; padding: 80px; color: #666; }
        .spinner {
          width: 40px; height: 40px;
          border: 3px solid #F3F4F6;
          border-top-color: #667EEA;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 900px) {
          .stats-row { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
};

export default AllApplicants;
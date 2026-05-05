import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000';

const EXPERIENCE_OPTIONS = ['Entry Level', 'Mid Level', 'Senior Level', 'Lead', 'Manager'];
const JOB_TYPE_OPTIONS   = [{ v:'Job', l:'Full-time Job' }, { v:'Internship', l:'Internship' }, { v:'Parttime', l:'Part-time' }];
const WORK_MODE_OPTIONS  = ['Onsite', 'Remote', 'Hybrid'];

const EMPTY_FORM = {
  title: '', description: '', requiredSkills: '',
  experienceLevel: 'Entry Level', location: '',
  jobType: 'Job', workMode: 'Onsite', deadline: '', salaryRange: ''
};

// ── helpers ──────────────────────────────────────────────────────────────────
const statusColor = { Open: '#10B981', Closed: '#EF4444' };
const statusBg    = { Open: '#ECFDF5', Closed: '#FEF2F2' };
const typeIcon    = { Job: '💼', Internship: '🎓', Parttime: '⏰' };

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const isExpired = (deadline) => {
  if (!deadline) return false;
  return new Date(deadline) < new Date(new Date().toDateString());
};

// ── Main component ────────────────────────────────────────────────────────────
const ManageJobs = ({ user, onViewApplicants }) => {
  const [jobs,       setJobs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [editJob,    setEditJob]    = useState(null);  // job being edited
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [msg,        setMsg]        = useState({ type: '', text: '' });
  const [filter,     setFilter]     = useState('All'); // All | Open | Closed

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/api/jobs/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setJobs(data.jobs || []);
    } catch (_) {} finally { setLoading(false); }
  };

  // ── Open edit modal ──
  const openEdit = (job) => {
    setEditJob(job);
    setForm({
      title:           job.Title          || '',
      description:     job.Description    || '',
      requiredSkills:  job.RequiredSkills  || '',
      experienceLevel: job.ExperienceLevel || 'Entry Level',
      location:        job.Location        || '',
      jobType:         job.JobType         || 'Job',
      workMode:        job.WorkMode        || 'Onsite',
      deadline:        job.Deadline ? job.Deadline.substring(0, 10) : '',
      salaryRange:     job.SalaryRange     || '',
    });
    setMsg({ type: '', text: '' });
  };

  const closeEdit = () => { setEditJob(null); setMsg({ type: '', text: '' }); };

  // ── Save edit ──
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg({ type: '', text: '' });
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/api/jobs/${editJob.JobID}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: '✅ Job updated successfully!' });
        fetchJobs();
        setTimeout(closeEdit, 1200);
      } else {
        setMsg({ type: 'error', text: '❌ ' + data.message });
      }
    } catch (_) {
      setMsg({ type: 'error', text: '❌ Network error' });
    } finally { setSaving(false); }
  };

  // ── Toggle Open ↔ Closed ──
  const handleToggleStatus = async (job) => {
    setTogglingId(job.JobID);
    const newStatus = job.Status === 'Open' ? 'Closed' : 'Open';
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/api/jobs/${job.JobID}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setJobs(prev => prev.map(j =>
          j.JobID === job.JobID ? { ...j, Status: newStatus } : j
        ));
      }
    } catch (_) {} finally { setTogglingId(null); }
  };

  const filtered = filter === 'All' ? jobs : jobs.filter(j => j.Status === filter);

  return (
    <div className="mj-root">
      {/* Header */}
      <div className="mj-header">
        <div>
          <h2>Manage Jobs</h2>
          <p>Edit, close, or reopen your job postings</p>
        </div>
        <div className="mj-filter-row">
          {['All', 'Open', 'Closed'].map(f => (
            <button
              key={f}
              className={`mj-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
              <span className="mj-filter-count">
                {f === 'All' ? jobs.length : jobs.filter(j => j.Status === f).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Job List */}
      {loading ? (
        <div className="mj-loading">
          {[1,2,3].map(i => <div key={i} className="mj-skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mj-empty">
          <span>📋</span>
          <p>{filter === 'All' ? 'No jobs posted yet.' : `No ${filter.toLowerCase()} jobs.`}</p>
        </div>
      ) : (
        <div className="mj-list">
          {filtered.map(job => (
            <div key={job.JobID} className={`mj-card ${job.Status === 'Closed' ? 'closed' : ''}`}>

              {/* Left: Logo */}
              <div className="mj-logo">
                {(job.CompanyName || job.Title || 'J').charAt(0).toUpperCase()}
              </div>

              {/* Center: Info */}
              <div className="mj-info">
                <div className="mj-top-row">
                  <h4 className="mj-title">{job.Title}</h4>
                  <span
                    className="mj-status-badge"
                    style={{ color: statusColor[job.Status] || '#6B7280', background: statusBg[job.Status] || '#F3F4F6' }}
                  >
                    {job.Status === 'Open'  } {job.Status}
                  </span>
                  {isExpired(job.Deadline) && job.Status === 'Open' && (
                    <span className="mj-expired-tag">⏰ Deadline Passed</span>
                  )}
                </div>

                <div className="mj-meta">
                  <span> {job.JobType}</span>
                  <span> {job.WorkMode}</span>
                  <span>📍 {job.Location || '—'}</span>
                  {job.SalaryRange && <span> {job.SalaryRange}</span>}
                  <span>📅 Deadline: {fmtDate(job.Deadline)}</span>
                  <span className="mj-applicant-count">
                    👥 {job.applicantCount ?? 0} applicant{(job.applicantCount ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>

                {job.RequiredSkills && (
                  <div className="mj-skills">
                    {job.RequiredSkills.split(',').slice(0, 5).map((s, i) => (
                      <span key={i} className="mj-skill-tag">{s.trim()}</span>
                    ))}
                    {job.RequiredSkills.split(',').length > 5 && (
                      <span className="mj-skill-more">+{job.RequiredSkills.split(',').length - 5} more</span>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Actions */}
              <div className="mj-actions">
                <button
                  className="mj-btn-applicants"
                  onClick={() => onViewApplicants(job.JobID)}
                >
                  View Applicants
                </button>
                <button
                  className="mj-btn-edit"
                  onClick={() => openEdit(job)}
                >
                   Edit Job
                </button>
                <button
                  className={`mj-btn-toggle ${job.Status === 'Open' ? 'close' : 'reopen'}`}
                  onClick={() => handleToggleStatus(job)}
                  disabled={togglingId === job.JobID}
                >
                  {togglingId === job.JobID
                    ? '⏳'
                    : job.Status === 'Open' ? '🔒 Close' : '🔓 Reopen'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editJob && (
        <div className="mj-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeEdit()}>
          <div className="mj-modal">
            {/* Modal Header */}
            <div className="mj-modal-hdr">
              <div>
                <h3>Edit Job Posting</h3>
                <p>{editJob.Title}</p>
              </div>
              <button className="mj-modal-close" onClick={closeEdit}>✕</button>
            </div>

            {msg.text && (
              <div className={`mj-msg ${msg.type}`}>{msg.text}</div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSave} className="mj-form">
              <div className="mj-form-group mj-full">
                <label>Job Title *</label>
                <input
                  required value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Senior Frontend Developer"
                />
              </div>

              <div className="mj-form-group mj-full">
                <label>Description</label>
                <textarea
                  rows={4} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the role and responsibilities..."
                />
              </div>

              <div className="mj-form-group mj-full">
                <label>Required Skills (comma separated)</label>
                <input
                  value={form.requiredSkills}
                  onChange={e => setForm(f => ({ ...f, requiredSkills: e.target.value }))}
                  placeholder="e.g. React, Node.js, SQL"
                />
              </div>

              <div className="mj-form-row">
                <div className="mj-form-group">
                  <label>Experience Level</label>
                  <select value={form.experienceLevel} onChange={e => setForm(f => ({ ...f, experienceLevel: e.target.value }))}>
                    {EXPERIENCE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="mj-form-group">
                  <label>Location *</label>
                  <input
                    required value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Lahore, Pakistan"
                  />
                </div>
              </div>

              <div className="mj-form-row">
                <div className="mj-form-group">
                  <label>Job Type</label>
                  <select value={form.jobType} onChange={e => setForm(f => ({ ...f, jobType: e.target.value }))}>
                    {JOB_TYPE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
                <div className="mj-form-group">
                  <label>Work Mode</label>
                  <select value={form.workMode} onChange={e => setForm(f => ({ ...f, workMode: e.target.value }))}>
                    {WORK_MODE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="mj-form-row">
                <div className="mj-form-group">
                  <label>Application Deadline</label>
                  <input
                    type="date" value={form.deadline}
                    onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  />
                </div>
                <div className="mj-form-group">
                  <label>Salary Range</label>
                  <input
                    value={form.salaryRange}
                    onChange={e => setForm(f => ({ ...f, salaryRange: e.target.value }))}
                    placeholder="e.g. $60,000 - $80,000"
                  />
                </div>
              </div>

              <div className="mj-modal-footer">
                <button type="button" className="mj-btn-cancel" onClick={closeEdit}>Cancel</button>
                <button type="submit" className="mj-btn-save" disabled={saving}>
                  {saving ? '⏳ Saving…' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .mj-root { display: flex; flex-direction: column; gap: 16px; }

        /* Header */
        .mj-header {
          display: flex; align-items: flex-start;
          justify-content: space-between; flex-wrap: wrap; gap: 12px;
        }
        .mj-header h2 { font-size: 24px; font-weight: 700; color: #0F172A; margin: 0 0 4px; }
        .mj-header p  { color: #64748B; margin: 0; font-size: 14px; }

        .mj-filter-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .mj-filter-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 16px; border-radius: 20px;
          border: 1.5px solid #E2E8F0;
          background: #F8FAFC; color: #475569;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.15s;
        }
        .mj-filter-btn:hover  { border-color: #667eea; color: #4338CA; }
        .mj-filter-btn.active { background: #EEF2FF; color: #4338CA; border-color: #C7D2FE; font-weight: 600; }
        .mj-filter-count {
          background: #E0E7FF; color: #4338CA;
          border-radius: 10px; padding: 1px 7px; font-size: 11px; font-weight: 700;
        }

        /* Loading / Empty */
        .mj-loading { display: flex; flex-direction: column; gap: 12px; }
        .mj-skeleton {
          height: 110px; border-radius: 14px;
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%; animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .mj-empty { text-align: center; padding: 60px 0; color: #94A3B8; }
        .mj-empty span { font-size: 44px; display: block; margin-bottom: 10px; }
        .mj-empty p    { font-size: 15px; margin: 0; }

        /* Job cards */
        .mj-list { display: flex; flex-direction: column; gap: 12px; }
        .mj-card {
          background: #fff; border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          display: flex; align-items: flex-start; gap: 16px;
          border: 2px solid transparent;
          transition: all 0.2s;
        }
        .mj-card:hover { border-color: #C7D2FE; box-shadow: 0 4px 16px rgba(102,126,234,0.1); }
        .mj-card.closed { opacity: 0.75; background: #FAFAFA; }

        .mj-logo {
          width: 46px; height: 46px; border-radius: 12px;
          background: linear-gradient(135deg, #667eea );
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 700; font-size: 18px; flex-shrink: 0;
        }

        .mj-info { flex: 1; min-width: 0; }
        .mj-top-row {
          display: flex; align-items: center; gap: 10px;
          flex-wrap: wrap; margin-bottom: 8px;
        }
        .mj-title { font-size: 15px; font-weight: 600; color: #1E293B; margin: 0; flex: 1; min-width: 0; }
        .mj-status-badge {
          padding: 4px 12px; border-radius: 20px;
          font-size: 12px; font-weight: 600; white-space: nowrap;
        }
        .mj-expired-tag {
          padding: 3px 10px; border-radius: 12px;
          background: #FEF3C7; color: #92400E;
          font-size: 11px; font-weight: 600;
        }

        .mj-meta {
          display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px;
        }
        .mj-meta span { font-size: 12px; color: #64748B; }
        .mj-applicant-count { color: #4338CA !important; font-weight: 600 !important; }

        .mj-skills { display: flex; flex-wrap: wrap; gap: 6px; }
        .mj-skill-tag {
          padding: 3px 10px; background: #F1F5F9; color: #475569;
          border-radius: 20px; font-size: 11px; font-weight: 500;
        }
        .mj-skill-more { font-size: 11px; color: #94A3B8; padding: 3px 0; }

        /* Actions */
        .mj-actions {
          display: flex; flex-direction: column; gap: 8px;
          flex-shrink: 0; min-width: 110px;
        }
        .mj-btn-applicants {
          padding: 8px 12px; border-radius: 8px;
          background: #EEF2FF; color: #4338CA;
          border: 1px solid #C7D2FE;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.15s; text-align: center;
        }
        .mj-btn-applicants:hover { background: #E0E7FF; }

        .mj-btn-edit {
          padding: 8px 12px; border-radius: 8px;
          background: #F0FDF4; color: #166534;
          border: 1px solid #A7F3D0;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.15s; text-align: center;
        }
        .mj-btn-edit:hover { background: #DCFCE7; }

        .mj-btn-toggle {
          padding: 8px 12px; border-radius: 8px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.15s; text-align: center;
          border: 1px solid;
        }
        .mj-btn-toggle.close  { background: #FEF2F2; color: #991B1B; border-color: #FECACA; }
        .mj-btn-toggle.close:hover  { background: #FEE2E2; }
        .mj-btn-toggle.reopen { background: #ECFDF5; color: #065F46; border-color: #A7F3D0; }
        .mj-btn-toggle.reopen:hover { background: #D1FAE5; }
        .mj-btn-toggle:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Modal */
        .mj-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15,23,42,0.5);
          backdrop-filter: blur(2px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px;
        }
        .mj-modal {
          background: #fff; border-radius: 18px;
          width: 100%; max-width: 680px; max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }

        .mj-modal-hdr {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 22px 26px 0; margin-bottom: 16px;
        }
        .mj-modal-hdr h3 { font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 4px; }
        .mj-modal-hdr p  { font-size: 13px; color: #64748B; margin: 0; }
        .mj-modal-close {
          background: none; border: none; cursor: pointer;
          color: #94A3B8; font-size: 18px; padding: 4px 8px;
          border-radius: 6px; transition: all 0.15s;
        }
        .mj-modal-close:hover { background: #F1F5F9; color: #475569; }

        .mj-msg {
          margin: 0 26px 12px;
          padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
        }
        .mj-msg.success { background: #ECFDF5; color: #065F46; }
        .mj-msg.error   { background: #FEF2F2; color: #991B1B; }

        /* Form */
        .mj-form { padding: 0 26px 26px; display: flex; flex-direction: column; gap: 16px; }
        .mj-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .mj-form-group { display: flex; flex-direction: column; gap: 6px; }
        .mj-full { grid-column: 1 / -1; }

        .mj-form-group label { font-size: 13px; font-weight: 600; color: #374151; }
        .mj-form-group input,
        .mj-form-group textarea,
        .mj-form-group select {
          padding: 10px 12px;
          border: 1.5px solid #E2E8F0; border-radius: 8px;
          font-size: 14px; color: #1E293B;
          font-family: inherit; resize: vertical;
          transition: border-color 0.15s;
        }
        .mj-form-group input:focus,
        .mj-form-group textarea:focus,
        .mj-form-group select:focus { outline: none; border-color: #667eea; }

        .mj-modal-footer {
          display: flex; gap: 12px; justify-content: flex-end;
          padding-top: 8px;
        }
        .mj-btn-cancel {
          padding: 10px 22px; border-radius: 8px;
          border: 1.5px solid #E2E8F0; background: #fff;
          font-size: 14px; font-weight: 500; color: #64748B; cursor: pointer;
          transition: all 0.15s;
        }
        .mj-btn-cancel:hover { border-color: #94A3B8; color: #374151; }
        .mj-btn-save {
          padding: 10px 28px; border-radius: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff; border: none;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: opacity 0.2s;
        }
        .mj-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .mj-btn-save:not(:disabled):hover { opacity: 0.88; }

        @media (max-width: 700px) {
          .mj-card { flex-wrap: wrap; }
          .mj-actions { flex-direction: row; flex-wrap: wrap; min-width: unset; width: 100%; }
          .mj-form-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default ManageJobs;
import React, { useState, useEffect, useCallback } from 'react';

const FindJobs = ({ user }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState('All Types');
  const [workMode, setWorkMode] = useState('All');
  const [applyingId, setApplyingId] = useState(null);
  const [applyMsg, setApplyMsg] = useState({ id: null, type: '', text: '' });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search)  params.append('search',  search);
      if (jobType !== 'All Types') params.append('jobType', jobType);
      if (workMode !== 'All')      params.append('workMode', workMode);

      const url = token
        ? `http://localhost:5000/api/jobs/search?${params}`
        : `http://localhost:5000/api/jobs?${params}`;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) setJobs(data.jobs || []);
    } catch (_) {} finally { setLoading(false); }
  }, [search, jobType, workMode]);

  useEffect(() => {
    const t = setTimeout(fetchJobs, 300);
    return () => clearTimeout(t);
  }, [fetchJobs]);

  const handleApply = async (job) => {
    if (job.hasApplied) return;
    setApplyingId(job.JobID);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/applications', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.JobID, coverNote: '' })
      });
      const data = await res.json();
      if (data.success) {
        setApplyMsg({ id: job.JobID, type: 'success', text: 'Applied successfully!' });
        setJobs(prev => prev.map(j => j.JobID === job.JobID ? { ...j, hasApplied: true } : j));
      } else {
        setApplyMsg({ id: job.JobID, type: 'error', text: data.message || 'Failed to apply' });
      }
    } catch (_) {
      setApplyMsg({ id: job.JobID, type: 'error', text: 'Network error' });
    } finally {
      setApplyingId(null);
      setTimeout(() => setApplyMsg({ id: null, type: '', text: '' }), 3000);
    }
  };

  const matchColor = (pct) => pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : pct >= 40 ? '#3B82F6' : '#94A3B8';
  const matchBg    = (pct) => pct >= 80 ? '#ECFDF5' : pct >= 60 ? '#FFFBEB' : pct >= 40 ? '#EFF6FF' : '#F1F5F9';

  const jobTypeIcons = { Job: '💼', Internship: '🎓', Parttime: '⏰' };
  const workModeIcons = { Remote: '🏠', Onsite: '🏢', Hybrid: '🔄' };

  return (
    <div className="fj-root">
      {/* Header */}
      <div className="fj-header">
        <div>
          <h2>Find Jobs</h2>
          <p>Discover opportunities that match your skills and preferences</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="fj-filters-bar">
        <div className="fj-search-wrap">
          <span className="fj-search-icon">🔍</span>
          <input
            className="fj-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by job title, skills, or company..."
          />
        </div>
        <div className="fj-filter-chips">
          {['All Types', 'Job', 'Internship', 'Parttime'].map(t => (
            <button
              key={t}
              className={`fj-chip ${jobType === t ? 'active' : ''}`}
              onClick={() => setJobType(t)}
            >{t}</button>
          ))}
          <div className="fj-divider" />
          {['All', 'Remote', 'Onsite', 'Hybrid'].map(m => (
            <button
              key={m}
              className={`fj-chip ${workMode === m ? 'active' : ''}`}
              onClick={() => setWorkMode(m)}
            >{m === 'All' ? 'All Modes' : m}</button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="fj-results-bar">
        {loading
          ? 'Searching…'
          : `Showing ${jobs.length} job${jobs.length !== 1 ? 's' : ''}`}
        <span className="fj-sort-label">Most Relevant</span>
      </div>

      {/* Job List */}
      {loading ? (
        <div className="fj-loading">
          {[1,2,3].map(i => <div key={i} className="fj-skeleton" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="fj-empty">
          <span>🔍</span>
          <p>No jobs found. Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="fj-list">
          {jobs.map(job => {
            const matchPct = job.matchPercent ?? null;
            return (
              <div key={job.JobID} className="fj-card">
                {/* Match badge */}
                {matchPct !== null && (
                  <div
                    className="fj-match-badge"
                    style={{ background: matchColor(matchPct), color: '#fff' }}
                  >
                    {matchPct}%<br /><span>Match</span>
                  </div>
                )}

                <div className="fj-card-top">
                  <div className="fj-company-logo">
                    {(job.CompanyName || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="fj-job-main">
                    <h3 className="fj-job-title">{job.Title}</h3>
                    <p className="fj-company-name">{job.CompanyName}</p>
                  </div>
                  <div className="fj-type-badge">
                     {job.JobType}
                  </div>
                </div>

                <div className="fj-meta">
                  <span> {job.WorkMode}</span>
                  <span>📍 {job.Location || 'Not specified'}</span>
                  {job.ExperienceLevel && <span> {job.ExperienceLevel}</span>}
                  {job.SalaryRange     && <span> {job.SalaryRange}</span>}
                </div>

                {job.Description && (
                  <p className="fj-desc">
                    {job.Description.length > 160 ? job.Description.slice(0, 160) + '…' : job.Description}
                  </p>
                )}

                {job.RequiredSkills && (
                  <div className="fj-skills">
                    <strong>Required Skills:</strong>
                    <div className="fj-skill-list">
                      {job.RequiredSkills.split(',').map((s, i) => (
                        <span key={i} className="fj-skill-tag">{s.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}

                {applyMsg.id === job.JobID && applyMsg.text && (
                  <div className={`fj-apply-msg ${applyMsg.type}`}>{applyMsg.text}</div>
                )}

                <div className="fj-card-footer">
                  <div className="fj-footer-meta">
                    {job.Deadline && (
                      <span className="fj-deadline">
                        📅 Deadline: {new Date(job.Deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="fj-actions">
                    {job.hasApplied ? (
                      <span className="fj-applied-badge">Applied</span>
                    ) : (
                      <button
                        className="fj-apply-btn"
                        onClick={() => handleApply(job)}
                        disabled={applyingId === job.JobID}
                      >
                        {applyingId === job.JobID ? 'Applying…' : 'Apply Now'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .fj-root { display: flex; flex-direction: column; gap: 16px; }
        .fj-header h2  { font-size: 24px; font-weight: 700; color: #0F172A; margin: 0 0 4px; }
        .fj-header p   { color: #64748B; margin: 0; font-size: 14px; }

        /* Filters */
        .fj-filters-bar {
          background: #fff; border-radius: 12px;
          padding: 16px 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          display: flex; flex-direction: column; gap: 12px;
        }
        .fj-search-wrap {
          display: flex; align-items: center; gap: 10px;
          background: #F8FAFC; border: 1.5px solid #E2E8F0;
          border-radius: 8px; padding: 0 14px;
          transition: border-color 0.15s;
        }
        .fj-search-wrap:focus-within { border-color: #667eea; }
        .fj-search-icon { font-size: 16px; color: #94A3B8; }
        .fj-search-input {
          flex: 1; padding: 10px 0; border: none; background: transparent;
          font-size: 14px; color: #1E293B; font-family: inherit;
        }
        .fj-search-input:focus { outline: none; }

        .fj-filter-chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .fj-chip {
          padding: 6px 14px; border-radius: 20px;
          border: 1.5px solid #E2E8F0;
          background: #F8FAFC; color: #475569;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.15s;
        }
        .fj-chip:hover  { border-color: #667eea; color: #4338CA; }
        .fj-chip.active { background: #EEF2FF; color: #4338CA; border-color: #C7D2FE; font-weight: 600; }
        .fj-divider { width: 1px; height: 20px; background: #E2E8F0; margin: 0 4px; }

        /* Results */
        .fj-results-bar {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 14px; color: #64748B; padding: 0 4px;
        }
        .fj-sort-label { font-size: 13px; color: #94A3B8; }

        /* Loading / Empty */
        .fj-loading { display: flex; flex-direction: column; gap: 16px; }
        .fj-skeleton {
          height: 180px; background: #fff; border-radius: 14px;
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 200% 100%; animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .fj-empty { text-align: center; padding: 60px 0; color: #94A3B8; }
        .fj-empty span { font-size: 48px; display: block; margin-bottom: 12px; }
        .fj-empty p    { font-size: 15px; margin: 0; }

        /* Job Card */
        .fj-list { display: flex; flex-direction: column; gap: 16px; }
        .fj-card {
          background: #fff; border-radius: 14px;
          padding: 22px 24px; position: relative;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          border: 2px solid transparent;
          transition: all 0.2s;
        }
        .fj-card:hover { border-color: #C7D2FE; box-shadow: 0 6px 24px rgba(102,126,234,0.12); transform: translateY(-1px); }

        /* Match badge */
        .fj-match-badge {
          position: absolute; top: 18px; right: 18px;
          width: 52px; height: 52px; border-radius: 50%;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; line-height: 1.2; text-align: center;
        }
        .fj-match-badge span { font-size: 9px; font-weight: 500; }

        .fj-card-top {
          display: flex; align-items: center; gap: 14px; margin-bottom: 12px;
          padding-right: 60px;
        }
        .fj-company-logo {
          width: 46px; height: 46px; border-radius: 12px;
          background: linear-gradient(135deg, #4719b4);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 700; font-size: 18px; flex-shrink: 0;
        }
        .fj-job-main { flex: 1; }
        .fj-job-title    { font-size: 16px; font-weight: 600; color: #1E293B; margin: 0 0 2px; }
        .fj-company-name { font-size: 13px; color: #64748B; margin: 0; }
        .fj-type-badge {
          padding: 5px 12px; background: #E0E7FF; color: #4338CA;
          border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap;
        }

        .fj-meta {
          display: flex; flex-wrap: wrap; gap: 14px;
          margin-bottom: 12px; padding-bottom: 12px;
          border-bottom: 1px solid #F1F5F9;
        }
        .fj-meta span { font-size: 15px; color: #0c0e11; }

        .fj-desc { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 12px; }

        .fj-skills strong { font-size: 15px; color: #374151; display: block; margin-bottom: 8px; }
        .fj-skill-list    { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .fj-skill-tag {
          padding: 4px 12px; background: #F1F5F9; color: #1b1e22;
          border-radius: 10px; font-size: 14px; font-weight: 500;
        }

        .fj-apply-msg {
          padding: 8px 12px; border-radius: 8px;
          font-size: 13px; font-weight: 500; margin-bottom: 10px;
        }
        .fj-apply-msg.success { background: #ECFDF5; color: #065F46; }
        .fj-apply-msg.error   { background: #FEF2F2; color: #991B1B; }

        .fj-card-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 12px; border-top: 1px solid #F1F5F9; flex-wrap: wrap; gap: 10px;
        }
        .fj-footer-meta { display: flex; gap: 14px; }
        .fj-deadline { font-size: 12px; color: #EF4444; font-weight: 500; }
        .fj-actions  { display: flex; gap: 10px; align-items: center; }

        .fj-apply-btn {
          padding: 9px 22px;
          background: linear-gradient(135deg, #667eea );
          color: #fff; border: none; border-radius: 8px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all 0.2s;
        }
        .fj-apply-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .fj-apply-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .fj-applied-badge {
          padding: 8px 16px;
          background: #DCFCE7; color: #166534;
          border-radius: 8px; font-size: 13px; font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default FindJobs;
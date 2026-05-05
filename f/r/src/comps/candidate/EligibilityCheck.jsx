import React, { useState, useEffect } from 'react';

const EligibilityCheck = ({ user }) => {
  const [jobs,          setJobs]          = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [checking,      setChecking]      = useState(false);
  const [result,        setResult]        = useState(null);
  const [error,         setError]         = useState('');

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      const res  = await fetch('http://localhost:5000/api/jobs');
      const data = await res.json();
      if (data.success) setJobs(data.jobs || []);
    } catch (_) {}
  };

  const handleCheck = async () => {
    if (!selectedJobId) return;
    setChecking(true); setResult(null); setError('');
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch('http://localhost:5000/api/eligibility/check', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jobId: parseInt(selectedJobId) })
      });
      const data = await res.json();
      if (data.success) setResult(data.result);
      else setError(data.message || 'Check failed');
    } catch (_) {
      setError('Network error. Please try again.');
    } finally { setChecking(false); }
  };

  const gaugeColor = pct => pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : pct >= 40 ? '#3B82F6' : '#EF4444';
  const gaugeLabel = pct => pct >= 80 ? 'Excellent Match' : pct >= 60 ? 'Good Match' : pct >= 40 ? 'Partial Match' : 'Low Match';
  const circumference = 2 * Math.PI * 52;

  // Determine per-skill status for bar chart (matched / partial / missing)
  const getSkillStatus = (skill, result) => {
    const lo = s => s.toLowerCase();
    if (result.matchedSkills.some(s => lo(s) === lo(skill)))  return 'matched';
    if (result.partialSkills?.some(s => lo(s) === lo(skill))) return 'partial';
    return 'missing';
  };

  return (
    <div className="ec-root">
      {/* Header */}
      <div className="ec-header">
        <h2>Hirely Eligibility Check</h2>
        <p>NLP-powered skill matching — checks synonyms, fuzzy matches, and stem variants</p>
      </div>

      {/* Selector */}
      <div className="ec-card ec-selector-card">
        <div className="ec-selector-icon">🎯</div>
        <h3>Select a Job Position</h3>
        <p>Choose a job to check your AI match score</p>

        <div className="ec-select-row">
          <div className="ec-select-wrap">
            <label>Job Position</label>
            <select
              value={selectedJobId}
              onChange={e => { setSelectedJobId(e.target.value); setResult(null); setError(''); }}
            >
              <option value="">Select a job to analyze…</option>
              {jobs.map(j => (
                <option key={j.JobID} value={j.JobID}>
                  {j.Title} – {j.CompanyName}
                </option>
              ))}
            </select>
          </div>
          <button
            className="ec-check-btn"
            onClick={handleCheck}
            disabled={!selectedJobId || checking}
          >
            {checking ? '⏳ Analyzing…' : '🔎 Check Eligibility'}
          </button>
        </div>

        {error && <div className="ec-error">{error}</div>}
      </div>

      {/* Results */}
      {result && (
        <div className="ec-results">

          {/* Gauge */}
          <div className="ec-card ec-gauge-card">
            <h3>{result.jobTitle}</h3>
            <div className="ec-gauge-wrap">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="52" fill="none" stroke="#E2E8F0" strokeWidth="12" />
                <circle
                  cx="70" cy="70" r="52" fill="none"
                  stroke={gaugeColor(result.matchPercent)}
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (result.matchPercent / 100) * circumference}
                  strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                  style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                />
                <text x="70" y="63" textAnchor="middle" fontSize="24" fontWeight="700" fill={gaugeColor(result.matchPercent)}>
                  {result.matchPercent}%
                </text>
                <text x="70" y="80" textAnchor="middle" fontSize="10" fill="#94A3B8">Match Score</text>
              </svg>
            </div>
            <div
              className="ec-eligibility-label"
              style={{ background: result.eligible ? '#ECFDF5' : '#FEF2F2', color: result.eligible ? '#065F46' : '#991B1B' }}
            >
              {result.eligible ? '✅ You are Eligible to Apply' : '⚠️ Below Eligibility Threshold (60%)'}
            </div>
            <p className="ec-gauge-sub">{gaugeLabel(result.matchPercent)}</p>

            {/* Score legend */}
            <div className="ec-score-legend">
              <span className="leg-item"><span className="leg-dot" style={{background:'#10B981'}}/>Matched ({result.matchedSkills.length})</span>
              {result.partialSkills?.length > 0 &&
                <span className="leg-item"><span className="leg-dot" style={{background:'#F59E0B'}}/>Close ({result.partialSkills.length})</span>
              }
              <span className="leg-item"><span className="leg-dot" style={{background:'#EF4444'}}/>Missing ({result.missingSkills.length})</span>
            </div>
          </div>

          {/* Skills Breakdown */}
          <div className="ec-card ec-skills-card">
            <h3>Skills Breakdown</h3>

            {result.requiredSkills.length === 0 ? (
              <p className="ec-no-skills">No specific skills listed for this job.</p>
            ) : (
              <>
                {/* Matched */}
                <div className="ec-skills-section">
                  <span className="ec-badge green">✓ Matched Skills ({result.matchedSkills.length})</span>
                  {result.matchedSkills.length === 0
                    ? <p className="ec-no-skills">None matched yet.</p>
                    : <div className="ec-skill-tags">
                        {result.matchedSkills.map((s, i) => (
                          <span key={i} className="ec-skill-tag matched">{s}</span>
                        ))}
                      </div>
                  }
                </div>

                {/* Partial — NLP "close but not quite" */}
                {result.partialSkills?.length > 0 && (
                  <div className="ec-skills-section">
                    <span className="ec-badge amber">≈ Close Matches ({result.partialSkills.length})</span>
                    <p className="ec-partial-hint">NLP detected a partial match. Adding these exact skills will improve your score.</p>
                    <div className="ec-skill-tags">
                      {result.partialSkills.map((s, i) => (
                        <span key={i} className="ec-skill-tag partial">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing */}
                <div className="ec-skills-section">
                  <span className="ec-badge red">✕ Missing Skills ({result.missingSkills.length})</span>
                  {result.missingSkills.length === 0
                    ? <p className="ec-no-skills">🎉 No fully missing skills!</p>
                    : <>
                        <div className="ec-skill-tags">
                          {result.missingSkills.map((s, i) => (
                            <span key={i} className="ec-skill-tag missing">{s}</span>
                          ))}
                        </div>
                        <p className="ec-missing-hint">💡 Add these to your profile to boost your match score.</p>
                      </>
                  }
                </div>
              </>
            )}
          </div>

          {/* Per-skill bars */}
          {result.requiredSkills.length > 0 && (
            <div className="ec-card ec-breakdown-card">
              <h3>Skill-by-Skill Analysis</h3>
              <div className="ec-skill-bars">
                {result.requiredSkills.map((skill, i) => {
                  const status = getSkillStatus(skill, result);
                  const barColor  = status === 'matched' ? '#10B981' : status === 'partial' ? '#F59E0B' : '#E2E8F0';
                  const barWidth  = status === 'matched' ? '100%'    : status === 'partial' ? '55%'    : '0%';
                  const icon      = status === 'matched' ? '✓'       : status === 'partial' ? '≈'      : '✕';
                  const iconColor = status === 'matched' ? '#10B981' : status === 'partial' ? '#F59E0B' : '#EF4444';
                  return (
                    <div key={i} className="ec-skill-bar-row">
                      <span className="ec-bar-label">{skill}</span>
                      <div className="ec-bar-track">
                        <div className="ec-bar-fill" style={{ width: barWidth, background: barColor }} />
                      </div>
                      <span className="ec-bar-icon" style={{ color: iconColor }}>{icon}</span>
                      <span className="ec-bar-status-text" style={{ color: iconColor }}>
                        {status === 'matched' ? 'Matched' : status === 'partial' ? 'Partial' : 'Missing'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="ec-bar-legend">
                <span><span className="leg-dot" style={{background:'#10B981'}}/>Full match (100%)</span>
                <span><span className="leg-dot" style={{background:'#F59E0B'}}/>Partial / close match (55%)</span>
                <span><span className="leg-dot" style={{background:'#E2E8F0'}}/>Not matched (0%)</span>
              </div>
            </div>
          )}

          {/* CTA */}
          {result.eligible && (
            <div className="ec-card ec-cta-card">
              <div>
                <strong>You're a great fit!</strong>
                <p>Your skills match well. Go to Find Jobs to apply now.</p>
              </div>
            </div>
          )}

          {!result.eligible && (result.partialSkills?.length > 0 || result.missingSkills.length > 0) && (
            <div className="ec-card ec-improve-card">
              <div>
                <strong>How to reach 60%?</strong>
                <p>
                  Add {result.missingSkills.slice(0, 3).join(', ')}
                  {result.partialSkills?.length > 0 ? ` and refine ${result.partialSkills.slice(0, 2).join(', ')}` : ''}
                  {' '}to your profile.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .ec-root { display: flex; flex-direction: column; gap: 20px; }
        .ec-header h2 { font-size: 24px; font-weight: 700; color: #0F172A; margin: 0 0 4px; }
        .ec-header p  { color: #64748B; margin: 0; font-size: 14px; }

        .ec-card {
          background: #fff; border-radius: 14px;
          padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .ec-card h3 { font-size: 16px; font-weight: 600; color: #1E293B; margin: 0 0 16px; }

        /* Selector */
        .ec-selector-card { text-align: center; padding: 36px 28px; }
        .ec-selector-icon { font-size: 48px; margin-bottom: 12px; }
        .ec-selector-card h3 { font-size: 20px; margin-bottom: 6px; }
        .ec-selector-card p  { color: #64748B; font-size: 14px; margin: 0 0 24px; }
        .ec-select-row {
          display: flex; gap: 12px; align-items: flex-end;
          max-width: 620px; margin: 0 auto; flex-wrap: wrap; justify-content: center;
        }
        .ec-select-wrap { flex: 1; min-width: 260px; display: flex; flex-direction: column; gap: 6px; text-align: left; }
        .ec-select-wrap label { font-size: 13px; font-weight: 500; color: #374151; }
        .ec-select-wrap select {
          padding: 10px 12px; border: 1.5px solid #E2E8F0; border-radius: 8px;
          font-size: 14px; color: #1E293B; background: #fff; cursor: pointer;
          font-family: inherit; transition: border-color 0.15s;
        }
        .ec-select-wrap select:focus { outline: none; border-color: #667eea; }
        .ec-check-btn {
          padding: 11px 28px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff; border: none; border-radius: 8px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: opacity 0.2s; white-space: nowrap;
        }
        .ec-check-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ec-check-btn:not(:disabled):hover { opacity: 0.88; }
        .ec-error {
          margin-top: 14px; padding: 10px 14px;
          background: #FEF2F2; color: #991B1B; border-radius: 8px; font-size: 13px;
        }

        /* Results layout */
        .ec-results { display: flex; flex-direction: column; gap: 16px; }

        /* Gauge */
        .ec-gauge-card { text-align: center; }
        .ec-gauge-wrap { display: flex; justify-content: center; margin: 8px 0 16px; }
        .ec-eligibility-label {
          display: inline-block; padding: 8px 20px; border-radius: 20px;
          font-size: 14px; font-weight: 600; margin-bottom: 8px;
        }
        .ec-gauge-sub { font-size: 13px; color: #64748B; margin: 0 0 16px; }

        /* Score legend */
        .ec-score-legend { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
        .leg-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748B; }
        .leg-dot  { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

        /* Skills */
        .ec-skills-section { margin-bottom: 20px; }
        .ec-skills-section:last-child { margin-bottom: 0; }
        .ec-badge {
          display: inline-block; padding: 5px 12px; border-radius: 20px;
          font-size: 12px; font-weight: 600; margin-bottom: 10px;
        }
        .ec-badge.green { background: #DCFCE7; color: #166534; }
        .ec-badge.amber { background: #FEF9C3; color: #92400E; }
        .ec-badge.red   { background: #FEE2E2; color: #991B1B; }

        .ec-partial-hint { font-size: 12px; color: #92400E; margin: 0 0 8px; }
        .ec-no-skills    { font-size: 13px; color: #94A3B8; margin: 0; }
        .ec-missing-hint { font-size: 13px; color: #64748B; margin: 10px 0 0; }

        .ec-skill-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .ec-skill-tag {
          padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500;
        }
        .ec-skill-tag.matched { background: #DCFCE7; color: #166534; }
        .ec-skill-tag.partial { background: #FEF9C3; color: #92400E; }
        .ec-skill-tag.missing { background: #FEE2E2; color: #991B1B; }

        /* Breakdown bars */
        .ec-skill-bars { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
        .ec-skill-bar-row { display: flex; align-items: center; gap: 10px; }
        .ec-bar-label { font-size: 13px; font-weight: 500; color: #1E293B; width: 130px; flex-shrink: 0; }
        .ec-bar-track { flex: 1; height: 8px; background: #F1F5F9; border-radius: 4px; overflow: hidden; }
        .ec-bar-fill  { height: 100%; border-radius: 4px; transition: width 0.9s ease; }
        .ec-bar-icon  { font-size: 14px; font-weight: 700; width: 18px; text-align: center; flex-shrink: 0; }
        .ec-bar-status-text { font-size: 11px; font-weight: 600; width: 48px; flex-shrink: 0; }

        .ec-bar-legend {
          display: flex; gap: 18px; flex-wrap: wrap;
          border-top: 1px solid #F1F5F9; padding-top: 12px;
        }
        .ec-bar-legend span { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748B; }

        /* CTA / Improve cards */
        .ec-cta-card {
          display: flex; align-items: center; gap: 16px;
          background: linear-gradient(135deg, #ECFDF5 0%, #EFF6FF 100%);
          border: 1.5px solid #A7F3D0;
        }
        .ec-cta-card span { font-size: 36px; flex-shrink: 0; }
        .ec-cta-card strong { display: block; font-size: 15px; color: #065F46; margin-bottom: 4px; }
        .ec-cta-card p { margin: 0; font-size: 13px; color: #047857; }

        .ec-improve-card {
          display: flex; align-items: flex-start; gap: 16px;
          background: #FFFBEB; border: 1.5px solid #FDE68A;
        }
        .ec-improve-card span { font-size: 28px; flex-shrink: 0; margin-top: 2px; }
        .ec-improve-card strong { display: block; font-size: 14px; color: #92400E; margin-bottom: 4px; }
        .ec-improve-card p { margin: 0; font-size: 13px; color: #B45309; }
      `}</style>
    </div>
  );
};

export default EligibilityCheck;
import React, { useState, useEffect } from 'react';

const NODE_API = 'http://localhost:5000';

const InterviewResult = ({ applicationId, candidateName, onBack }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => { fetchResult(); }, [applicationId]);

  const fetchResult = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${NODE_API}/api/interview/result/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) setData(json.result);
      else setError(json.message || 'No interview result found.');
    } catch {
      setError('Failed to load interview result.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="ir-center">
      <div className="ir-spinner" />
      <p style={{ color: '#6B7280', marginTop: 12 }}>Loading interview result…</p>
    </div>
  );

  if (error) return (
    <div className="ir-center">
      <div style={{ fontSize: 40 }}>📭</div>
      <p style={{ color: '#6B7280', marginTop: 8 }}>{error}</p>
      {onBack && <button className="ir-back-btn" onClick={onBack}>← Back</button>}
    </div>
  );

  const { summary, qa } = data;
  const hired = summary.Hired === true || summary.Hired === 1;

  const ScoreBar = ({ label, value, color }) => (
    <div className="ir-score-row">
      <div className="ir-score-label">{label}</div>
      <div className="ir-score-track">
        <div className="ir-score-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <div className="ir-score-val">{Math.round(value)}/100</div>
    </div>
  );

  return (
    <div className="ir-wrap">
      {/* ── Header ── */}
      <div className="ir-header">
        {onBack && (
          <button className="ir-back-btn" onClick={onBack}>← Back</button>
        )}
        <div>
          <h2 className="ir-title">Interview Results</h2>
          <p className="ir-subtitle">{summary.CandidateName || candidateName} · {summary.CandidateEmail}</p>
        </div>
        <div className={`ir-verdict ${hired ? 'hired' : 'not-hired'}`}>
          {hired ? '✅ HIRED' : '❌ NOT HIRED'}
          <span className="ir-confidence">{Math.round(summary.Confidence)}% confidence</span>
        </div>
      </div>

      {/* ── Score summary ── */}
      <div className="ir-scores-card">
        <h3 className="ir-section-title">Score Summary</h3>
        <ScoreBar label="Interview Quality"  value={summary.AvgInterviewScore}    color="linear-gradient(90deg,#667eea,#764ba2)" />
        <ScoreBar label="Skill Match"        value={summary.AvgSkillScore}        color="linear-gradient(90deg,#43e97b,#38f9d7)" />
        <ScoreBar label="Personality Score"  value={summary.AvgPersonalityScore}  color="linear-gradient(90deg,#f093fb,#f5576c)" />

        <div className="ir-prob-row">
          <div className="ir-prob-box green">
            <div className="ir-prob-val">{Math.round(summary.HiringProbability)}%</div>
            <div className="ir-prob-lbl">Hiring Probability</div>
          </div>
          <div className="ir-prob-box red">
            <div className="ir-prob-val">{Math.round(summary.NotHiringProbability)}%</div>
            <div className="ir-prob-lbl">Not Hiring Probability</div>
          </div>
          <div className="ir-prob-box purple">
            <div className="ir-prob-val">{new Date(summary.CompletedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
            <div className="ir-prob-lbl">Completed On</div>
          </div>
        </div>
      </div>

      {/* ── Q&A breakdown ── */}
      <div className="ir-qa-card">
        <h3 className="ir-section-title">Question-by-Question Breakdown</h3>
        {qa.map((item, i) => (
          <div key={item.QAid || i} className="ir-qa-item">
            <div className="ir-qa-top">
              <span className="ir-qa-num">Q{i + 1}</span>
              <p className="ir-qa-question">{item.Question}</p>
            </div>
            <div className="ir-qa-answer">
              <span className="ir-qa-answer-label">Answer</span>
              <p>{item.Answer}</p>
            </div>
            <div className="ir-qa-scores">
              <div className="ir-qa-score-chip blue">
                Quality: {Math.round(item.QualityScore)}/100
              </div>
              <div className="ir-qa-score-chip green">
                Skill: {Math.round(item.SkillScore)}/100
              </div>
              <div className={`ir-qa-feedback-chip ${
                item.SkillScore >= 85 ? 'excellent'
                : item.SkillScore >= 65 ? 'good'
                : item.SkillScore >= 40 ? 'average' : 'weak'
              }`}>
                {item.Feedback}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .ir-wrap {
          max-width: 800px;
          display: flex; flex-direction: column; gap: 20px;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .ir-center {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; min-height: 300px; gap: 12px;
        }
        .ir-spinner {
          width: 36px; height: 36px;
          border: 3px solid #EEF2FF; border-top-color: #667eea;
          border-radius: 50%; animation: ir-spin .8s linear infinite;
        }
        @keyframes ir-spin { to { transform: rotate(360deg); } }

        .ir-header {
          display: flex; align-items: flex-start; gap: 16px;
          background: white; border-radius: 16px; padding: 22px 24px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.07);
          flex-wrap: wrap;
        }
        .ir-title    { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 3px; }
        .ir-subtitle { font-size: 13px; color: #6B7280; margin: 0; }

        .ir-verdict {
          margin-left: auto;
          display: flex; flex-direction: column; align-items: center;
          padding: 12px 20px; border-radius: 12px;
          font-size: 15px; font-weight: 700; gap: 4px;
        }
        .ir-verdict.hired     { background: #ECFDF5; color: #166534; border: 1px solid #BBF7D0; }
        .ir-verdict.not-hired { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
        .ir-confidence { font-size: 11px; font-weight: 400; opacity: .8; }

        .ir-back-btn {
          background: #F1F5F9; border: none; border-radius: 8px;
          padding: 8px 16px; font-size: 13px; font-weight: 600;
          color: #374151; cursor: pointer; transition: background .15s;
          white-space: nowrap; align-self: flex-start;
        }
        .ir-back-btn:hover { background: #E2E8F0; }

        /* Scores card */
        .ir-scores-card, .ir-qa-card {
          background: white; border-radius: 16px;
          padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.07);
        }
        .ir-section-title {
          font-size: 15px; font-weight: 700; color: #111827;
          margin: 0 0 18px;
        }

        .ir-score-row {
          display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
        }
        .ir-score-label { font-size: 13px; color: #374151; width: 140px; flex-shrink: 0; }
        .ir-score-track {
          flex: 1; height: 8px; background: #F1F5F9; border-radius: 99px; overflow: hidden;
        }
        .ir-score-fill {
          height: 100%; border-radius: 99px; transition: width .5s ease;
        }
        .ir-score-val { font-size: 13px; font-weight: 600; color: #111827; width: 60px; text-align: right; }

        .ir-prob-row {
          display: flex; gap: 14px; margin-top: 22px; flex-wrap: wrap;
        }
        .ir-prob-box {
          flex: 1; min-width: 140px; border-radius: 12px;
          padding: 16px; text-align: center;
        }
        .ir-prob-box.green  { background: #ECFDF5; }
        .ir-prob-box.red    { background: #FEF2F2; }
        .ir-prob-box.purple { background: #EEF2FF; }
        .ir-prob-val { font-size: 22px; font-weight: 700; color: #111827; }
        .ir-prob-lbl { font-size: 11px; color: #6B7280; margin-top: 3px; }

        /* Q&A */
        .ir-qa-item {
          border: 1px solid #F1F5F9; border-radius: 12px;
          padding: 18px; margin-bottom: 14px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .ir-qa-top { display: flex; gap: 12px; align-items: flex-start; }
        .ir-qa-num {
          background: #EEF2FF; color: #667eea;
          font-size: 12px; font-weight: 700;
          padding: 3px 10px; border-radius: 99px; flex-shrink: 0; margin-top: 2px;
        }
        .ir-qa-question { font-size: 14px; font-weight: 600; color: #111827; margin: 0; line-height: 1.5; }

        .ir-qa-answer { background: #F8FAFC; border-radius: 8px; padding: 12px 14px; }
        .ir-qa-answer-label {
          font-size: 11px; font-weight: 600; color: #9CA3AF;
          text-transform: uppercase; letter-spacing: .5px; display: block; margin-bottom: 5px;
        }
        .ir-qa-answer p { font-size: 13px; color: #374151; margin: 0; line-height: 1.6; }

        .ir-qa-scores { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .ir-qa-score-chip {
          font-size: 12px; font-weight: 600; padding: 4px 12px;
          border-radius: 99px;
        }
        .ir-qa-score-chip.blue   { background: #EFF6FF; color: #1D4ED8; }
        .ir-qa-score-chip.green  { background: #ECFDF5; color: #166534; }

        .ir-qa-feedback-chip {
          font-size: 12px; padding: 4px 12px; border-radius: 99px; font-weight: 500;
        }
        .ir-qa-feedback-chip.excellent { background: #ECFDF5; color: #166534; }
        .ir-qa-feedback-chip.good      { background: #EFF6FF; color: #1E40AF; }
        .ir-qa-feedback-chip.average   { background: #FFFBEB; color: #92400E; }
        .ir-qa-feedback-chip.weak      { background: #FEF2F2; color: #991B1B; }
      `}</style>
    </div>
  );
};

export default InterviewResult;
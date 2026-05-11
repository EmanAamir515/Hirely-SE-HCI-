import React, { useState, useEffect } from 'react';

const CandidateProfile = ({ user }) => {
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', education: '', experience: '', profileSummary: '' });
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [completion, setCompletion] = useState(20);
  const [saving, setSaving] = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/candidate/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const p = data.profile || {};
        setProfile({
          name:           p.Name || user?.name || '',
          email:          p.Email || user?.email || '',
          phone:          p.Phone || '',
          education:      p.Education || '',
          experience:     p.Experience || '',
          profileSummary: p.ProfileSummary || '',
        });
        setSkills(data.skills || []);
        calcCompletion(p, data.skills || []);
      }
    } catch (_) {} finally { setLoading(false); }
  };

  const calcCompletion = (p, sk) => {
    let pct = 20;
    if (p.Name)           pct += 10;
    if (p.Phone)          pct += 10;
    if (p.Education)      pct += 15;
    if (p.Experience)     pct += 15;
    if (p.ProfileSummary) pct += 15;
    if (p.CVPath)         pct += 15;
    if (sk.length > 0)    pct = Math.min(100, pct + Math.min(sk.length * 5, 20));
    setCompletion(Math.min(100, pct));
  };

  const handleSave = async () => {
    setSaving(true); setMsg({ type: '', text: '' });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/candidate/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: 'Profile saved successfully!' });
        fetchProfile();
      } else {
        setMsg({ type: 'error', text: data.message || 'Failed to save' });
      }
    } catch (_) {
      setMsg({ type: 'error', text: 'Network error' });
    } finally { setSaving(false); }
  };

  const handleAddSkill = async () => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    setAddingSkill(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/candidate/skills', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillName: trimmed })
      });
      const data = await res.json();
      if (data.success) {
        setSkills(prev => [...prev, { SkillID: data.skillId, SkillName: data.skillName || trimmed }]);
        setNewSkill('');
      } else {
        setMsg({ type: 'error', text: data.message });
      }
    } catch (_) {} finally { setAddingSkill(false); }
  };

  const handleRemoveSkill = async (skillId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/candidate/skills/${skillId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setSkills(prev => prev.filter(s => s.SkillID !== skillId));
    } catch (_) {}
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } };

  if (loading) return <div className="cp-loading">Loading profile…</div>;

  const completionColor = completion >= 80 ? '#1810b9' : completion >= 50 ? '#a7c01a' : '#667eea';

  return (
    <div className="cp-root">
      {/* Header */}
      <div className="cp-header">
        <div>
          <h2>My Profile</h2>
          <p>Complete your profile to get better job matches</p>
        </div>
        <button className="cp-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {msg.text && (
        <div className={`cp-msg ${msg.type}`}>{msg.text}</div>
      )}

      {/* Completion bar */}
      <div className="cp-card cp-completion">
        <div className="cp-comp-row">
          <span className="cp-comp-label">Profile Completion</span>
          <span className="cp-comp-pct" style={{ color: completionColor }}>{completion}%</span>
        </div>
        <div className="cp-progress-track">
          <div className="cp-progress-fill" style={{ width: `${completion}%`, background: completionColor }} />
        </div>
        <p className="cp-comp-hint">Complete all sections to increase your visibility to employers</p>
      </div>

      {/* Basic Information */}
      <div className="cp-card">
        <div className="cp-card-title">
          <span>👤</span> Basic Information
          <small>Your personal and contact details</small>
        </div>
        <div className="cp-grid-2">
          <div className="cp-field">
            <label>First Name *</label>
            <input value={profile.name.split(' ')[0] || ''} onChange={e => setProfile(p => ({ ...p, name: e.target.value + ' ' + p.name.split(' ').slice(1).join(' ') }))} placeholder="John" />
          </div>
          <div className="cp-field">
            <label>Last Name *</label>
            <input value={profile.name.split(' ').slice(1).join(' ') || ''} onChange={e => setProfile(p => ({ ...p, name: p.name.split(' ')[0] + ' ' + e.target.value }))} placeholder="Doe" />
          </div>
          <div className="cp-field">
            <label>Email *</label>
            <input type="email" value={profile.email} readOnly disabled placeholder="john@example.com" />
          </div>
          <div className="cp-field">
            <label>Phone Number</label>
            <input type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
          </div>
        </div>
        <div className="cp-field cp-full">
          <label>Professional Summary</label>
          <textarea
            rows={3}
            value={profile.profileSummary}
            onChange={e => setProfile(p => ({ ...p, profileSummary: e.target.value }))}
            placeholder="Tell employers about yourself..."
          />
        </div>
      </div>

      {/* Skills */}
      <div className="cp-card">
        <div className="cp-card-title">
          Skills
          <small>Add your technical and professional skills</small>
        </div>
        <div className="cp-skill-input-row">
          <input
            className="cp-skill-input"
            value={newSkill}
            onChange={e => setNewSkill(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a skill and press Enter"
          />
          <button className="cp-skill-add-btn" onClick={handleAddSkill} disabled={addingSkill || !newSkill.trim()}>
            Add
          </button>
        </div>
        <div className="cp-skills-list">
          {skills.length === 0 ? (
            <span className="cp-no-skills">No skills added yet. Add your first skill above.</span>
          ) : (
            skills.map(sk => (
              <span key={sk.SkillID} className="cp-skill-tag">
                {sk.SkillName}
                <button className="cp-skill-remove" onClick={() => handleRemoveSkill(sk.SkillID)}>×</button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Education */}
      <div className="cp-card">
        <div className="cp-card-title">
           Education
          <small>Your academic background</small>
        </div>
        <div className="cp-field">
          <label>Education Background</label>
          <textarea
            rows={3}
            value={profile.education}
            onChange={e => setProfile(p => ({ ...p, education: e.target.value }))}
            placeholder="e.g. BS Computer Science, FAST NUCES Lahore (2021–2025)"
          />
        </div>
      </div>

      {/* Work Experience */}
      <div className="cp-card">
        <div className="cp-card-title">
          Work Experience
          <small>Your professional experience</small>
        </div>
        <div className="cp-field">
          <label>Experience</label>
          <textarea
            rows={3}
            value={profile.experience}
            onChange={e => setProfile(p => ({ ...p, experience: e.target.value }))}
            placeholder="e.g. Frontend Developer Intern at TechCorp (Jan 2024 – May 2024)"
          />
        </div>
      </div>

      <style>{`
        .cp-root { display: flex; flex-direction: column; gap: 18px; }
        .cp-loading { padding: 60px; text-align: center; color: #94A3B8; font-size: 15px; }

        .cp-header {
          display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;
        }
        .cp-header h2 { font-size: 24px; font-weight: 700; color: #0F172A; margin: 0 0 4px; }
        .cp-header p  { color: #64748B; margin: 0; font-size: 14px; }

        .cp-save-btn {
          padding: 10px 22px;
          background: linear-gradient(135deg, #667eea );
          color: #fff; border: none; border-radius: 8px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: opacity 0.2s;
        }
        .cp-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .cp-save-btn:not(:disabled):hover { opacity: 0.88; }

        .cp-msg {
          padding: 12px 16px; border-radius: 8px; font-size: 14px; font-weight: 500;
        }
        .cp-msg.success { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
        .cp-msg.error   { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }

        .cp-card {
          background: #fff; border-radius: 14px;
          padding: 22px 24px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .cp-card-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 15px; font-weight: 600; color: #1E293B;
          margin-bottom: 18px;
        }
        .cp-card-title small { font-size: 12px; color: #94A3B8; font-weight: 400; margin-left: 4px; }
        .cp-card-title span  { font-size: 18px; }

        /* Completion */
        .cp-completion {}
        .cp-comp-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .cp-comp-label { font-size: 14px; font-weight: 600; color: #1E293B; }
        .cp-comp-pct   { font-size: 20px; font-weight: 700; }
        .cp-progress-track { height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
        .cp-progress-fill  { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
        .cp-comp-hint { font-size: 13px; color: #64748B; margin: 0; }

        /* Grid */
        .cp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .cp-full { grid-column: 1 / -1; }

        /* Fields */
        .cp-field { display: flex; flex-direction: column; gap: 6px; }
        .cp-field label { font-size: 13px; font-weight: 500; color: #374151; }
        .cp-field input, .cp-field textarea {
          padding: 10px 12px;
          border: 1.5px solid #E2E8F0; border-radius: 8px;
          font-size: 14px; color: #1E293B;
          transition: border-color 0.15s;
          font-family: inherit; resize: vertical;
        }
        .cp-field input:focus, .cp-field textarea:focus {
          outline: none; border-color: #667eea;
        }
        .cp-field input:disabled { background: #F8FAFC; color: #94A3B8; cursor: not-allowed; }

        /* Skills */
        .cp-skill-input-row { display: flex; gap: 10px; margin-bottom: 14px; }
        .cp-skill-input {
          flex: 1; padding: 10px 12px;
          border: 1.5px solid #E2E8F0; border-radius: 8px;
          font-size: 14px; font-family: inherit; color: #1E293B;
          transition: border-color 0.15s;
        }
        .cp-skill-input:focus { outline: none; border-color: #667eea; }
        .cp-skill-add-btn {
          padding: 10px 22px;
          background: #667eea; color: #fff;
          border: none; border-radius: 8px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: opacity 0.2s;
        }
        .cp-skill-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cp-skill-add-btn:not(:disabled):hover { opacity: 0.88; }

        .cp-skills-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .cp-no-skills { font-size: 13px; color: #94A3B8; }
        .cp-skill-tag {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px;
          background: #EEF2FF; color: #4338CA;
          border-radius: 20px; font-size: 13px; font-weight: 500;
        }
        .cp-skill-remove {
          background: none; border: none; cursor: pointer;
          color: #818CF8; font-size: 16px; line-height: 1;
          padding: 0; transition: color 0.15s;
        }
        .cp-skill-remove:hover { color: #EF4444; }

        @media (max-width: 600px) { .cp-grid-2 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default CandidateProfile;
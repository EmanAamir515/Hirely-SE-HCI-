import React, { useState, useEffect, useRef } from 'react';
import { sendNotification } from '../notifyHelper';

const PYTHON_API = 'http://localhost:8000';
const NODE_API   = 'http://localhost:5000';

const InterviewPage = ({ user, applicationId }) => {

  // ── Phase controls ──
  // 'profile' → fill in background info
  // 'intro'   → rules screen
  // 'loading' → fetching questions
  // 'question'→ answering questions
  // 'submitting' → scoring in progress
  // 'done' | 'error' | 'already_done'
  const [phase, setPhase]       = useState('profile');

  // ── Profile form state ──
  const [profileForm, setProfileForm] = useState({
    age:           '',
    gender:        '',
    education:     '',
    experience:    '',
    prev_companies:'',
    distance:      '',
    strategy:      '',
  });
  const [profileErrors, setProfileErrors] = useState({});

  // ── Interview state ──
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent]     = useState(0);
  const [answers, setAnswers]     = useState([]);
  const [draft, setDraft]         = useState('');
  const [result, setResult]       = useState(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const textRef = useRef(null);

  // ── On mount: check if already done ──
  useEffect(() => {
    checkStatus();
  }, []);

  // ── Speak a new question whenever `current` changes and we're in question phase ──
  useEffect(() => {
    if (phase === 'question' && questions.length > 0) {
      speakText(questions[current]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, phase, questions]);

  // ── Cancel speech on unmount ──
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  // ════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════

  const checkStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${NODE_API}/api/interview/status/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.completed) setPhase('already_done');
    } catch (_) {}
  };

  /** Speak text aloud using Web Speech API — drives avatar animation */
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt    = new SpeechSynthesisUtterance(text);
    utt.rate     = 0.92;
    utt.pitch    = 1.05;
    utt.onstart  = () => setIsSpeaking(true);
    utt.onend    = () => {
      setIsSpeaking(false);
      setTimeout(() => textRef.current?.focus(), 100);
    };
    utt.onerror  = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  /** Validate profile form — returns true if all fields filled */
  const validateProfile = () => {
    const errors = {};
    if (!profileForm.age          || isNaN(profileForm.age))    errors.age           = 'Required';
    if (profileForm.gender        === '')                        errors.gender        = 'Required';
    if (profileForm.education     === '')                        errors.education     = 'Required';
    if (profileForm.experience    === '' || isNaN(profileForm.experience)) errors.experience = 'Required';
    if (profileForm.prev_companies=== '' || isNaN(profileForm.prev_companies)) errors.prev_companies = 'Required';
    if (profileForm.distance      === '' || isNaN(profileForm.distance))   errors.distance = 'Required';
    if (profileForm.strategy      === '')                        errors.strategy      = 'Required';
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileChange = (field, value) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    setProfileErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // ════════════════════════════════════════
  //  ACTIONS
  // ════════════════════════════════════════

  const goToIntro = () => {
    if (!validateProfile()) return;
    setPhase('intro');
  };

  const startInterview = async () => {
    setPhase('loading');
    try {
      const res  = await fetch(`${PYTHON_API}/questions`);
      const data = await res.json();
      setQuestions(data.questions);
      setAnswers([]);
      setCurrent(0);
      setDraft('');
      setPhase('question');
    } catch (err) {
      setErrorMsg('Could not connect to the interview server. Make sure it is running on port 8000.');
      setPhase('error');
    }
  };

  const submitAnswer = () => {
    if (!draft.trim()) return;
    const updated = [...answers, { question: questions[current], answer: draft.trim() }];
    setAnswers(updated);
    setDraft('');

    if (current + 1 < questions.length) {
      setCurrent(c => c + 1);        // triggers useEffect → speakText
    } else {
      window.speechSynthesis?.cancel();
      submitAll(updated);
    }
  };

  const submitAll = async (allAnswers) => {
    setPhase('submitting');
    try {
      const token = localStorage.getItem('token');

      // Build model profile from the form the user filled in
      const modelProfile = {
        age:            parseInt(profileForm.age),
        gender:         parseInt(profileForm.gender),
        education:      parseInt(profileForm.education),
        experience:     parseInt(profileForm.experience),
        prev_companies: parseInt(profileForm.prev_companies),
        distance:       parseFloat(profileForm.distance),
        strategy:       parseInt(profileForm.strategy),
      };

      // 1. Score via Python API
      const pyRes  = await fetch(`${PYTHON_API}/submit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          candidate_id:   user.id,
          profile:        modelProfile,
          answers:        allAnswers,
        }),
      });
      const pyData = await pyRes.json();
      if (!pyRes.ok) throw new Error(pyData.detail || 'Scoring failed');

      // 2. Save to SQL via Node API
      const saveRes = await fetch(`${NODE_API}/api/interview/result`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(pyData),
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.message);

      // ── Notify the employer that the candidate completed the interview ──
      // Your POST /api/interview/result endpoint should return employerUserId.
      const employerUserId = saveData.employerUserId;
      if (employerUserId) {
        const candidateName = user?.name || 'A candidate';
        const jobTitle = saveData.jobTitle || pyData.job_title || 'the position';
        await sendNotification(
          token,
          employerUserId,
          `🎙️ ${candidateName} has completed the AI Interview for "${jobTitle}". Review their result now.`
        );
      }
      // ─────────────────────────────────────────────────────────────────────

      setResult(pyData);
      setPhase('done');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong while submitting.');
      setPhase('error');
    }
  };

  const progress = questions.length > 0 ? (current / questions.length) * 100 : 0;
  const wordCount = draft.trim().split(/\s+/).filter(Boolean).length;

  // ════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════
  return (
    <div className="ip-wrap">

      {/* ════ STEP INDICATOR ════ */}
      {phase !== 'already_done' && (
        <div className="ip-steps">
          <div className={`ip-step-dot ${phase === 'profile' ? 'active' : 'done'}`}>
            {phase === 'profile' ? '1' : '✓'}
          </div>
          <span className="ip-step-label">Profile</span>
          <div className="ip-step-line" />
          <div className={`ip-step-dot ${['intro','loading','question','submitting'].includes(phase) ? 'active' : phase === 'done' ? 'done' : ''}`}>
            {phase === 'done' ? '✓' : '2'}
          </div>
          <span className="ip-step-label">Interview</span>
          <div className="ip-step-line" />
          <div className={`ip-step-dot ${phase === 'done' ? 'done' : ''}`}>
            {phase === 'done' ? '✓' : '3'}
          </div>
          <span className="ip-step-label">Done</span>
        </div>
      )}

      {/* ════ PHASE: PROFILE FORM ════ */}
      {phase === 'profile' && (
        <div className="ip-card">
          <h1 className="ip-h1">Candidate profile</h1>
          <p className="ip-sub">This information is used by the AI scoring model. Fill in all fields accurately before starting.</p>

          <div className="ip-form-grid">

            <div className="ip-form-group">
              <label className="ip-label">Age</label>
              <input
                className={`ip-input ${profileErrors.age ? 'ip-input-err' : ''}`}
                type="number" min="16" max="65"
                placeholder="e.g. 24"
                value={profileForm.age}
                onChange={e => handleProfileChange('age', e.target.value)}
              />
              {profileErrors.age && <span className="ip-field-err">{profileErrors.age}</span>}
            </div>

            <div className="ip-form-group">
              <label className="ip-label">Gender</label>
              <select
                className={`ip-input ${profileErrors.gender ? 'ip-input-err' : ''}`}
                value={profileForm.gender}
                onChange={e => handleProfileChange('gender', e.target.value)}
              >
                <option value="">Select…</option>
                <option value="0">Male</option>
                <option value="1">Female</option>
              </select>
              {profileErrors.gender && <span className="ip-field-err">{profileErrors.gender}</span>}
            </div>

            <div className="ip-form-group">
              <label className="ip-label">Education level</label>
              <select
                className={`ip-input ${profileErrors.education ? 'ip-input-err' : ''}`}
                value={profileForm.education}
                onChange={e => handleProfileChange('education', e.target.value)}
              >
                <option value="">Select…</option>
                <option value="1">High school</option>
                <option value="2">Bachelor's degree</option>
                <option value="3">Master's degree</option>
                <option value="4">PhD</option>
              </select>
              {profileErrors.education && <span className="ip-field-err">{profileErrors.education}</span>}
            </div>

            <div className="ip-form-group">
              <label className="ip-label">Years of experience</label>
              <input
                className={`ip-input ${profileErrors.experience ? 'ip-input-err' : ''}`}
                type="number" min="0" max="40"
                placeholder="e.g. 2"
                value={profileForm.experience}
                onChange={e => handleProfileChange('experience', e.target.value)}
              />
              {profileErrors.experience && <span className="ip-field-err">{profileErrors.experience}</span>}
            </div>

            <div className="ip-form-group">
              <label className="ip-label">Previous companies worked at</label>
              <input
                className={`ip-input ${profileErrors.prev_companies ? 'ip-input-err' : ''}`}
                type="number" min="0" max="20"
                placeholder="e.g. 1"
                value={profileForm.prev_companies}
                onChange={e => handleProfileChange('prev_companies', e.target.value)}
              />
              {profileErrors.prev_companies && <span className="ip-field-err">{profileErrors.prev_companies}</span>}
            </div>

            <div className="ip-form-group">
              <label className="ip-label">Distance from office (km)</label>
              <input
                className={`ip-input ${profileErrors.distance ? 'ip-input-err' : ''}`}
                type="number" min="0"
                placeholder="e.g. 15"
                value={profileForm.distance}
                onChange={e => handleProfileChange('distance', e.target.value)}
              />
              {profileErrors.distance && <span className="ip-field-err">{profileErrors.distance}</span>}
            </div>

            <div className="ip-form-group ip-full">
              <label className="ip-label">Recruitment strategy</label>
              <select
                className={`ip-input ${profileErrors.strategy ? 'ip-input-err' : ''}`}
                value={profileForm.strategy}
                onChange={e => handleProfileChange('strategy', e.target.value)}
              >
                <option value="">Select…</option>
                <option value="1">Direct hire</option>
                <option value="2">Agency referral</option>
                <option value="3">Campus / internship pipeline</option>
              </select>
              {profileErrors.strategy && <span className="ip-field-err">{profileErrors.strategy}</span>}
            </div>

          </div>

          <button className="ip-btn-primary" onClick={goToIntro}>
            Continue to interview →
          </button>
        </div>
      )}

      {/* ════ PHASE: INTRO / RULES ════ */}
      {phase === 'intro' && (
        <div className="ip-card ip-center">
          <div className="ip-icon-big">🎙️</div>
          <h1 className="ip-h1">AI Interview</h1>
          <p className="ip-sub">
            You will be asked <strong>5 questions</strong>. An AI avatar will read each question aloud
            and the text will also be shown. Answer each one thoughtfully.
          </p>
          <ul className="ip-rules">
            <li>🤖 An avatar will speak each question aloud</li>
            <li>📝 Type your answer in the text box</li>
            <li>⏳ No timer — take your time</li>
            <li>🔒 Results are shown only to the employer</li>
            <li>✅ You can only take this interview once</li>
          </ul>
          <button className="ip-btn-primary" onClick={startInterview}>
            Start Interview →
          </button>
        </div>
      )}

      {/* ════ PHASE: LOADING ════ */}
      {phase === 'loading' && (
        <div className="ip-card ip-center">
          <div className="ip-spinner" />
          <p className="ip-sub">Preparing your questions…</p>
        </div>
      )}

      {/* ════ PHASE: QUESTION ════ */}
      {phase === 'question' && (
        <div className="ip-card">

          {/* Avatar */}
          <div className="ip-avatar-area">
            <div className={`ip-avatar-ring ${isSpeaking ? 'speaking' : ''}`}>
              <span className="ip-avatar-face">🤖</span>
            </div>
            <div className={`ip-speaking-badge ${isSpeaking ? 'visible' : ''}`}>
              Speaking…
            </div>
          </div>

          {/* Browser TTS note */}
          <div className="ip-tts-note">
            🔊 Make sure your volume is on — the avatar will read each question aloud.
          </div>

          {/* Progress bar */}
          <div className="ip-progress-track">
            <div className="ip-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="ip-qmeta">
            <span className="ip-qnum">Question {current + 1} of {questions.length}</span>
            <span className="ip-qtag">AI Interview</span>
          </div>

          {/* Question text (also spoken by avatar) */}
          <div className="ip-question-box">
            {questions[current]}
          </div>

          <textarea
            ref={textRef}
            className="ip-textarea"
            placeholder="Type your answer here…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submitAnswer(); }}
            rows={6}
          />
          <div className="ip-hint">Ctrl + Enter to submit</div>

          <div className="ip-actions">
            <span className="ip-word-count">{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
            <button
              className="ip-btn-primary"
              onClick={submitAnswer}
              disabled={!draft.trim()}
            >
              {current + 1 < questions.length ? 'Next question →' : 'Finish interview ✓'}
            </button>
          </div>
        </div>
      )}

      {/* ════ PHASE: SUBMITTING ════ */}
      {phase === 'submitting' && (
        <div className="ip-card ip-center">
          <div className="ip-spinner" />
          <h2 className="ip-h2">Analyzing your answers…</h2>
          <p className="ip-sub">Our AI is scoring your responses. This takes a few seconds.</p>
        </div>
      )}

      {/* ════ PHASE: DONE ════ */}
      {phase === 'done' && (
        <div className="ip-card ip-center">
          <div className="ip-icon-big">✅</div>
          <h1 className="ip-h1">Interview complete!</h1>
          <p className="ip-sub">
            Thank you for completing the interview, <strong>{user?.name}</strong>.<br />
            Your answers have been submitted. The employer will review your results and get back to you.
          </p>
          <div className="ip-done-note">
            🔒 Individual scores are kept confidential — only the employer can see the detailed results.
          </div>
        </div>
      )}

      {/* ════ PHASE: ALREADY DONE ════ */}
      {phase === 'already_done' && (
        <div className="ip-card ip-center">
          <div className="ip-icon-big">📋</div>
          <h1 className="ip-h1">Already submitted</h1>
          <p className="ip-sub">You have already completed this interview. The employer will review your results and contact you.</p>
        </div>
      )}

      {/* ════ PHASE: ERROR ════ */}
      {phase === 'error' && (
        <div className="ip-card ip-center">
          <div className="ip-icon-big">⚠️</div>
          <h1 className="ip-h1">Something went wrong</h1>
          <p className="ip-sub ip-error">{errorMsg}</p>
          <button className="ip-btn-secondary" onClick={() => setPhase('intro')}>Try Again</button>
        </div>
      )}

      {/* ════════ STYLES ════════ */}
      <style>{`
        .ip-wrap {
          min-height: 70vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: 'Segoe UI', system-ui, sans-serif;
          gap: 20px;
        }

        /* ── Step indicator ── */
        .ip-steps {
          display: flex;
          align-items: center;
          gap: 8px;
          max-width: 520px;
          width: 100%;
        }
        .ip-step-dot {
          width: 28px; height: 28px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600;
          border: 1.5px solid #D1D5DB;
          color: #9CA3AF;
          background: white;
          flex-shrink: 0;
        }
        .ip-step-dot.active  { background: #534AB7; color: white; border-color: #534AB7; }
        .ip-step-dot.done    { background: #EAF3DE; color: #3B6D11; border-color: #C0DD97; }
        .ip-step-label       { font-size: 12px; color: #6B7280; white-space: nowrap; }
        .ip-step-line        { flex: 1; height: 1px; background: #E5E7EB; }

        /* ── Card ── */
        .ip-card {
          background: white;
          border-radius: 20px;
          padding: 36px 40px;
          max-width: 680px;
          width: 100%;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .ip-center {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        /* ── Typography ── */
        .ip-icon-big { font-size: 52px; line-height: 1; }
        .ip-h1  { font-size: 24px; font-weight: 700; color: #111827; margin: 0; }
        .ip-h2  { font-size: 19px; font-weight: 600; color: #111827; margin: 0; }
        .ip-sub { font-size: 14px; color: #6B7280; line-height: 1.7; margin: 0; }
        .ip-error { color: #DC2626; }

        /* ── Profile form ── */
        .ip-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin: 20px 0 24px;
        }
        .ip-form-group { display: flex; flex-direction: column; gap: 5px; }
        .ip-full { grid-column: 1 / -1; }
        .ip-label { font-size: 13px; color: #374151; font-weight: 500; }
        .ip-input {
          height: 40px;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          padding: 0 12px;
          font-size: 14px;
          color: #111827;
          background: white;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
          appearance: none;
          -webkit-appearance: none;
        }
        .ip-input:focus    { border-color: #534AB7; box-shadow: 0 0 0 3px rgba(83,74,183,.12); }
        .ip-input-err      { border-color: #DC2626 !important; }
        .ip-field-err      { font-size: 11px; color: #DC2626; }

        /* ── Avatar ── */
        .ip-avatar-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 20px;
          gap: 8px;
        }
        .ip-avatar-ring {
          width: 88px; height: 88px;
          border-radius: 50%;
          border: 3px solid #AFA9EC;
          background: #EEEDFE;
          display: flex; align-items: center; justify-content: center;
          transition: border-color .3s;
        }
        .ip-avatar-ring.speaking {
          border-color: #534AB7;
          animation: ip-pulse 1.1s ease-in-out infinite;
        }
        @keyframes ip-pulse {
          0%,100% { box-shadow: 0 0 0 0px rgba(83,74,183,0.2); }
          50%      { box-shadow: 0 0 0 12px rgba(83,74,183,0.0); }
        }
        .ip-avatar-face {
          font-size: 38px;
          user-select: none;
        }
        .ip-avatar-ring.speaking .ip-avatar-face {
          animation: ip-bob .5s ease-in-out infinite alternate;
        }
        @keyframes ip-bob {
          from { transform: translateY(0);   }
          to   { transform: translateY(-4px);}
        }
        .ip-speaking-badge {
          font-size: 11px; font-weight: 600;
          color: #534AB7;
          background: #EEEDFE;
          border-radius: 99px;
          padding: 3px 12px;
          opacity: 0;
          transition: opacity .2s;
        }
        .ip-speaking-badge.visible { opacity: 1; }

        /* ── TTS note ── */
        .ip-tts-note {
          background: #FAEEDA;
          border: 1px solid #FAC775;
          border-radius: 10px;
          padding: 9px 14px;
          font-size: 12px;
          color: #633806;
          margin-bottom: 18px;
        }

        /* ── Progress bar ── */
        .ip-progress-track {
          height: 5px;
          background: #E5E7EB;
          border-radius: 99px;
          margin-bottom: 18px;
          overflow: hidden;
        }
        .ip-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #534AB7);
          border-radius: 99px;
          transition: width .4s ease;
        }

        .ip-qmeta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .ip-qnum { font-size: 12px; font-weight: 600; color: #534AB7; }
        .ip-qtag {
          font-size: 11px;
          background: #EEEDFE;
          color: #534AB7;
          padding: 2px 10px;
          border-radius: 99px;
          font-weight: 600;
        }

        /* ── Question text box ── */
        .ip-question-box {
          background: #F8FAFC;
          border-left: 3px solid #534AB7;
          border-radius: 0 10px 10px 0;
          padding: 14px 16px;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        /* ── Textarea ── */
        .ip-textarea {
          width: 100%;
          border: 1.5px solid #E5E7EB;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px;
          color: #374151;
          font-family: inherit;
          resize: vertical;
          line-height: 1.6;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .ip-textarea:focus {
          border-color: #534AB7;
          box-shadow: 0 0 0 3px rgba(83,74,183,.1);
        }
        .ip-hint { font-size: 11px; color: #9CA3AF; margin-top: 5px; }

        .ip-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 18px;
        }
        .ip-word-count { font-size: 12px; color: #9CA3AF; }

        /* ── Rules list ── */
        .ip-rules {
          text-align: left;
          list-style: none;
          padding: 16px 20px;
          margin: 0;
          background: #F8FAFC;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }
        .ip-rules li { font-size: 14px; color: #374151; }

        /* ── Buttons ── */
        .ip-btn-primary {
          background: linear-gradient(135deg, #667eea, #534AB7);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 12px 30px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity .2s, transform .15s;
          margin-top: 6px;
        }
        .ip-btn-primary:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
        .ip-btn-primary:disabled { opacity: .4; cursor: not-allowed; }

        .ip-btn-secondary {
          background: #F1F5F9;
          color: #374151;
          border: none;
          border-radius: 10px;
          padding: 11px 26px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background .15s;
          margin-top: 6px;
        }
        .ip-btn-secondary:hover { background: #E2E8F0; }

        /* ── Spinner ── */
        .ip-spinner {
          width: 42px; height: 42px;
          border: 4px solid #EEEDFE;
          border-top-color: #534AB7;
          border-radius: 50%;
          animation: ip-spin .8s linear infinite;
        }
        @keyframes ip-spin { to { transform: rotate(360deg); } }

        /* ── Done / error notes ── */
        .ip-done-note {
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-radius: 10px;
          padding: 13px 16px;
          font-size: 13px;
          color: #166534;
          width: 100%;
        }

        /* ── Responsive ── */
        @media (max-width: 520px) {
          .ip-card { padding: 24px 20px; }
          .ip-form-grid { grid-template-columns: 1fr; }
          .ip-full { grid-column: 1; }
        }
      `}</style>
    </div>
  );
};

export default InterviewPage;
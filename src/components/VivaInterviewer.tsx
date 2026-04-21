import { useState } from 'react';
import { Play, ChevronRight, RefreshCw, XCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { callGroq } from '../lib/groq';

const TOPICS = [
  'Mixed (Recommended)',
  'SQL Basics',
  'SQL Joins',
  'SQL Aggregations',
  'Subqueries & CTEs',
  'Indexes & Performance',
  'Normalization',
  'ACID Properties',
  'Transactions',
  'ER Diagrams',
  'NoSQL vs SQL',
];

type Evaluation = {
  score: number;
  correct: string[];
  missing: string[];
  modelAnswer: string;
  tip: string;
} | null;

type ScoreEntry = { qNum: number; topic: string; score: number; max: number };

const S = {
  card: {
    background: '#1e1e1c',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    color: '#f5f5f0',
  } as React.CSSProperties,
  label: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'rgba(245,245,240,0.4)',
    marginBottom: 10,
    display: 'block',
  },
  field: {
    background: '#141413',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    color: '#f5f5f0',
    fontSize: 15,
    padding: 16,
    width: '100%',
    outline: 'none',
    resize: 'none' as const,
    minHeight: 180,
    lineHeight: 1.7,
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  } as React.CSSProperties,
  btnPrimary: {
    background: '#d97706',
    border: 'none',
    borderRadius: 10,
    height: 52,
    fontSize: 16,
    fontWeight: 600,
    color: 'white',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
};

function AnswerField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Type your answer here..."
      style={{
        ...S.field,
        ...(focused
          ? { borderColor: 'rgba(217,119,6,0.6)', boxShadow: '0 0 0 3px rgba(217,119,6,0.1)' }
          : {}),
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

export default function VivaInterviewer() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionDone, setSessionDone]       = useState(false);

  const [topic, setTopic]                   = useState(TOPICS[0]);
  const [difficulty, setDifficulty]         = useState('Medium');
  const [totalQuestions, setTotalQuestions] = useState(10);

  const [questionNumber, setQuestionNumber] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentCategory, setCurrentCategory] = useState('');
  const [currentMarks, setCurrentMarks]     = useState(10);
  const [currentHint, setCurrentHint]       = useState('');

  const [currentAnswer, setCurrentAnswer]   = useState('');
  const [evaluation, setEvaluation]         = useState<Evaluation>(null);
  const [loading, setLoading]               = useState(false);
  const [scores, setScores]                 = useState<ScoreEntry[]>([]);
  const [previousTopics, setPreviousTopics] = useState<string[]>([]);

  const wordCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0;

  const fetchQuestion = async () => {
    setLoading(true);
    setEvaluation(null);
    setCurrentAnswer('');
    setCurrentHint('');
    try {
      const sys = `You are Prof. SQL, a strict DBMS professor. Respond ONLY in JSON:\n{"question":"...","category":"...","marks":10,"hint":"..."}`;
      const res: any = await callGroq(
        sys,
        `Ask question ${questionNumber + 1}/${totalQuestions} on ${topic}. Previously: ${previousTopics.join(', ')}`,
      );
      setCurrentQuestion(res.question || 'Explain Primary Keys.');
      setCurrentCategory(res.category || topic);
      setCurrentMarks(res.marks || 10);
      setCurrentHint(res.hint || '');
      setPreviousTopics(p => [...p, res.category || topic]);
    } catch {
      setCurrentQuestion('Explain SQL Joins.');
      setCurrentCategory('Joins');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    setSessionStarted(true);
    setSessionDone(false);
    setScores([]);
    setQuestionNumber(0);
    setPreviousTopics([]);
    fetchQuestion();
  };

  const handleSubmit = async () => {
    if (!currentAnswer.trim()) return;
    setLoading(true);
    try {
      const sys = `Evaluate this answer out of ${currentMarks}. Respond ONLY in JSON:\n{"score":0,"correct":[],"missing":[],"modelAnswer":"","tip":""}`;
      const evalRes: any = await callGroq(
        sys,
        `Question: ${currentQuestion}\nAnswer: ${currentAnswer}`,
      );
      setEvaluation(evalRes);
      setScores(p => [...p, { qNum: questionNumber + 1, topic: currentCategory, score: evalRes.score || 0, max: currentMarks }]);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (questionNumber + 1 >= totalQuestions) {
      setSessionDone(true);
    } else {
      setQuestionNumber(p => p + 1);
      fetchQuestion();
    }
  };

  /* ────────────────────────────── SETUP SCREEN ───────────────────────────── */
  if (!sessionStarted) {
    return (
      <div className="fade-in" style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>👨‍🏫</div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#f5f5f0', margin: '0 0 6px' }}>Prof. SQL's Examination</h2>
          <p style={{ fontSize: 14, color: 'rgba(245,245,240,0.4)', margin: 0 }}>Practice DBMS viva questions with AI-powered evaluation</p>
        </div>

        {/* Setup card */}
        <div style={{ ...S.card, padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Topic grid */}
          <div>
            <span style={S.label}>Area of Expertise</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {TOPICS.map(t => {
                const sel = topic === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    style={{
                      height: 48,
                      borderRadius: 10,
                      border: sel ? '1px solid rgba(217,119,6,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      background: sel ? 'rgba(217,119,6,0.15)' : '#141413',
                      color: sel ? '#d97706' : 'rgba(245,245,240,0.6)',
                      fontWeight: sel ? 600 : 400,
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { if (!sel) { (e.currentTarget as HTMLButtonElement).style.background = '#1e1e1c'; (e.currentTarget as HTMLButtonElement).style.color = '#f5f5f0'; } }}
                    onMouseLeave={e => { if (!sel) { (e.currentTarget as HTMLButtonElement).style.background = '#141413'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,245,240,0.6)'; } }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* Difficulty */}
            <div>
              <span style={S.label}>Difficulty</span>
              <div style={{ display: 'flex', background: '#141413', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', padding: 3, gap: 3 }}>
                {(['Easy', 'Medium', 'Hard'] as const).map(d => {
                  const sel = difficulty === d;
                  const activeStyle = d === 'Easy'
                    ? { background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80' }
                    : d === 'Medium'
                      ? { background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }
                      : { background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171' };
                  return (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: sel ? 600 : 400,
                        fontSize: 14,
                        transition: 'all 0.15s ease',
                        ...(sel ? activeStyle : { background: 'transparent', color: 'rgba(245,245,240,0.4)' }),
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rounds */}
            <div>
              <span style={S.label}>Rounds</span>
              <div style={{ display: 'flex', background: '#141413', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', padding: 3, gap: 3 }}>
                {[5, 10, 15].map(n => {
                  const sel = totalQuestions === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setTotalQuestions(n)}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 8,
                        border: sel ? '1px solid rgba(217,119,6,0.4)' : 'none',
                        background: sel ? 'rgba(217,119,6,0.15)' : 'transparent',
                        color: sel ? '#d97706' : 'rgba(245,245,240,0.4)',
                        fontWeight: sel ? 600 : 400,
                        fontSize: 16,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Enter Examination */}
          <button
            style={S.btnPrimary}
            onClick={handleStart}
          >
            <Play size={17} fill="currentColor" /> Enter Examination
          </button>
        </div>
      </div>
    );
  }

  /* ────────────────────────────── RESULTS SCREEN ─────────────────────────── */
  if (sessionDone) {
    const totalScore = scores.reduce((s, x) => s + x.score, 0);
    const totalMax   = scores.reduce((s, x) => s + x.max, 0);
    const pct        = Math.round((totalScore / totalMax) * 100);
    const pctColor   = pct >= 70 ? '#4ade80' : pct >= 50 ? '#fbbf24' : '#f87171';

    return (
      <div className="fade-in" style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#f5f5f0', margin: '0 0 4px' }}>Session Complete</h2>
          <p style={{ fontSize: 14, color: 'rgba(245,245,240,0.4)', margin: 0 }}>Here's your performance summary</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'start' }}>
          {/* Score card */}
          <div style={{ ...S.card, padding: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 52, fontWeight: 700, color: pctColor, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{pct}%</div>
            <div style={{ ...S.label, marginTop: 10, marginBottom: 0 }}>Score</div>
            <div style={{ fontSize: 13, color: 'rgba(245,245,240,0.4)', marginTop: 4 }}>{totalScore} / {totalMax} pts</div>
          </div>

          {/* Score table */}
          <div style={{ ...S.card, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,245,240,0.4)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Topic</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px', color: 'rgba(245,245,240,0.8)' }}>{s.topic}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#d97706', fontWeight: 600 }}>{s.score}/{s.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button style={S.btnPrimary} onClick={() => setSessionStarted(false)}>
          Start New Session
        </button>
      </div>
    );
  }

  /* ────────────────────────────── EXAM SCREEN ─────────────────────────────── */
  const diffBadgeStyle = difficulty === 'Easy'
    ? { background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }
    : difficulty === 'Medium'
      ? { background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }
      : { background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' };

  return (
    <div className="fade-in" style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>

      {/* ── Progress row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{
          background: 'rgba(217,119,6,0.15)',
          border: '1px solid rgba(217,119,6,0.3)',
          color: '#d97706',
          borderRadius: 50,
          padding: '6px 16px',
          fontSize: 13,
          fontWeight: 600,
        }}>
          Round {questionNumber + 1} of {totalQuestions}
        </span>

        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${((questionNumber + 1) / totalQuestions) * 100}%`,
            background: '#d97706',
            borderRadius: 10,
            transition: 'width 0.5s ease',
          }} />
        </div>

        <span style={{ ...diffBadgeStyle, borderRadius: 50, padding: '6px 16px', fontSize: 13, fontWeight: 600 }}>
          {difficulty}
        </span>
      </div>

      {/* ── Question card ── */}
      <div style={{ background: '#1e1e1c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {currentCategory && (
          <span style={{ fontSize: 11, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            {currentCategory}
          </span>
        )}
        <p style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#f5f5f0', lineHeight: 1.5 }}>
          {loading && !currentQuestion ? 'Loading question…' : currentQuestion}
        </p>

        {/* Hint */}
        {currentHint && !evaluation && (
          <div style={{
            background: 'rgba(217,119,6,0.08)',
            border: '1px solid rgba(217,119,6,0.2)',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <span style={{ color: '#d97706', fontSize: 16 }}>⚡</span>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(245,245,240,0.65)', lineHeight: 1.6 }}>{currentHint}</p>
          </div>
        )}
      </div>

      {/* ── Answer section ── */}
      {!evaluation ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnswerField value={currentAnswer} onChange={setCurrentAnswer} disabled={loading} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'rgba(245,245,240,0.4)' }}>
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
          </div>
          <button
            style={{ ...S.btnPrimary, opacity: loading || !currentAnswer.trim() ? 0.4 : 1, cursor: loading || !currentAnswer.trim() ? 'not-allowed' : 'pointer' }}
            onClick={handleSubmit}
            disabled={loading || !currentAnswer.trim()}
          >
            {loading
              ? <><RefreshCw size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Evaluating…<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></>
              : <>Submit Answer <ChevronRight size={17} /></>
            }
          </button>
        </div>
      ) : (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Score banner */}
          <div style={{ ...S.card, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(245,245,240,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Your Score</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: evaluation.score >= 7 ? '#4ade80' : '#f87171' }}>
                {evaluation.score} / {currentMarks}
              </div>
            </div>
            <div style={{
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              ...(evaluation.score >= 7
                ? { background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }
                : { background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }),
            }}>
              {evaluation.score >= 7 ? 'Passed' : 'Needs Review'}
            </div>
          </div>

          {/* Correct / Missing */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ ...S.card, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CheckCircle size={15} style={{ color: '#4ade80' }} />
                <span style={{ ...S.label, marginBottom: 0, color: '#4ade80' }}>Correct</span>
              </div>
              {evaluation.correct.length === 0
                ? <p style={{ margin: 0, fontSize: 14, color: 'rgba(245,245,240,0.4)', fontStyle: 'italic' }}>Nothing noted.</p>
                : evaluation.correct.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: '#4ade80', fontSize: 16, lineHeight: 1.4 }}>✓</span>
                    <p style={{ margin: 0, fontSize: 14, color: 'rgba(245,245,240,0.75)', lineHeight: 1.5 }}>{c}</p>
                  </div>
                ))
              }
            </div>
            <div style={{ ...S.card, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <XCircle size={15} style={{ color: '#f87171' }} />
                <span style={{ ...S.label, marginBottom: 0, color: '#f87171' }}>Missing</span>
              </div>
              {evaluation.missing.length === 0
                ? <p style={{ margin: 0, fontSize: 14, color: 'rgba(245,245,240,0.4)', fontStyle: 'italic' }}>Nothing missed.</p>
                : evaluation.missing.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: '#f87171', fontSize: 16, lineHeight: 1.4 }}>✗</span>
                    <p style={{ margin: 0, fontSize: 14, color: 'rgba(245,245,240,0.75)', lineHeight: 1.5 }}>{m}</p>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Model answer */}
          <div style={{ ...S.card, overflow: 'hidden' }}>
            <details>
              <summary style={{
                padding: '14px 20px',
                cursor: 'pointer',
                listStyle: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 14,
                fontWeight: 600,
                color: 'rgba(245,245,240,0.7)',
                userSelect: 'none',
              }}>
                Model Answer
                <ChevronDown size={15} style={{ color: 'rgba(245,245,240,0.4)' }} />
              </summary>
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.07)',
                background: '#141413',
                padding: 20,
                fontSize: 15,
                lineHeight: 1.7,
                color: 'rgba(245,245,240,0.75)',
                fontFamily: 'JetBrains Mono, monospace',
                whiteSpace: 'pre-wrap',
              }}>
                {evaluation.modelAnswer}
              </div>
            </details>
          </div>

          {/* Next round */}
          <button
            style={S.btnPrimary}
            onClick={handleNext}
          >
            Next Round → 
          </button>
        </div>
      )}
    </div>
  );
}

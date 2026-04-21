import { useState } from 'react';
import { Search, GraduationCap } from 'lucide-react';
import QueryGenerator from './components/QueryGenerator';
import VivaInterviewer from './components/VivaInterviewer';

function App() {
  const [activeTab, setActiveTab] = useState<'generator' | 'viva'>('generator');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f0f0e', color: '#f5f5f0' }}>

      {/* ── Header ── */}
      <header
        className="flex flex-col items-center gap-3 pt-10 pb-6 px-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 28 }}>🗄️</span>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: '#f5f5f0', margin: 0, letterSpacing: '-0.02em' }}>
            SQLMaster
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(245,245,240,0.4)', margin: 0 }}>
          Generate SQL. Ace Your Viva.
        </p>

        {/* ── Main Tabs ── */}
        <div
          className="flex mt-4"
          style={{
            background: '#262624',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 50,
            padding: 4,
          }}
        >
          {([
            { key: 'generator', label: 'SQL Generator', Icon: Search },
            { key: 'viva',      label: 'Viva Prep',     Icon: GraduationCap },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '8px 24px',
                borderRadius: 50,
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === key ? 600 : 400,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
                background: activeTab === key ? '#d97706' : 'transparent',
                color:      activeTab === key ? 'white'   : 'rgba(245,245,240,0.5)',
              }}
              onMouseEnter={e => { if (activeTab !== key) (e.currentTarget as HTMLButtonElement).style.color = '#f5f5f0'; }}
              onMouseLeave={e => { if (activeTab !== key) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,245,240,0.5)'; }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full max-w-[900px] mx-auto px-4 md:px-6 py-8">
        <div className="fade-in" key={activeTab}>
          {activeTab === 'generator' ? <QueryGenerator /> : <VivaInterviewer />}
        </div>
      </main>

      <footer
        className="text-center py-8"
        style={{ fontSize: 12, color: 'rgba(245,245,240,0.2)', letterSpacing: '0.1em' }}
      >
        © {new Date().getFullYear()} SQLMaster
      </footer>
    </div>
  );
}

export default App;

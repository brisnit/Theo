import { ArrowRight, BookOpenCheck, GraduationCap } from 'lucide-react';
import { Sparkline } from '../components/charts';
import { Wordmark } from '../components/ui';
import { courseStats, studentSummary } from '../data/insights';
import { DEMO_STUDENT } from '../data/mock';
import { C } from '../data/palette';
import { Link } from '../lib/router';

export function Home() {
  const eng = courseStats('st501');
  const maya = studentSummary(DEMO_STUDENT);
  return (
    <div className="home">
      <header className="home-top">
        <Wordmark />
        <span className="muted small">Fuller Theological Seminary · Prototype</span>
      </header>

      <main className="home-main">
        <div className="home-loop" aria-label="Predict, personalize, intervene, prove">
          {['Predict', 'Personalize', 'Intervene', 'Prove'].map((step, i) => (
            <span key={step}>{i > 0 && <ArrowRight size={13} />}{step}</span>
          ))}
        </div>
        <h1 className="home-title">THEO</h1>
        <p className="home-tagline">Predictive Learning for Fuller Theological Seminary</p>
        <p className="home-sub">Canvas tells you what happened. Theo helps you understand what happens next.</p>

        <div className="portal-grid">
          <Link to="/professor" className="portal-card">
            <div className="portal-top">
              <span className="portal-icon"><GraduationCap size={22} /></span>
              <span className="portal-arrow"><ArrowRight size={18} /></span>
            </div>
            <div className="portal-label">Professor Portal</div>
            <div className="portal-q">Who needs me?</div>
            <div className="portal-visual">
              <Sparkline data={eng.engagementTrend} projected={[eng.engagementTrend[7], 82, 80.5, 80]} height={56} />
            </div>
            <div className="portal-meta">Demo as Dr. Sarah Whitfield · 4 courses · 106 enrollments</div>
          </Link>

          <Link to="/student" className="portal-card">
            <div className="portal-top">
              <span className="portal-icon"><BookOpenCheck size={22} /></span>
              <span className="portal-arrow"><ArrowRight size={18} /></span>
            </div>
            <div className="portal-label">Student Portal</div>
            <div className="portal-q">What needs me?</div>
            <div className="portal-visual">
              <Sparkline data={maya.trend} projected={maya.projection.slice(0, 4)} height={56} color={C.peri} />
            </div>
            <div className="portal-meta">Demo as Maya Johnson · 4 courses</div>
          </Link>
        </div>

        <p className="home-foot"><span className="pulse" /> Powered by Canvas learning data</p>
      </main>
    </div>
  );
}

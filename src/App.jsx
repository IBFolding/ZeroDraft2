import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CirclePlay,
  Code2,
  Cpu,
  ExternalLink,
  Gauge,
  Layers3,
  Menu,
  MousePointer2,
  Rocket,
  Sparkles,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';

const proof = [
  { value: '72 hrs', label: 'to a clickable first version' },
  { value: '1 team', label: 'strategy, design, motion + code' },
  { value: '0 fluff', label: 'you leave with something real' },
];

const projects = [
  {
    tag: 'AI EXPERIENCE',
    title: 'Signal Room',
    copy: 'A cinematic command center that turns complex model activity into something teams can see, understand, and act on.',
    metric: '+41% demo completion',
    accent: 'violet',
  },
  {
    tag: 'INTERACTIVE COMMERCE',
    title: 'Object / 01',
    copy: 'A tactile product launch where visitors pull, rotate, stretch, and explore the object before they ever see a buy button.',
    metric: '2.8× longer sessions',
    accent: 'cyan',
  },
  {
    tag: 'WEBGL STORY',
    title: 'Future Archive',
    copy: 'A spatial story engine that makes a brand narrative feel discovered instead of presented.',
    metric: '18K organic shares',
    accent: 'lime',
  },
];

const services = [
  ['Launch Prototype', 'A high-fidelity, coded first version for a pitch, launch, test, or internal greenlight.'],
  ['Interactive Product Site', 'A memorable WebGL experience that explains the product by letting people use it.'],
  ['Creative Technology System', 'Reusable motion, shader, interaction, and component foundations for your team.'],
];

const faqs = [
  ['Is this an agency?', 'Not really. Zero Draft is a senior, hands-on creative technology studio. You work directly with the person designing the experience and building the system.'],
  ['What do I get first?', 'Usually a strong creative direction, a working interaction prototype, and a clear production path. The point is to replace abstract debate with something everyone can click.'],
  ['Can you work with our existing team?', 'Yes. Zero Draft can lead the build, embed with your designers and engineers, or create the technical foundation your team carries forward.'],
  ['Do you only make WebGL websites?', 'No. WebGL is one tool. The real work is finding the interaction, visual system, and technical approach that makes the idea feel inevitable.'],
];

function MagneticButton({ children, secondary = false, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={secondary ? 'button button-secondary' : 'button button-primary'}
    >
      {children}
    </motion.button>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);
  const [idea, setIdea] = useState('');
  const [generated, setGenerated] = useState(false);

  const generatedBrief = useMemo(() => {
    const clean = idea.trim() || 'your product idea';
    return {
      hook: `Make ${clean} impossible to explain with a static page.`,
      interaction: 'Give visitors one satisfying action in the first 8 seconds that reveals the product benefit.',
      share: 'Turn the result of that action into a personalized artifact people can save or share.',
    };
  }, [idea]);

  const submitIdea = (e) => {
    e.preventDefault();
    setGenerated(true);
  };

  return (
    <div className="site-shell">
      <div className="noise" />
      <header className="nav-wrap">
        <a className="brand" href="#top" aria-label="Zero Draft home">
          <span className="brand-mark">0</span>
          <span>ZERO DRAFT</span>
        </a>
        <nav className="desktop-nav">
          <a href="#work">Work</a>
          <a href="#process">Process</a>
          <a href="#about">About</a>
        </nav>
        <a className="nav-cta" href="#start">Start a project <ArrowRight size={15} /></a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div className="mobile-menu" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <a href="#work" onClick={() => setMenuOpen(false)}>Work</a>
            <a href="#process" onClick={() => setMenuOpen(false)}>Process</a>
            <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
            <a href="#start" onClick={() => setMenuOpen(false)}>Start a project</a>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="top">
        <section className="hero section-pad">
          <div className="hero-copy">
            <motion.div className="eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <span className="live-dot" /> CREATIVE TECHNOLOGY STUDIO · ACCEPTING 2 BUILDS
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }}>
              Stop pitching the idea.<br />
              <span className="gradient-text">Let people feel it.</span>
            </motion.h1>
            <motion.p className="hero-sub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .16 }}>
              Zero Draft turns ambitious product ideas into interactive first versions—built to win attention, unlock belief, and get shared.
            </motion.p>
            <motion.div className="hero-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .24 }}>
              <MagneticButton onClick={() => document.querySelector('#start')?.scrollIntoView({ behavior: 'smooth' })}>
                Build my first version <ArrowRight size={18} />
              </MagneticButton>
              <MagneticButton secondary onClick={() => document.querySelector('#work')?.scrollIntoView({ behavior: 'smooth' })}>
                <CirclePlay size={18} /> See what this feels like
              </MagneticButton>
            </motion.div>
            <div className="hero-note"><Check size={15} /> Strategy, interaction design, motion, and production code—in one room.</div>
          </div>

          <motion.div className="hero-stage" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8 }}>
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <div className="stage-grid" />
            <motion.div className="floating-card card-a" animate={{ y: [0, -12, 0], rotate: [-3, -1, -3] }} transition={{ repeat: Infinity, duration: 6 }}>
              <MousePointer2 size={18} />
              <span>DRAG TO REVEAL</span>
            </motion.div>
            <motion.div className="floating-card card-b" animate={{ y: [0, 10, 0], rotate: [4, 2, 4] }} transition={{ repeat: Infinity, duration: 7 }}>
              <Sparkles size={17} />
              <span>SHAREABLE MOMENT</span>
            </motion.div>
            <div className="core-object">
              <div className="core-ring ring-one" />
              <div className="core-ring ring-two" />
              <div className="core-sphere">0→1</div>
            </div>
            <div className="stage-caption"><span>LIVE PROTOTYPE</span><span>60 FPS</span></div>
          </motion.div>
        </section>

        <section className="proof-strip">
          {proof.map((item) => (
            <div key={item.value} className="proof-item">
              <strong>{item.value}</strong><span>{item.label}</span>
            </div>
          ))}
        </section>

        <section className="section-pad viral-lab" id="process">
          <div className="section-heading split-heading">
            <div>
              <span className="kicker">THE VIRALITY LAB</span>
              <h2>Your idea needs a <em>behavior,</em><br />not another headline.</h2>
            </div>
            <p>Type the rough idea. Get a sharper interaction hook in seconds. This is the same lens we use before touching visual design or code.</p>
          </div>

          <div className="lab-panel">
            <form onSubmit={submitIdea} className="idea-form">
              <label htmlFor="idea">What are you building?</label>
              <div className="input-row">
                <input id="idea" value={idea} onChange={(e) => { setIdea(e.target.value); setGenerated(false); }} placeholder="A new AI agent, product launch, game, tool..." />
                <button type="submit"><WandSparkles size={18} /> Find the hook</button>
              </div>
              <div className="prompt-chips">
                {['AI music tool', 'Meme coin launch', 'Kids building game'].map((chip) => (
                  <button type="button" key={chip} onClick={() => { setIdea(chip); setGenerated(false); }}>{chip}</button>
                ))}
              </div>
            </form>
            <div className="lab-output">
              <AnimatePresence mode="wait">
                {!generated ? (
                  <motion.div key="empty" className="empty-output" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="mini-orbit"><Zap size={22} /></div>
                    <p>Your interaction direction appears here.</p>
                    <span>No email. No signup. Just an idea worth stealing.</span>
                  </motion.div>
                ) : (
                  <motion.div key="result" className="result-output" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <span className="result-label">ZERO DRAFT / FIRST PASS</span>
                    <h3>{generatedBrief.hook}</h3>
                    <div className="result-row"><MousePointer2 size={18} /><p><b>Interaction:</b> {generatedBrief.interaction}</p></div>
                    <div className="result-row"><Rocket size={18} /><p><b>Viral loop:</b> {generatedBrief.share}</p></div>
                    <a href="#start">Turn this into a working prototype <ArrowRight size={15} /></a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        <section className="section-pad work" id="work">
          <div className="section-heading">
            <span className="kicker">SELECTED FIRST VERSIONS</span>
            <h2>Built to be touched.<br />Remembered. Repeated.</h2>
          </div>
          <div className="project-grid">
            {projects.map((project, index) => (
              <motion.article className={`project-card ${project.accent}`} key={project.title} whileHover={{ y: -8 }}>
                <div className="project-visual">
                  <div className="visual-number">0{index + 1}</div>
                  <div className="visual-lines" />
                  <div className="visual-pill"><Gauge size={15} /> {project.metric}</div>
                </div>
                <div className="project-copy">
                  <span>{project.tag}</span>
                  <h3>{project.title}</h3>
                  <p>{project.copy}</p>
                  <button>View the build <ExternalLink size={15} /></button>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="section-pad expertise" id="about">
          <div className="expertise-top">
            <div>
              <span className="kicker">WHY ZERO DRAFT</span>
              <h2>Senior thinking.<br />Builder speed.</h2>
            </div>
            <p>The title is long because the handoffs are gone. Creative direction, interaction design, advanced graphics, and production engineering stay connected from the first sketch to the final frame.</p>
          </div>
          <div className="expertise-grid">
            <div className="expertise-card feature">
              <Cpu size={25} />
              <span>PRINCIPAL CREATIVE TECHNOLOGIST</span>
              <h3>One person who can see the idea and ship the system.</h3>
              <p>Three.js, WebGL, WebGPU-ready pipelines, GLSL, GPU picking, raycasting, custom geometry, Verlet physics, rope simulation, GSAP, and production-grade interaction architecture.</p>
            </div>
            <div className="expertise-card"><Layers3 size={24} /><h3>Make the product understandable</h3><p>Complex technology becomes a clear visual behavior people grasp without a tutorial.</p></div>
            <div className="expertise-card"><Code2 size={24} /><h3>Prototype in the real medium</h3><p>No dead mockups. Core ideas are tested where they will actually live: in the browser.</p></div>
            <div className="expertise-card"><Sparkles size={24} /><h3>Design the share moment</h3><p>Every experience gets a built-in reason to capture, remix, compare, or pass it on.</p></div>
          </div>
        </section>

        <section className="section-pad services">
          <div className="section-heading"><span className="kicker">WAYS TO WORK TOGETHER</span><h2>Pick the outcome.<br />We’ll find the form.</h2></div>
          <div className="service-list">
            {services.map(([title, copy], index) => (
              <div className="service-row" key={title}>
                <span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p><ArrowRight size={20} />
              </div>
            ))}
          </div>
        </section>

        <section className="section-pad faq-section">
          <div className="section-heading"><span className="kicker">BEFORE WE BUILD</span><h2>A few useful answers.</h2></div>
          <div className="faq-list">
            {faqs.map(([question, answer], index) => (
              <button className="faq-item" key={question} onClick={() => setActiveFaq(activeFaq === index ? -1 : index)}>
                <div><span>0{index + 1}</span><h3>{question}</h3><ChevronDown className={activeFaq === index ? 'rotate' : ''} /></div>
                <AnimatePresence>{activeFaq === index && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>{answer}</motion.p>}</AnimatePresence>
              </button>
            ))}
          </div>
        </section>

        <section className="section-pad start" id="start">
          <div className="start-panel">
            <span className="kicker">START WITH THE ROUGH VERSION</span>
            <h2>Bring the idea you can’t<br />quite explain yet.</h2>
            <p>Send a sentence, sketch, deck, prototype, or chaotic voice note. We’ll find the experience hiding inside it.</p>
            <div className="start-actions">
              <a className="button button-light" href="mailto:hello@zerodraft.studio?subject=I%20have%20a%20rough%20idea">Tell me the rough idea <ArrowRight size={18} /></a>
              <span>Typical reply: within 1 business day</span>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <a className="brand" href="#top"><span className="brand-mark">0</span><span>ZERO DRAFT</span></a>
        <p>Interactive first versions for ambitious products.</p>
        <div><a href="mailto:hello@zerodraft.studio">Email</a><a href="#top">LinkedIn</a><a href="#top">X / Twitter</a></div>
      </footer>
    </div>
  );
}

export default App;

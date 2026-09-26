import { useEffect, useState } from 'react';
import { TopNav, WorldNav, SiteFooter } from './components/ui';
import MiniPlayer from './components/MiniPlayer';
import DemoBanner from './components/DemoBanner';
import Home from './pages/Home';
import TapeShop from './pages/TapeShop';
import RecordStore from './pages/RecordStore';
import Vending from './pages/Vending';
import Jukebox from './pages/Jukebox';
import Arcade from './pages/Arcade';
import MyRoom from './pages/MyRoom';
import About from './pages/About';
import { FOOTER_QUOTES } from './data';

const PAGES = {
  home: Home,
  'tape-shop': TapeShop,
  'record-store': RecordStore,
  vending: Vending,
  jukebox: Jukebox,
  arcade: Arcade,
  'my-room': MyRoom,
  about: About,
};

const readHash = () => {
  const r = window.location.hash.replace(/^#\/?/, '') || 'home';
  return PAGES[r] ? r : 'home';
};

export default function App() {
  const [route, setRoute] = useState(readHash);

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [route]);

  const go = (r) => { window.location.hash = `/${r}`; setRoute(PAGES[r] ? r : 'home'); };

  const Page = PAGES[route];
  const quote = FOOTER_QUOTES[route] || FOOTER_QUOTES.home;

  return (
    <div className="world-bg pb-[104px]">
      <div className="grime" />
      <div className="scanlines" />
      <div className="vignette" />

      <DemoBanner />
      <TopNav route={route} go={go} />

      <main key={route}>
        <Page go={go} />
      </main>

      {/* world module bar on every interior page */}
      {route !== 'home' && (
        <div className="pt-2">
          <WorldNav active={route} go={go} />
        </div>
      )}

      <SiteFooter quote={quote} />
      <MiniPlayer />
    </div>
  );
}

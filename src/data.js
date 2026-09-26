export const OPENSEA_URL = 'https://opensea.io/collection/mix-tape-os';

export const WORLD = [
  { id: 'tapeshop',    route: 'tape-shop',    label: 'TAPE SHOP',    art: '/art/tile-tapeshop.webp',    blurb: 'NEW DROPS DAILY' },
  { id: 'recordstore', route: 'record-store', label: 'RECORD STORE', art: '/art/tile-recordstore.webp', blurb: 'DIG DEEPER' },
  { id: 'vending',     route: 'vending',      label: 'VENDING',      art: '/art/tile-vending.webp',     blurb: 'GOOD MUSIC ANY TIME' },
  { id: 'jukebox',     route: 'jukebox',      label: 'JUKEBOX',      art: '/art/tile-jukebox.webp',     blurb: 'PLAY SHARE DISCOVER' },
  { id: 'arcade',      route: 'arcade',       label: 'ARCADE',       art: '/art/tile-arcade.webp',      blurb: 'MUSIC GAMES REWARDS' },
  { id: 'myroom',      route: 'my-room',      label: 'MY ROOM',      art: '/art/tile-myroom.webp',      blurb: 'YOUR SPACE YOUR TAPES' },
];

export const NAV = [
  { route: 'home',         label: 'HOME',         icon: 'home' },
  { route: 'tape-shop',    label: 'TAPE SHOP',    icon: 'tape' },
  { route: 'record-store', label: 'RECORD STORE', icon: 'disc' },
  { route: 'jukebox',      label: 'WORLD',        icon: 'globe' },
  { route: 'about',        label: 'ABOUT',        icon: 'file' },
];

export const NOW_PLAYING = {
  title: 'Internet Forever',
  artist: 'The Pixel Kids',
  elapsed: '02:14',
  total: '03:56',
};

export const NEW_ARRIVALS = [
  { id: 1, title: 'Neon Dreams',      artist: 'LUNA BYTE',      edition: '1 / 250', eth: '0.04', usd: '$130', art: '/art/tape01.webp', isNew: true },
  { id: 2, title: 'Basement Sessions',artist: 'JAY K',          edition: '1 / 100', eth: '0.03', usd: '$97',  art: '/art/tape02.webp', isNew: true },
  { id: 3, title: 'City Fragments',   artist: 'NOVA LEE',       edition: '1 / 380', eth: '0.05', usd: '$162', art: '/art/tape03.webp', isNew: true },
  { id: 4, title: 'Analog Hearts',    artist: 'THE SATELLITES', edition: '1 / 200', eth: '0.04', usd: '$130', art: '/art/tape04.webp', isNew: true },
  { id: 5, title: 'PXL Radio Vol. 1', artist: 'VARIOUS',        edition: '1 / 777', eth: '0.06', usd: '$195', art: '/art/tape05.webp', isNew: true },
];

export const HOT_THIS_WEEK = [
  { id: 6,  title: 'Midnight Protocol', artist: 'KAI RYU',  edition: '1 / 333', eth: '0.06', usd: '$195', art: '/art/tape06.webp' },
  { id: 7,  title: 'Cloud Memory',      artist: 'TEA ROOM', edition: '1 / 500', eth: '0.05', usd: '$162', art: '/art/tape07.webp' },
  { id: 8,  title: 'Ripples',           artist: 'MISO',     edition: '1 / 250', eth: '0.04', usd: '$130', art: '/art/tape08.webp' },
  { id: 9,  title: 'Tapes & Friends',   artist: 'DJ BOOL',  edition: '1 / 420', eth: '0.05', usd: '$162', art: '/art/tape09.webp' },
  { id: 10, title: 'After Hours',       artist: 'SKYLINE',  edition: '1 / 350', eth: '0.06', usd: '$195', art: '/art/tape10.webp' },
];

export const GENRES = ['ALL GENRES','HIP HOP','ELECTRONIC','INDIE','LO-FI','ROCK','POP','AMBIENT','EXPERIMENTAL','OTHER'];
export const FILTER_GROUPS = ['PRICE RANGE','EDITION SIZE','AVAILABILITY','FEATURES'];

export const TRACKS = [
  { n: 1, title: 'Internet Forever', artist: 'The Pixel Kids', time: '03:24' },
  { n: 2, title: 'Neon Sunday',      artist: 'Luna Park',      time: '04:12' },
  { n: 3, title: 'Back to Better',   artist: 'Cloud Habit',    time: '03:56' },
  { n: 4, title: 'Same Humans',      artist: 'The Kitchen',    time: '02:48' },
  { n: 5, title: 'Midnight Balcony', artist: 'Nightbus',       time: '04:31' },
];

export const SHELLS = ['#c9ced8','#111318','#ff2fa0','#2f6bff','#b6ff2e','#f2ead2','#ff5a3c'];
export const LABEL_STYLES = [
  { id: 'mixtape', name: 'MIX TAPE', bg: 'linear-gradient(150deg,#ffd0e8,#ff2b9d)' },
  { id: 'sunset',  name: 'SUNSET',   bg: 'linear-gradient(150deg,#ff9a5c,#8f3bff)' },
  { id: 'checker', name: 'CHECKER',  bg: 'repeating-conic-gradient(#b6ff2e 0 25%,#0d0f13 0 50%) 0 0/14px 14px' },
  { id: 'blank',   name: 'BLANK',    bg: 'linear-gradient(150deg,#f4f1e6,#cfc9b6)' },
];
export const STICKERS = ['🙂','👑','💗','⭐','🐱','⚡','👾','🪐','💜','🌸'];

export const VENDING_SLOTS = [
  { slot: 1,  title: 'Neon Dreams',     artist: 'LUNA BYTE',   eth: '0.005', usd: '$4.99', art: '/art/tape01.webp' },
  { slot: 2,  title: 'Basement Vibes',  artist: 'JAY K.',      eth: '0.007', usd: '$6.99', art: '/art/tape02.webp' },
  { slot: 3,  title: 'Internet Forever',artist: 'The Pixel Kids', eth: '0.006', usd: '$5.99', art: '/art/tape03.webp' },
  { slot: 4,  title: 'Midnight Protocol',artist: 'CRT GHOST',  eth: '0.006', usd: '$5.99', art: '/art/tape06.webp' },
  { slot: 5,  title: 'Sunday Tapes',    artist: 'NIA SUN',     eth: '0.005', usd: '$4.99', art: '/art/tape07.webp' },
  { slot: 6,  title: 'Garden State',    artist: 'KAIRO',       eth: '0.006', usd: '$5.99', art: '/art/tape08.webp' },
  { slot: 7,  title: 'Pixel Heartbreak',artist: 'VHS LUV',     eth: '0.007', usd: '$6.99', art: '/art/tape04.webp' },
  { slot: 8,  title: 'More Human',      artist: 'VARIOUS',     eth: '0.005', usd: '$4.99', art: '/art/tape05.webp' },
  { slot: 9,  title: 'Late Night Loops',artist: 'DJ NOISE',    eth: '0.006', usd: '$5.99', art: '/art/tape10.webp' },
  { slot: 10, title: 'Good People',     artist: 'MIX TAPE OS', eth: '0.008', usd: '$7.99', art: '/art/tape09.webp' },
];

export const UP_NEXT = [
  { n: 1, title: 'Midnight Drive',    by: 'Neon Palms',     time: '04:21', art: '/art/tape01.webp' },
  { n: 2, title: 'Coffee & Pixels',   by: 'lo-fi luna',     time: '03:12', art: '/art/tape02.webp' },
  { n: 3, title: 'Basement Sunrise',  by: 'The Analog Club',time: '04:03', art: '/art/tape03.webp' },
  { n: 4, title: 'Digital Daydreams', by: 'CRT Society',    time: '02:58', art: '/art/tape04.webp' },
  { n: 5, title: 'Tapes Change Lives',by: 'Mix Tape OS',    time: '03:46', art: '/art/tape05.webp' },
];

export const PUBLIC_QUEUE = [
  { n: 6,  title: 'Rainy Window',     by: 'bstr_dreams', time: '03:21', art: '/art/tape06.webp' },
  { n: 7,  title: 'Island Offline',   by: 'kai.wav',     time: '04:10', art: '/art/tape07.webp' },
  { n: 8,  title: 'Friends In Stereo',by: 'tape.girl',   time: '02:49', art: '/art/tape08.webp' },
  { n: 9,  title: 'Neon Letters',     by: 'ruggernaut',  time: '03:33', art: '/art/tape09.webp' },
  { n: 10, title: 'Sunday Rewind',    by: 'mellowmax',   time: '04:27', art: '/art/tape10.webp' },
];

export const CHANNELS = [
  { name: 'COMMUNITY PICKS',  icon: '💗', tint: '#ff2fa0' },
  { name: 'LATE NIGHT VIBES', icon: '🌙', tint: '#49e2ff' },
  { name: 'LO-FI FOREVER',    icon: '🏙️', tint: '#a45cff' },
  { name: 'UNDERGROUND GEMS', icon: '💎', tint: '#49e2ff' },
  { name: 'TAPE SWAP RADIO',  icon: '📡', tint: '#b6ff2e' },
  { name: 'NEW ARTISTS DAILY',icon: '🆕', tint: '#ff2fa0' },
];

export const JUKE_SELECTOR = [
  'MUSIC PEOPLE','GOOD VIBES','REAL CONNECTIONS','TAPES FOREVER','PLAY MORE','A BRIGHTER TOMORROW',
];

export const LEADERBOARD = [
  { rank: 1, player: 'NebulaKid',  score: '3,024,880', tapes: '2,500' },
  { rank: 2, player: 'tapeghost',  score: '2,903,410', tapes: '2,000' },
  { rank: 3, player: 'vinylpanda', score: '2,441,992', tapes: '1,500' },
  { rank: 4, player: 'mixmaster',  score: '1,885,320', tapes: '1,000' },
  { rank: 5, player: 'you?',       score: '012,480',   tapes: '---', you: true },
];

export const REWARDS = [
  { task: 'PLAY 1 SONG',      reward: '+50 $TAPES',  done: true },
  { task: 'REACH 10K SCORE',  reward: '+250 $TAPES', done: false },
  { task: 'KEEP A 50 STREAK', reward: '+500 $TAPES', done: false },
];

export const GAME_MODES = [
  { name: 'BEAT RUNNER', desc: 'RUN. JUMP. COLLECT. VIBE. STAY IN SYNC, GO FURTHER.' },
  { name: 'TAPE STACKER', desc: 'STACK THE DROPS. DO NOT BREAK THE CHAIN.' },
  { name: 'GRID DJ',      desc: 'BUILD THE LOOP. FILL THE ROOM. KEEP IT HUMAN.' },
];

export const MY_TAPES = ['LATE NIGHTS','CITY DREAMS','INTERNET FRIENDS','LO-FI FOREVER','ROAD TRIPS','BETTER DAYS'];
export const MY_FAVES = ['Internet Forever','Midnight Drive','Pixel Hearts','Real Connections','Music People','A Brighter Tomorrow'];
export const GIFTS = [
  { to: 'Tape_Cat', from: 'SkyBeats' },
  { to: 'Tape_Cat', from: 'NeonNeko' },
  { to: 'Tape_Cat', from: 'Beatmkr' },
];

export const ROOM_MODULES = [
  { label: 'MY COLLECTION', copy: 'ALL YOUR TAPES IN ONE PLACE',  art: '/art/room-collection.webp' },
  { label: 'FAVORITES',     copy: 'YOUR FAVORITE MIXTAPES',       art: '/art/room-favorites.webp' },
  { label: 'GIFT A TAPE',   copy: 'SEND MUSIC SPREAD GOODNESS',   art: '/art/room-gift.webp' },
  { label: 'CUSTOMIZE',     copy: 'MAKE IT YOURS',                art: '/art/room-customize.webp' },
  { label: 'PROFILE',       copy: 'AVATAR STATS BADGES WALLET',   art: '/art/room-profile.webp' },
  { label: 'FRIENDS',       copy: 'YOUR MUSIC PEOPLE',            art: '/art/room-friends.webp' },
];

export const FOOTER_QUOTES = {
  home: ['"MIX TAPE OS FEELS LIKE HOME."', '- A COLLECTOR, SOMEWHERE ONLINE'],
  'tape-shop': ['"MIX TAPE OS FEELS LIKE HOME."', '- A COLLECTOR, SOMEWHERE ONLINE'],
  'record-store': ['"COLLECT TAPES. SUPPORT ARTISTS. KEEP MUSIC HUMAN."', ''],
  vending: ['"TAPES IN, BRIGHTER DAYS OUT."', '- THE MIX TAPE OS CREW'],
  jukebox: ['"MUSIC SOUNDS BETTER TOGETHER."', '- A GLOBAL LISTENING ROOM'],
  arcade: ['"GAMES SOUND BETTER ON MIX TAPE OS."', '- A MUSIC PERSON, SOMEWHERE ONLINE'],
  'my-room': ['"THIS IS MY ROOM. BUILT FROM MIX TAPES."', '- TAPE_CAT, SOMEWHERE ONLINE'],
  about: ['"MAKE MUSIC PHYSICAL AGAIN."', '- MIX TAPE OS'],
};

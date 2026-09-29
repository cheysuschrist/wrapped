import React, { useState, useEffect } from 'react';
import { Share2, Plus, Trash2, ArrowRight, ArrowLeft, Sparkles, Volume2, VolumeX } from 'lucide-react';

export default function WrappedGenerator() {
  const [step, setStep] = useState('landing');
  const [title, setTitle] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [stats, setStats] = useState([{ label: '', value: '' }]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedMusic, setSelectedMusic] = useState('');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState(null);

  const musicTracks = [
    { id: 'none', name: 'No Music', url: '' },
    { id: 'lofi1', name: 'Chill Lofi Beats', url: 'https://cdn.pixabay.com/download/audio/2022/05/13/audio_1808fbf07a.mp3' },
    { id: 'lofi2', name: 'Relaxing Hip Hop', url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_4e3f2f1e14.mp3' },
    { id: 'lofi3', name: 'Smooth Jazz Hop', url: 'https://cdn.pixabay.com/download/audio/2022/08/23/audio_d9c6f8d7e3.mp3' },
    { id: 'lofi4', name: 'Late Night Vibes', url: 'https://cdn.pixabay.com/download/audio/2023/02/28/audio_5fdc2164d6.mp3' },
    { id: 'lofi5', name: 'Study Session', url: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_3a63b6747e.mp3' },
  ];

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const addStat = () => {
    setStats([...stats, { label: '', value: '' }]);
  };

  const removeStat = (index) => {
    setStats(stats.filter((_, i) => i !== index));
  };

  const updateStat = (index, field, value) => {
    const newStats = [...stats];
    newStats[index][field] = value;
    setStats(newStats);
  };

  const handleMusicSelect = (musicId) => {
    setSelectedMusic(musicId);
    
    // Stop current music if playing
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    
    // Start new music if not "none"
    if (musicId && musicId !== 'none') {
      const track = musicTracks.find(t => t.id === musicId);
      if (track && track.url) {
        const audio = new Audio(track.url);
        audio.loop = true;
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio play failed:', e));
        setAudioElement(audio);
        setAudioPlaying(true);
      }
    } else {
      setAudioElement(null);
      setAudioPlaying(false);
    }
  };

  const generateWrapped = () => {
    if (title && stats.some(s => s.label && s.value)) {
      setStep('preview');
      setCurrentSlide(0);
      
      // Keep playing existing music if it's already playing
      if (audioElement && !audioPlaying) {
        audioElement.play().catch(e => console.log('Audio play failed:', e));
        setAudioPlaying(true);
      }
    }
  };

  const resetWrapped = () => {
    setTitle('');
    setDateRange('');
    setStats([{ label: '', value: '' }]);
    setSelectedMusic('');
    setStep('input');
    setCurrentSlide(0);
    
    // Stop music
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setAudioElement(null);
      setAudioPlaying(false);
    }
  };

  const toggleMusic = () => {
    if (audioElement) {
      if (audioPlaying) {
        audioElement.pause();
        setAudioPlaying(false);
      } else {
        audioElement.play();
        setAudioPlaying(true);
      }
    }
  };

  const nextSlide = () => {
    if (currentSlide < stats.filter(s => s.label && s.value).length) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const shareWrapped = () => {
    const wrappedData = encodeURIComponent(JSON.stringify({ title, dateRange, stats }));
    const url = `${window.location.origin}${window.location.pathname}?data=${wrappedData}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const formatValue = (value) => {
    if (!isNaN(value) && value.trim() !== '') {
      return <div className="text-8xl font-black tracking-tight">{value}</div>;
    }
    
    if (value.includes(':') || value.includes(',')) {
      const parts = value.split(':');
      if (parts.length > 1) {
        const items = parts[1].split(',').map(item => item.trim()).filter(item => item);
        return (
          <div className="text-left max-w-md mx-auto">
            <div className="text-3xl font-bold mb-6">{parts[0].trim()}</div>
            <ul className="space-y-3">
              {items.map((item, idx) => (
                <li key={idx} className="text-2xl font-medium flex items-start">
                  <span className="mr-4 text-3xl">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      } else {
        const items = value.split(',').map(item => item.trim()).filter(item => item);
        return (
          <ul className="space-y-3 text-left max-w-md mx-auto">
            {items.map((item, idx) => (
              <li key={idx} className="text-2xl font-medium flex items-start">
                <span className="mr-4 text-3xl">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        );
      }
    }
    
    return <div className="text-5xl font-bold leading-tight max-w-lg">{value}</div>;
  };

  const validStats = stats.filter(s => s.label && s.value);

  const LavaLampBackground = ({ variant = 'default' }) => (
    <div className="absolute inset-0 overflow-hidden">
      <div 
        className="absolute w-96 h-96 rounded-full mix-blend-screen filter blur-3xl opacity-70 transition-all duration-[3000ms] ease-in-out"
        style={{
          background: variant === 'pink' ? 'linear-gradient(135deg, #ff006e 0%, #8338ec 100%)' : 
                     variant === 'orange' ? 'linear-gradient(135deg, #ff006e 0%, #fb5607 100%)' :
                     variant === 'yellow' ? 'linear-gradient(135deg, #ffbe0b 0%, #fb5607 100%)' :
                     variant === 'cyan' ? 'linear-gradient(135deg, #06ffa5 0%, #4361ee 100%)' :
                     'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          top: `${20 + Math.sin(Date.now() / 3000) * 10}%`,
          left: `${20 + Math.cos(Date.now() / 2000) * 15}%`,
        }}
      />
      <div 
        className="absolute w-80 h-80 rounded-full mix-blend-screen filter blur-3xl opacity-70 transition-all duration-[4000ms] ease-in-out"
        style={{
          background: variant === 'pink' ? 'linear-gradient(135deg, #3a86ff 0%, #8338ec 100%)' :
                     variant === 'orange' ? 'linear-gradient(135deg, #fb5607 0%, #ff006e 100%)' :
                     variant === 'yellow' ? 'linear-gradient(135deg, #06ffa5 0%, #ffbe0b 100%)' :
                     variant === 'cyan' ? 'linear-gradient(135deg, #4361ee 0%, #7209b7 100%)' :
                     'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          top: `${60 + Math.sin(Date.now() / 4000 + 2) * 15}%`,
          right: `${15 + Math.cos(Date.now() / 3000 + 1) * 10}%`,
        }}
      />
      <div 
        className="absolute w-72 h-72 rounded-full mix-blend-screen filter blur-3xl opacity-70 transition-all duration-[5000ms] ease-in-out"
        style={{
          background: variant === 'pink' ? 'linear-gradient(135deg, #ff006e 0%, #3a86ff 100%)' :
                     variant === 'orange' ? 'linear-gradient(135deg, #8338ec 0%, #fb5607 100%)' :
                     variant === 'yellow' ? 'linear-gradient(135deg, #ffbe0b 0%, #06ffa5 100%)' :
                     variant === 'cyan' ? 'linear-gradient(135deg, #06ffa5 0%, #3a86ff 100%)' :
                     'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          bottom: `${15 + Math.sin(Date.now() / 3500 + 4) * 12}%`,
          left: `${40 + Math.cos(Date.now() / 2500 + 3) * 8}%`,
        }}
      />
      <div 
        className="absolute w-64 h-64 rounded-full mix-blend-screen filter blur-3xl opacity-60 transition-all duration-[4500ms] ease-in-out"
        style={{
          background: variant === 'pink' ? 'linear-gradient(135deg, #8338ec 0%, #ff006e 100%)' :
                     variant === 'orange' ? 'linear-gradient(135deg, #ffbe0b 0%, #ff006e 100%)' :
                     variant === 'yellow' ? 'linear-gradient(135deg, #fb5607 0%, #ffbe0b 100%)' :
                     variant === 'cyan' ? 'linear-gradient(135deg, #7209b7 0%, #06ffa5 100%)' :
                     'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
          top: `${40 + Math.sin(Date.now() / 2800 + 5) * 10}%`,
          right: `${35 + Math.cos(Date.now() / 3200 + 2) * 12}%`,
        }}
      />
    </div>
  );

  const getBackgroundVariant = (index) => {
    const variants = ['pink', 'orange', 'yellow', 'cyan', 'default'];
    return variants[index % variants.length];
  };

  // Landing Page
  if (step === 'landing') {
    return <LandingPage onStart={() => setStep('input')} />;
  }

  // Input Page
  if (step === 'input') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-950 relative overflow-hidden p-6 flex items-center justify-center">
        <LavaLampBackground variant="pink" />

        <div className="absolute inset-0 opacity-[0.10]" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'2.5\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
          backgroundSize: '200px 200px'
        }}></div>

        <div className="relative z-10 max-w-2xl w-full bg-black/40 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-white/20">
          {/* Music Control Button */}
          {audioElement && (
            <button
              onClick={toggleMusic}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-sm border-2 border-white/20 z-10"
            >
              {audioPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          )}

          <h1 className="text-5xl font-black text-white mb-3 tracking-tight">Create Your Wrapped</h1>
          <p className="text-white/80 mb-10 text-lg">Track anything you want and share it with friends</p>
          
          <div className="space-y-8">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <label className="block text-white mb-3 font-bold text-lg uppercase tracking-wide">Wrapped Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Adventures"
                className="w-full px-5 py-4 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm font-medium text-lg"
              />
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <label className="block text-white mb-3 font-bold text-lg uppercase tracking-wide">Date Range</label>
              <input
                type="text"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                placeholder="2025 or Jan - Mar 2025 (optional)"
                className="w-full px-5 py-4 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm font-medium text-lg"
              />
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <label className="text-white font-bold text-lg uppercase tracking-wide">Your Stats</label>
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <label className="block text-white mb-3 font-bold text-lg uppercase tracking-wide">Background Music</label>
              <select
                value={selectedMusic}
                onChange={(e) => setSelectedMusic(e.target.value)}
                className="w-full px-5 py-4 rounded-xl bg-white/10 border-2 border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm font-medium text-lg"
              >
                {musicTracks.map(track => (
                  <option key={track.id} value={track.id} className="bg-purple-900 text-white">
                    {track.name}
                  </option>
                ))}
              </select>
              <p className="text-white/60 text-sm mt-2">Choose a lofi hip-hop track for your wrapped</p>
            </div>

            <button
                  onClick={addStat}
                  className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors border-2 border-white/20 font-bold"
                >
                  <Plus size={20} />
                  Add Stat
                </button>
              </div>

              <div className="space-y-4">
                {stats.map((stat, index) => (
                  <div key={index} className="flex gap-3">
                    <input
                      type="text"
                      value={stat.label}
                      onChange={(e) => updateStat(index, 'label', e.target.value)}
                      placeholder="Stat label (e.g., Books Read)"
                      className="flex-1 px-5 py-4 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm font-medium"
                    />
                    <input
                      type="text"
                      value={stat.value}
                      onChange={(e) => updateStat(index, 'value', e.target.value)}
                      placeholder="Value (e.g., 42, Lagos, Berlin)"
                      className="flex-1 px-5 py-4 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm font-medium"
                    />
                    {stats.length > 1 && (
                      <button
                        onClick={() => removeStat(index)}
                        className="px-4 py-4 bg-red-500/20 hover:bg-red-500/40 rounded-xl text-white transition-colors border-2 border-red-500/40"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={generateWrapped}
              disabled={!title || !stats.some(s => s.label && s.value)}
              className="w-full px-8 py-5 bg-white hover:bg-white/90 disabled:bg-white/20 disabled:cursor-not-allowed text-black font-black rounded-xl transition-all text-xl shadow-xl hover:shadow-2xl disabled:shadow-none hover:scale-[1.02] uppercase tracking-wide"
            >
              Generate My Wrapped
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Preview Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-950 relative overflow-hidden flex items-center justify-center p-4">
      <LavaLampBackground variant={getBackgroundVariant(currentSlide)} />

      <div className="absolute inset-0 opacity-[0.10]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'2.5\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
        backgroundSize: '200px 200px'
      }}></div>

      <div className="relative z-10 max-w-md w-full">
        {/* Music Control Button */}
        {audioElement && (
          <button
            onClick={toggleMusic}
            className="fixed top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-sm border-2 border-white/20 z-50"
          >
            {audioPlaying ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        )}

        {/* Intro Slide */}
        {currentSlide === 0 && (
          <div className="bg-black/40 backdrop-blur-2xl rounded-3xl p-12 text-center shadow-2xl border-2 border-white/30 min-h-[650px] flex flex-col justify-between relative overflow-hidden">
            {/* Decorative corner accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-bl-full"></div>
            
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="text-7xl font-black text-white mb-6 tracking-tighter leading-none">{title}</h1>
              {dateRange && (
                <div className="text-2xl font-bold text-white/80 uppercase tracking-widest">{dateRange}</div>
              )}
            </div>
            
            <div className="text-6xl font-black text-white tracking-tighter uppercase">
              Wrapped
            </div>
          </div>
        )}

        {/* Stats Slides */}
        {validStats.map((stat, index) => {
          const isLongText = stat.value.length > 50 || stat.value.includes(':') || stat.value.includes(',');
          const isNumber = !isNaN(stat.value) && stat.value.trim() !== '';
          
          return (
            currentSlide === index + 1 && (
              <div key={index} className="bg-black/40 backdrop-blur-2xl rounded-3xl p-12 text-center shadow-2xl border-2 border-white/30 min-h-[650px] flex flex-col justify-center relative overflow-hidden">
                {/* Decorative shapes - only for numbers and short text */}
                {!isLongText && (
                  <>
                    <div className="absolute top-8 right-8 w-20 h-20 border-4 border-white/20 rounded-full"></div>
                    <div className="absolute bottom-8 left-8 w-16 h-16 bg-white/10 rotate-45"></div>
                  </>
                )}
                
                <div className="space-y-6">
                  <div className="text-white/70 text-2xl font-bold uppercase tracking-wider mb-8">
                    {stat.label}
                  </div>
                  <div className="text-white">
                    {formatValue(stat.value)}
                  </div>
                </div>

                {/* Bottom accent */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white/30 font-black text-sm uppercase tracking-widest">
                  {dateRange || 'Wrapped'}
                </div>
              </div>
            )
          );
        })}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="p-4 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed rounded-full text-white transition-colors backdrop-blur-sm border-2 border-white/20"
          >
            <ArrowLeft size={28} />
          </button>

          <div className="text-white/80 font-bold text-lg">
            {currentSlide + 1} / {validStats.length + 1}
          </div>

          {currentSlide < validStats.length ? (
            <button
              onClick={nextSlide}
              className="p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-sm border-2 border-white/20"
            >
              <ArrowRight size={28} />
            </button>
          ) : (
            <button
              onClick={shareWrapped}
              className="flex items-center gap-3 px-8 py-4 bg-white hover:bg-white/90 rounded-full text-black font-black transition-all shadow-xl hover:shadow-2xl hover:scale-105 uppercase tracking-wide"
            >
              <Share2 size={22} />
              Share
            </button>
          )}
        </div>

        {currentSlide === validStats.length && (
          <button
            onClick={resetWrapped}
            className="w-full mt-6 px-6 py-4 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors backdrop-blur-sm border-2 border-white/20 font-bold uppercase tracking-wide"
          >
            Create New Wrapped
          </button>
        )}
      </div>
    </div>
  );
}
// ---------- Landing page ----------

// Test photos live in public/mywrap (1.jpg … 6.jpg). If a file is missing,
// the matching fallback URL is used so the landing never shows a blank star.
const LANDING_PHOTOS = [1, 2, 3, 4, 5, 6].map((n) => `/mywrap/${n}.jpg`);
const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=75',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=75',
  'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=75',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=75',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=75',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=75',
];

const TYPED_WORDS = ['events', 'parties', 'pop ups', 'vacations', 'activations'];

// Jagged starburst, drawn in a 100x100 box.
const STAR_POINTS = [
  [50, 2], [60, 30], [88, 14], [72, 42], [98, 55], [68, 62],
  [80, 94], [52, 74], [30, 97], [34, 66], [3, 70], [26, 48],
  [8, 20], [38, 32],
];
const STAR_PATH = 'M' + STAR_POINTS.map(([x, y]) => `${x} ${y}`).join(' L') + ' Z';

function TypedWord() {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = TYPED_WORDS[wordIndex];
    let delay = deleting ? 55 : 110;
    if (!deleting && text === word) delay = 1600;
    if (deleting && text === '') delay = 300;

    const timer = setTimeout(() => {
      if (!deleting && text === word) {
        setDeleting(true);
      } else if (deleting && text === '') {
        setDeleting(false);
        setWordIndex((wordIndex + 1) % TYPED_WORDS.length);
      } else {
        setText(deleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1));
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [text, deleting, wordIndex]);

  return (
    <span className="whitespace-nowrap">
      {text}
      <span className="landing-caret" aria-hidden="true" />
    </span>
  );
}

// A star-shaped hole cut in white paper, with a photo slideshow underneath.
function StarCutout({ className, offset = 0, interval = 4000, rotate = 0 }) {
  const [index, setIndex] = useState(offset % LANDING_PHOTOS.length);
  const [prev, setPrev] = useState(null);
  const [failed, setFailed] = useState({});
  const filterId = `paper-shadow-${offset}`;

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => {
        setPrev(i);
        return (i + 1) % LANDING_PHOTOS.length;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [interval]);

  return (
    <div className={`absolute pointer-events-none ${className}`} style={{ transform: `rotate(${rotate}deg)` }}>
      {/* Photos, clipped to the star */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <clipPath id={`star-clip-${offset}`} clipPathUnits="objectBoundingBox" transform="scale(0.01)">
            <path d={STAR_PATH} />
          </clipPath>
        </defs>
      </svg>
      <div className="absolute inset-0 overflow-hidden bg-neutral-200" style={{ clipPath: `url(#star-clip-${offset})` }}>
        {LANDING_PHOTOS.map((src, i) => {
          const state = i === index ? 'active' : i === prev ? 'leaving' : 'waiting';
          return (
            <img
              key={src}
              src={failed[i] ? FALLBACK_PHOTOS[i] : src}
              onError={() => setFailed((f) => (f[i] ? f : { ...f, [i]: true }))}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                transform: `rotate(${-rotate}deg) scale(1.25) translateX(${state === 'active' ? '0%' : state === 'leaving' ? '-10%' : '10%'})`,
                opacity: state === 'active' ? 1 : 0,
                transition: state === 'waiting' ? 'none' : 'transform 1.4s cubic-bezier(.22,.61,.36,1), opacity 1.4s ease',
              }}
            />
          );
        })}
      </div>

      {/* The paper: white sheet with a star-shaped hole whose edge casts a shadow onto the photo */}
      <svg className="absolute inset-0 w-full h-full overflow-hidden" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1.2" dy="1.8" stdDeviation="1.6" floodColor="#000" floodOpacity="0.45" />
          </filter>
        </defs>
        <path
          d={`M-10 -10 H110 V110 H-10 Z ${STAR_PATH}`}
          fill="#fafaf9"
          fillRule="evenodd"
          filter={`url(#${filterId})`}
        />
      </svg>
    </div>
  );
}

function LandingPage({ onStart }) {
  return (
    <div className="min-h-screen bg-stone-50 text-neutral-900 relative overflow-hidden flex flex-col">
      <style>{`
        .landing-caret { display:inline-block; width:0.06em; height:0.9em; margin-left:0.06em; background:currentColor; vertical-align:-0.08em; animation: landing-blink 1s steps(1) infinite; }
        @keyframes landing-blink { 50% { opacity: 0; } }
      `}</style>

      {/* Paper stars (behind the content) */}
      <StarCutout className="w-[34vw] h-[34vw] max-w-[440px] max-h-[440px] -left-[8vw] top-[10vh]" offset={0} interval={4200} rotate={-8} />
      <StarCutout className="w-[40vw] h-[40vw] max-w-[520px] max-h-[520px] -right-[8vw] bottom-[-6vh]" offset={3} interval={4200} rotate={14} />

      {/* Nav bar */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 border-b border-neutral-200 bg-stone-50/80 backdrop-blur">
        <div className="text-xl font-black tracking-tight">mywrap</div>
        <div className="flex items-center gap-6 text-sm font-medium text-neutral-600">
          <a href="#how" className="hidden sm:inline hover:text-neutral-900">How it works</a>
          <a href="#examples" className="hidden sm:inline hover:text-neutral-900">Examples</a>
          <button onClick={onStart} className="px-4 py-2 rounded-full bg-neutral-900 text-white hover:bg-neutral-700 transition-colors">
            Start now
          </button>
        </div>
      </nav>

      {/* Headline + CTA */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-[1.05]">
          wrap up your
          <br />
          <span className="inline-block min-h-[1.1em]"><TypedWord /></span>
        </h1>
        <button
          onClick={onStart}
          className="group mt-12 px-10 py-5 bg-neutral-900 hover:bg-neutral-700 text-white font-bold rounded-full transition-all text-lg shadow-xl hover:scale-105"
        >
          Start now
          <ArrowRight className="inline-block ml-3 group-hover:translate-x-1 transition-transform" size={20} />
        </button>
      </main>
    </div>
  );
}

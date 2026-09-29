import React, { useState, useEffect } from 'react';
import { Share2, Plus, Trash2, ArrowRight, ArrowLeft, Sparkles, Volume2, VolumeX, Loader2, Lightbulb } from 'lucide-react';

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
  const [analysisContext, setAnalysisContext] = useState('');
  const [analyzing, setAnalyzing] = useState({});
  const [analysisError, setAnalysisError] = useState('');

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

  const setStatExplanation = (index, explanation) => {
    setStats(prev => prev.map((s, i) => (i === index ? { ...s, explanation } : s)));
  };

  // Uses Claude's in-artifact completion API to explain what a single feedback result means
  const explainResult = async (index) => {
    const stat = stats[index];
    if (!window.claude || !window.claude.complete) {
      setAnalysisError('AI analysis is only available when this runs inside Claude. You can still write explanations by hand.');
      return;
    }

    setAnalysisError('');
    setAnalyzing(prev => ({ ...prev, [index]: true }));

    const otherResults = stats
      .filter((s, i) => i !== index && s.label && s.value)
      .map(s => `- ${s.label}: ${s.value}`)
      .join('\n');

    const prompt = `You are helping someone make sense of feedback results for "${title || 'their project'}"${dateRange ? ` (${dateRange})` : ''}.
${analysisContext ? `\nContext about the feedback: ${analysisContext}\n` : ''}
Question: ${stat.label}
Result: ${stat.value}

Other results from the same feedback, for context:
${otherResults || '(none)'}

Write a short, plain-language explanation of this result: what it tells us, why it might have come out this way, and one practical takeaway. Keep it to 2-3 sentences and under 60 words. Do not invent numbers that are not in the results. Reply with the explanation only, with no preamble or formatting.`;

    try {
      const response = await window.claude.complete(prompt);
      setStatExplanation(index, response.trim());
    } catch (e) {
      console.log('Analysis failed:', e);
      setAnalysisError('Could not generate an explanation. Please try again.');
    } finally {
      setAnalyzing(prev => ({ ...prev, [index]: false }));
    }
  };

  const explainAllResults = async () => {
    for (let i = 0; i < stats.length; i++) {
      if (stats[i].label && stats[i].value) {
        await explainResult(i);
      }
    }
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
    setAnalysisContext('');
    setAnalysisError('');
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-950 relative overflow-hidden flex items-center justify-center p-6">
        <LavaLampBackground />

        {/* Fine grain texture overlay */}
        <div className="absolute inset-0 opacity-[0.10]" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'2.5\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
          backgroundSize: '200px 200px'
        }}></div>

        <div className="relative z-10 text-center max-w-3xl">
          <div className="mb-12 inline-block">
            <div className="relative">
              <Sparkles className="w-20 h-20 text-white animate-pulse" />
              <div className="absolute inset-0 blur-xl bg-white/30 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <h1 className="text-8xl font-black text-white mb-8 tracking-tighter">
            Wrapped
          </h1>
          
          <p className="text-2xl text-white/90 mb-16 leading-relaxed font-medium">
            Create a custom wrapped for your trip, fitness achievements, reading list—anything worth sharing
          </p>
          
          <button
            onClick={() => setStep('input')}
            className="group px-12 py-6 bg-white hover:bg-white/90 text-black font-black rounded-full transition-all text-xl shadow-2xl hover:shadow-white/30 hover:scale-105 uppercase tracking-wide"
          >
            Get Started
            <ArrowRight className="inline-block ml-3 group-hover:translate-x-2 transition-transform" size={24} />
          </button>
        </div>
      </div>
    );
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
              onClick={() => setStep('analysis')}
              disabled={!stats.some(s => s.label && s.value)}
              className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/40 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all text-xl border-2 border-white/20 uppercase tracking-wide"
            >
              <Lightbulb size={22} />
              Analyze Results
            </button>

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

  // Analysis Page
  if (step === 'analysis') {
    const isAnyAnalyzing = Object.values(analyzing).some(Boolean);

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-950 relative overflow-hidden p-6 flex items-center justify-center">
        <LavaLampBackground variant="cyan" />

        <div className="absolute inset-0 opacity-[0.10]" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'2.5\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
          backgroundSize: '200px 200px'
        }}></div>

        <div className="relative z-10 max-w-2xl w-full bg-black/40 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-white/20">
          <h1 className="text-5xl font-black text-white mb-3 tracking-tight">Analyze Results</h1>
          <p className="text-white/80 mb-10 text-lg">Turn each feedback result into a plain-language explanation. Explanations show up on your wrapped slides.</p>

          <div className="space-y-8">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <label className="block text-white mb-3 font-bold text-lg uppercase tracking-wide">Context</label>
              <textarea
                value={analysisContext}
                onChange={(e) => setAnalysisContext(e.target.value)}
                placeholder="Who gave the feedback and when? (e.g., Post-event survey, 84 attendees, launch party)"
                rows={2}
                className="w-full px-5 py-4 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm font-medium resize-none"
              />
              <p className="text-white/60 text-sm mt-2">Optional, but helps the AI give better explanations</p>
            </div>

            <button
              onClick={explainAllResults}
              disabled={isAnyAnalyzing}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed rounded-xl text-white transition-colors border-2 border-white/20 font-bold uppercase tracking-wide"
            >
              {isAnyAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
              Explain All Results
            </button>

            {analysisError && (
              <div className="px-5 py-4 rounded-xl bg-red-500/20 border-2 border-red-500/40 text-white font-medium">
                {analysisError}
              </div>
            )}

            {stats.map((stat, index) => {
              if (!stat.label || !stat.value) return null;

              return (
                <div key={index} className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
                  <div>
                    <div className="text-white/60 text-sm font-bold uppercase tracking-wider mb-1">Question</div>
                    <div className="text-white text-xl font-bold">{stat.label}</div>
                  </div>

                  <div>
                    <div className="text-white/60 text-sm font-bold uppercase tracking-wider mb-1">Result</div>
                    <div className="text-white text-3xl font-black tracking-tight break-words">{stat.value}</div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-white/60 text-sm font-bold uppercase tracking-wider">Explanation</div>
                      <button
                        onClick={() => explainResult(index)}
                        disabled={analyzing[index]}
                        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-white/90 disabled:bg-white/20 disabled:text-white/60 disabled:cursor-not-allowed rounded-lg text-black font-bold text-sm transition-colors"
                      >
                        {analyzing[index] ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {analyzing[index] ? 'Thinking...' : stat.explanation ? 'Regenerate' : 'Explain with AI'}
                      </button>
                    </div>
                    <textarea
                      value={stat.explanation || ''}
                      onChange={(e) => setStatExplanation(index, e.target.value)}
                      placeholder="What does this result mean? Generate one with AI or write your own."
                      rows={3}
                      className="w-full px-5 py-4 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm font-medium resize-none"
                    />
                  </div>
                </div>
              );
            })}

            <div className="flex gap-4">
              <button
                onClick={() => setStep('input')}
                className="flex items-center justify-center gap-2 px-6 py-5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors border-2 border-white/20 font-bold uppercase tracking-wide"
              >
                <ArrowLeft size={20} />
                Edit
              </button>
              <button
                onClick={generateWrapped}
                disabled={!title || !stats.some(s => s.label && s.value)}
                className="flex-1 px-8 py-5 bg-white hover:bg-white/90 disabled:bg-white/20 disabled:cursor-not-allowed text-black font-black rounded-xl transition-all text-xl shadow-xl hover:shadow-2xl disabled:shadow-none hover:scale-[1.02] uppercase tracking-wide"
              >
                Generate My Wrapped
              </button>
            </div>
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
                  {stat.explanation && (
                    <p className="text-white/80 text-lg font-medium leading-relaxed max-w-sm mx-auto pt-4">
                      {stat.explanation}
                    </p>
                  )}
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
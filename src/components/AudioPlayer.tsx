import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, SkipForward, SkipBack, 
  Volume2, VolumeX, Repeat, Shuffle, 
  List, Music, Plus, Trash2, Heart,
  MoreVertical, Search, X, Sparkles,
  History, Sliders, Compass, Send, Check
} from 'lucide-react';
import { Track, PlaybackStatus, RepeatMode } from '../types';
import { cn, formatTime } from '../lib/utils';

// Pre-populated Curated Online/Offline Tracks
const CURATED_TRACKS: Track[] = [
  {
    id: 'curated-1',
    title: 'Sylvan Meadow Echoes',
    artist: 'Lumiere Ensemble',
    album: 'Organic Echoes',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 372,
    fileName: 'SoundHelix-Song-1.mp3'
  },
  {
    id: 'curated-2',
    title: 'Raindrops on Moss',
    artist: 'Komorebi Strings',
    album: 'Dawn Rituals',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: 423,
    fileName: 'SoundHelix-Song-2.mp3'
  },
  {
    id: 'curated-3',
    title: 'Serene River Stones',
    artist: 'Echo Park',
    album: 'Valley Breath',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    duration: 302,
    fileName: 'SoundHelix-Song-4.mp3'
  }
];

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function AudioPlayer() {
  const [tracks, setTracks] = useState<Track[]>(CURATED_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [status, setStatus] = useState<PlaybackStatus>('paused');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [isShuffle, setIsShuffle] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Visualizer Wave speed
  const [waveSpeed, setWaveSpeed] = useState<number>(1);
  const [audioVisualizer, setAudioVisualizer] = useState<'wave' | 'bars' | 'none'>('wave');

  // Bottom Navigation state: 'library' | 'browse' | 'assistant' | 'history' | 'more'
  const [activeTab, setActiveTab] = useState<'library' | 'browse' | 'assistant' | 'history' | 'more'>('library');

  // History state
  const [playHistory, setPlayHistory] = useState<{ track: Track; playedAt: Date }[]>([]);

  // Assistant State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Halo! Saya adalah Musik Assistant Anda. Hubungkan musik lokal Anda dengan tombol "+" atau seret file ke aplikasi. Bagaimana saya bisa membantu Anda memilih musik atau suasana hati hari ini?',
      timestamp: new Date()
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentTrack = currentTrackIndex >= 0 && currentTrackIndex < tracks.length ? tracks[currentTrackIndex] : null;

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  // Sync state with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (status === 'playing') {
      audioRef.current?.play().catch(e => {
        console.error("Playback error", e);
        setStatus('paused');
      });
    } else if (status === 'paused') {
      audioRef.current?.pause();
    }
  }, [status, currentTrackIndex]);

  // Track History Addition
  useEffect(() => {
    if (currentTrack && status === 'playing') {
      // Add key to history if not just playing immediately after pause
      setPlayHistory(prev => {
        // Prevent continuous duplicate logs
        if (prev.length > 0 && prev[0].track.id === currentTrack.id) {
          return prev;
        }
        return [{ track: currentTrack, playedAt: new Date() }, ...prev];
      });
    }
  }, [currentTrack?.id, status]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newTracks: Track[] = Array.from(files).map((file: File) => {
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      const parts = fileName.split(" - ");
      const artist = parts.length > 1 ? parts[0] : "Artis Lokal";
      const title = parts.length > 1 ? parts[1] : parts[0];

      return {
        id: Math.random().toString(36).substring(2, 11),
        title,
        artist,
        audioUrl: URL.createObjectURL(file), // Local blob URL
        fileName: file.name,
        duration: 0
      };
    });

    setTracks(prev => {
      const merged = [...prev, ...newTracks];
      // Select the first local track if no track was previously selected
      if (currentTrackIndex === -1 && merged.length > 0) {
        setCurrentTrackIndex(prev.length);
      }
      return merged;
    });
    
    // Switch to library so user can see their added tracks immediately
    setActiveTab('library');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const audioFiles = Array.from(files).filter((file: File) => file.type.startsWith('audio/'));
      if (audioFiles.length > 0) {
        const dummyEvent = { target: { files: audioFiles as unknown as FileList } } as React.ChangeEvent<HTMLInputElement>;
        handleFileUpload(dummyEvent);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      nextTrack();
    }
  };

  const nextTrack = () => {
    if (tracks.length === 0) return;
    
    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * tracks.length);
      if (nextIndex === currentTrackIndex && tracks.length > 1) {
        nextIndex = (nextIndex + 1) % tracks.length;
      }
    } else {
      nextIndex = (currentTrackIndex + 1) % tracks.length;
      if (nextIndex === 0 && repeatMode !== 'all') {
        setStatus('paused');
        return;
      }
    }
    setCurrentTrackIndex(nextIndex);
    setStatus('playing');
  };

  const prevTrack = () => {
    if (tracks.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrackIndex(prevIndex);
    setStatus('playing');
  };

  const togglePlay = () => {
    if (!currentTrack) return;
    setStatus(prev => prev === 'playing' ? 'paused' : 'playing');
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const removeTrack = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const indexToRemove = tracks.findIndex(t => t.id === id);
    if (indexToRemove === -1) return;

    const newTracks = tracks.filter(t => t.id !== id);
    setTracks(newTracks);

    if (currentTrackIndex === indexToRemove) {
      if (newTracks.length === 0) {
        setCurrentTrackIndex(-1);
        setStatus('stopped');
      } else {
        setCurrentTrackIndex(prev => prev % newTracks.length);
      }
    } else if (currentTrackIndex > indexToRemove) {
      setCurrentTrackIndex(prev => prev - 1);
    }
  };

  // Chat message submission using node API
  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = customMessage || userInput;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!customMessage) setUserInput('');
    setIsSendingMessage(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend })
      });

      const data = await response.json();
      const botMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: data.reply || "Maaf, terjadi masalah saat memproses pesan Anda.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: "Maaf, Musik Assistant Anda sedang mengalami kesulitan terhubung dengan otak pintar Gemini kami di server.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className="relative w-full h-screen flex flex-col items-center justify-between p-4 md:p-6 select-none bg-[#F5F5F0] text-[#2C2C24] overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        multiple 
        accept="audio/*" 
        className="hidden" 
      />

      {/* Decorative Natural Backdrop */}
      <div className="absolute inset-0 z-0 bg-gradient-to-tr from-[#5A5A40]/5 via-transparent to-[#A3A380]/10 pointer-events-none" />

      {/* Atmospheric Floating Leaf Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <motion.div 
          animate={{ rotate: 360, y: [0, 40, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full border border-[#5A5A40]/10"
        />
        <motion.div 
          animate={{ rotate: -360, x: [0, -40, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full border border-[#A3A380]/10"
        />
      </div>

      {audioRef.current && (
        <audio
          ref={audioRef}
          src={currentTrack?.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      )}

      {/* Main Glass Application Container */}
      <div className={cn(
        "relative w-full max-w-7xl xl:max-w-[1400px] flex-1 flex flex-col bg-white/70 backdrop-blur-xl border border-[#D1D1CB] rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 z-10",
        isDragging ? "bg-[#5A5A40]/5 scale-[0.99]" : ""
      )}>
        {/* Top bar */}
        <header className="p-5 md:px-8 border-b border-[#D1D1CB]/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#5A5A40] rounded-xl flex items-center justify-center shadow-md shadow-[#5A5A40]/10">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight whitespace-nowrap block">Musik Assistant</span>
              <span className="text-[10px] tracking-widest text-[#8E8E82] uppercase font-bold">Nature Studio Suite</span>
            </div>
          </div>

          {/* Connected Device Info */}
          <div className="hidden sm:flex items-center gap-2 bg-[#5A5A40]/10 border border-[#5A5A40]/20 rounded-full py-1 px-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase text-[#5A5A40] tracking-wide">Studio Hi-Fi Aktif</span>
          </div>
        </header>

        {/* Integrated Navigation Tabs under Header */}
        <div className="px-5 md:px-8 py-3 border-b border-[#D1D1CB]/40 bg-[#EBEBE4]/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'library', label: 'Library', icon: Music },
              { id: 'browse', label: 'Browse', icon: Compass },
              { id: 'assistant', label: 'Assistant', icon: Sparkles },
              { id: 'history', label: 'History', icon: History },
              { id: 'more', label: 'More', icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                    isActive 
                      ? "bg-[#5A5A40] text-white shadow-sm" 
                      : "text-[#8E8E82] hover:text-[#5A5A40] hover:bg-[#5A5A40]/5"
                  )}
                >
                  <Icon size={14} className={isActive ? "text-white" : "text-[#8E8E82]"} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="py-1.5 px-3 bg-[#5A5A40] text-white hover:bg-[#4d4d36] transition-all rounded-lg text-xs font-bold flex items-center gap-1 shadow"
          >
            <Plus size={14} /> Add Music
          </button>
        </div>

        {/* Content View Space */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Active Tab Screen Area */}
          <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'library' && (
                <motion.div 
                  key="library"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="mb-4 shrink-0">
                    <h2 className="font-serif text-2xl font-bold">Koleksi Lokal</h2>
                    <p className="text-xs text-[#8E8E82]">Koleksi album dan musik yang telah Anda masukkan.</p>
                  </div>

                  {/* Search Bar inside Library */}
                  <div className="relative mb-4 shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E82]" size={16} />
                    <input 
                      type="text"
                      placeholder="Cari lagu berdasarkan judul atau artis..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#EBEBE4]/50 border border-[#D1D1CB] rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-[#5A5A40] transition-all"
                    />
                  </div>

                  {/* Files List Container */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
                    {filteredTracks.map((track) => {
                      const isActive = currentTrack?.id === track.id;
                      return (
                        <motion.div
                          key={track.id}
                          layoutId={track.id}
                          onClick={() => {
                            const index = tracks.indexOf(track);
                            setCurrentTrackIndex(index);
                            setStatus('playing');
                          }}
                          className={cn(
                            "group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border",
                            isActive 
                              ? "bg-white border-[#5A5A40] shadow-md shadow-[#5A5A40]/5" 
                              : "bg-white/40 border-[#D1D1CB]/40 hover:bg-white/80 hover:border-[#D1D1CB]"
                          )}
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            isActive ? "bg-[#5A5A40] text-white" : "bg-[#D9D9D0] text-[#5A5A40]"
                          )}>
                            {isActive && status === 'playing' ? (
                              <div className="flex items-end gap-0.5 h-3">
                                {[1, 2, 3].map(i => (
                                  <motion.div 
                                    key={i}
                                    animate={{ height: [4, 12, 6, 12, 4] }}
                                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                                    className={cn("w-0.5 rounded-full", isActive ? "bg-white" : "bg-[#5A5A40]")}
                                  />
                                ))}
                              </div>
                            ) : (
                              <Music size={18} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className={cn("font-bold text-sm tracking-tight truncate", isActive ? "text-[#5A5A40]" : "text-[#2C2C24]")}>
                              {track.title}
                            </h4>
                            <p className="text-xs text-[#8E8E82] uppercase tracking-wider font-semibold truncate mt-0.5">
                              {track.artist}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-[#8E8E82] tracking-wider uppercase">
                              {track.duration ? formatTime(track.duration) : "Offline"}
                            </span>
                            <button 
                              onClick={(e) => removeTrack(e, track.id)}
                              className="opacity-0 group-hover:opacity-100 p-2 text-[#8E8E82] hover:text-red-500 rounded-xl hover:bg-red-55/10 transition-all duration-300"
                              title="Hapus lagu"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}

                    {filteredTracks.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-[#8E8E82]">
                        <Music className="opacity-30 mb-4" size={48} strokeWidth={1} />
                        <h3 className="font-serif text-lg font-bold">Lagu tidak ditemukan</h3>
                        <p className="text-xs max-w-xs text-center mt-1">Coba gunakan kata kunci pencarian lain atau tambahkan file musik baru.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'browse' && (
                <motion.div 
                  key="browse"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="mb-6 shrink-0">
                    <h2 className="font-serif text-2xl font-bold">Discovery Ambient</h2>
                    <p className="text-xs text-[#8E8E82]">Dengarkan kompilasi musik ambient premium langsung dari server streaming.</p>
                  </div>

                  {/* Curator Card */}
                  <div className="bg-gradient-to-r from-[#5A5A40] to-[#A3A380] text-white p-6 rounded-2xl mb-6 shadow-xl relative overflow-hidden">
                    <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                      <Compass size={160} />
                    </div>
                    <span className="text-[10px] tracking-widest uppercase font-bold bg-white/20 px-2.5 py-1 rounded-full text-white">Daily Curated Loop</span>
                    <h3 className="font-serif text-2xl font-light mt-3">Alunan Harmoni Alam</h3>
                    <p className="text-xs opacity-90 mt-1 max-w-md">Kombinasi loop instrumen akustik, gemericik air, dan resonansi angin gunung yang menenangkan.</p>
                  </div>

                  <h3 className="text-xs uppercase tracking-wider font-bold text-[#8E8E82] mb-3">Rekomendasi Terbaik</h3>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3.5 pr-1">
                    {CURATED_TRACKS.map((track) => {
                      const isAdded = tracks.some(t => t.audioUrl === track.audioUrl);
                      return (
                        <div 
                          key={track.id}
                          className="bg-white/40 border border-[#D1D1CB]/40 rounded-xl p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40]">
                              <Compass size={18} className="animate-spin-slow" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-[#2C2C24]">{track.title}</h4>
                              <p className="text-xs text-[#8E8E82]">{track.artist} — {track.album}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => {
                                const matchedIdx = tracks.findIndex(t => t.audioUrl === track.audioUrl);
                                if (matchedIdx !== -1) {
                                  setCurrentTrackIndex(matchedIdx);
                                  setStatus('playing');
                                } else {
                                  setTracks(prev => [...prev, track]);
                                  setCurrentTrackIndex(tracks.length);
                                  setStatus('playing');
                                }
                              }}
                              className="p-2.5 bg-white border border-[#D1D1CB] rounded-full text-[#5A5A40] hover:scale-105 active:scale-95 transition-all shadow-sm"
                            >
                              <Play size={14} fill="currentColor" />
                            </button>
                            <button 
                              disabled={isAdded}
                              onClick={() => {
                                if (!isAdded) {
                                  setTracks(prev => [...prev, track]);
                                }
                              }}
                              className={cn(
                                "py-2 px-3 text-xs font-bold rounded-lg transition-all",
                                isAdded 
                                  ? "bg-transparent text-emerald-600 flex items-center gap-1"
                                  : "bg-[#5A5A40]/10 text-[#5A5A40] hover:bg-[#5A5A40]/20"
                              )}
                            >
                              {isAdded ? (
                                <>
                                  <Check size={14} /> Ditambahkan
                                </>
                              ) : (
                                "Simpan"
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {activeTab === 'assistant' && (
                <motion.div 
                  key="assistant"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="mb-4 shrink-0 flex items-center justify-between">
                    <div>
                      <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="text-[#5A5A40] inline" size={24} /> Musik Assistant AI
                      </h2>
                      <p className="text-xs text-[#8E8E82]">Konsultasikan suasana hati Anda untuk rekomendasi musik terbaik.</p>
                    </div>
                    {/* Clear Chat */}
                    <button 
                      onClick={() => setChatMessages([
                        {
                          id: 'welcome',
                          sender: 'assistant',
                          text: 'Halo! Saya adalah Musik Assistant Anda. Hubungkan musik lokal Anda dengan tombol "+" atau seret file ke aplikasi. Bagaimana saya bisa membantu Anda memilih musik atau suasana hati hari ini?',
                          timestamp: new Date()
                        }
                      ])}
                      className="text-xs text-[#8E8E82] hover:text-red-500 hover:underline transition-all"
                    >
                      Reset Chat
                    </button>
                  </div>

                  {/* Messaging Logs */}
                  <div className="flex-1 bg-white/50 border border-[#D1D1CB]/50 rounded-xl p-4 overflow-y-auto custom-scrollbar space-y-4 mb-4">
                    {chatMessages.map((msg) => (
                      <div 
                        key={msg.id}
                        className={cn(
                          "max-w-[80%] flex flex-col space-y-1",
                          msg.sender === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div className={cn(
                          "p-3.5 rounded-xl text-sm leading-relaxed",
                          msg.sender === 'user' 
                            ? "bg-[#5A5A40] text-white rounded-tr-none" 
                            : "bg-[#EBEBE4] text-[#2C2C24] rounded-tl-none border border-[#D1D1CB]"
                        )}>
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-[#8E8E82] px-1 font-mono">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                    {isSendingMessage && (
                      <div className="mr-auto flex items-center gap-2 bg-[#EBEBE4]/40 border border-[#D1D1CB]/30 p-3 rounded-[20px] rounded-tl-none text-xs text-[#8E8E82]">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                          className="w-3.5 h-3.5 border-2 border-t-[#5A5A40] border-r-transparent border-l-transparent border-b-transparent rounded-full"
                        />
                        Asisten sedang mengetik...
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Fast Helper Prompts */}
                  <div className="flex gap-2 mb-3 overflow-x-auto custom-scrollbar pb-1 shrink-0">
                    {[
                      "Rekomendasi lagu relaksasi",
                      "Bagaimana cara memutar musik lokal?",
                      "Musik apa yang cocok untuk belajar?",
                      "Ucapkan kata-kata motivasi mendengarkan musik"
                    ].map((promptText, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handleSendMessage(promptText)}
                        className="bg-white border border-[#D1D1CB] rounded-full py-1.5 px-3.5 text-xs text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white hover:border-[#5A5A40] transition-all whitespace-nowrap active:scale-95"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>

                  {/* Text Input Row */}
                  <div className="relative shrink-0">
                    <input 
                      type="text"
                      placeholder="Tanya asisten tentang musik, suasana hati, dll..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="w-full bg-[#EBEBE4]/50 border border-[#D1D1CB] rounded-xl py-3.5 pl-4 pr-12 text-sm focus:outline-none focus:border-[#5A5A40] transition-all"
                    />
                    <button 
                      onClick={() => handleSendMessage()}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-[#5A5A40] text-white hover:bg-[#484832] transition-colors rounded-lg shadow-md"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div 
                  key="history"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="mb-6 shrink-0 flex items-center justify-between">
                    <div>
                      <h2 className="font-serif text-2xl font-bold">Riwayat Putar</h2>
                      <p className="text-xs text-[#8E8E82]">Daftar trek yang baru-baru ini Anda dengarkan.</p>
                    </div>
                    {playHistory.length > 0 && (
                      <button 
                        onClick={() => setPlayHistory([])}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Bersihkan Riwayat
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                    {playHistory.map((entry, idx) => (
                      <div 
                        key={idx}
                        className="bg-white/40 border border-[#D1D1CB]/30 rounded-xl p-4 flex items-center justify-between hover:bg-white/70 transition-all cursor-pointer"
                        onClick={() => {
                          const matchedIdx = tracks.findIndex(t => t.id === entry.track.id);
                          if (matchedIdx !== -1) {
                            setCurrentTrackIndex(matchedIdx);
                            setStatus('playing');
                          }
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40]">
                            <History size={16} />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-[#2C2C24]">{entry.track.title}</h4>
                            <p className="text-xs text-[#8E8E82] uppercase tracking-wider font-semibold">{entry.track.artist}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-[#8E8E82] font-mono block">
                            {entry.playedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}

                    {playHistory.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-[#8E8E82]">
                        <History className="opacity-30 mb-4" size={48} strokeWidth={1} />
                        <h3 className="font-serif text-lg font-bold">Belum ada riwayat</h3>
                        <p className="text-xs text-center mt-1">Lagu yang Anda putar akan terekam secara otomatis di sini.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'more' && (
                <motion.div 
                  key="more"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="mb-6 shrink-0">
                    <h2 className="font-serif text-2xl font-bold">Pengaturan & Informasi</h2>
                    <p className="text-xs text-[#8E8E82]">Sesuaikan ekosistem audio Musik Assistant Anda.</p>
                  </div>

                  <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 pr-1">
                    
                    {/* Visualizer Preferences */}
                    <div className="bg-white/40 border border-[#D1D1CB]/50 p-5 rounded-xl">
                      <h3 className="font-serif text-lg font-semibold mb-3 flex items-center gap-2">
                        <Sliders size={18} className="text-[#5A5A40]" /> Visualisasi Audio
                      </h3>
                      <p className="text-xs text-[#8E8E82] mb-4">Ubah gaya gelombang yang mensimulasikan alunan musik di layar pemutar utama.</p>
                      
                      <div className="grid grid-cols-3 gap-2.5">
                        {(['wave', 'bars', 'none'] as const).map((style) => (
                          <button
                            key={style}
                            onClick={() => setAudioVisualizer(style)}
                            className={cn(
                              "py-3 px-4 rounded-lg text-xs font-bold capitalize transition-all border",
                              audioVisualizer === style 
                                ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-sm"
                                : "bg-white border-[#D1D1CB] text-[#2C2C24] hover:bg-white/80"
                            )}
                          >
                            {style === 'none' ? 'Nonaktif' : style}
                          </button>
                        ))}
                      </div>
                      
                      {audioVisualizer !== 'none' && (
                        <div className="mt-4">
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span>Kecepatan Gelombang</span>
                            <span>{waveSpeed}x</span>
                          </div>
                          <input 
                            type="range"
                            min={0.5}
                            max={3}
                            step={0.1}
                            value={waveSpeed}
                            onChange={(e) => setWaveSpeed(parseFloat(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>

                    {/* About Widget */}
                    <div className="bg-white/40 border border-[#D1D1CB]/50 p-5 rounded-xl space-y-3">
                      <h3 className="font-serif text-lg font-semibold text-[#2C2C24]">Tentang Musik Assistant</h3>
                      <p className="text-xs leading-relaxed text-[#2C2C24]/80">
                        Aplikasi pemutar musik web terintegrasi asisten AI cerdas berbasis Google Gemini. 
                        Mendukung input dynamic drag-and-drop file musik lokal (.mp3, .wav, dsb) secara offline
                        dan kompilasi Discovery Ambient online berkualitas studio tinggi (Sylvan Audio ecosystem).
                      </p>
                      <div className="pt-3 border-t border-[#D1D1CB]/30 flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-[#8E8E82]">
                        <span>Versi Aplikasi</span>
                        <span>v1.4.0 Stable</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-[#8E8E82]">
                        <span>Lisensi</span>
                        <span>Apache-2.0</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Panel: Beautiful Vinyl/Art Canvas (Desktop only) */}
          <div className="hidden lg:flex w-96 xl:w-[420px] border-l border-[#D1D1CB]/50 flex-col items-center justify-center p-8 xl:p-12 bg-[#EBEBE4]/20">
            <AnimatePresence mode="wait">
              {currentTrack ? (
                <motion.div 
                  key={currentTrack.id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.05, opacity: 0 }}
                  className="w-full flex flex-col items-center"
                >
                  {/* Rotating Vinyl Record with Cover or Placeholder */}
                  <div className="relative group mb-8">
                    <div className="absolute inset-x-0 bottom-[-15px] h-[30px] w-[85%] mx-auto bg-black/15 blur-xl rounded-full" />
                    
                    <motion.div 
                      animate={status === 'playing' ? { rotate: 360 } : {}}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 12 / waveSpeed, 
                        ease: 'linear' 
                      }}
                      className="relative w-64 h-64 xl:w-72 xl:h-72 rounded-full bg-[#1A1A1A] p-2 flex items-center justify-center shadow-2xl border-4 border-white"
                    >
                      {/* Grooves */}
                      <div className="absolute inset-4 rounded-full border border-white/5 pointer-events-none" />
                      <div className="absolute inset-8 rounded-full border border-white/5 pointer-events-none" />
                      <div className="absolute inset-12 rounded-full border border-white/5 pointer-events-none" />
                      <div className="absolute inset-16 rounded-full border border-white/5 pointer-events-none" />

                      {/* Cover circle inside record */}
                      <div className="w-28 h-28 xl:w-32 xl:h-32 rounded-full overflow-hidden relative border-2 border-dashed border-white/10 flex items-center justify-center bg-[#5A5A40]">
                        <img 
                          src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop"
                          alt="Cover art" 
                          className="w-full h-full object-cover select-none pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="absolute w-5 h-5 bg-[#F5F5F0] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-black/10 shadow-inner" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Active Metadata */}
                  <div className="text-center w-full px-4">
                    <h3 className="font-serif text-xl font-bold truncate tracking-tight text-[#2C2C24]">
                      {currentTrack.title}
                    </h3>
                    <p className="text-xs text-[#8E8E82] uppercase tracking-widest font-bold mt-1 mb-4">
                      {currentTrack.artist}
                    </p>

                    {/* Simple Wave Visualizer */}
                    {audioVisualizer !== 'none' && (
                      <div className="h-10 flex items-center justify-center gap-1">
                        {Array.from({ length: 15 }).map((_, i) => (
                          <motion.div 
                            key={i}
                            animate={status === 'playing' ? {
                              height: audioVisualizer === 'wave' 
                                ? [10, 40, 10] 
                                : [2, 35, 2]
                            } : { height: 4 }}
                            transition={{ 
                              duration: (0.7 + Math.random() * 0.7) / waveSpeed, 
                              repeat: Infinity, 
                              ease: 'easeInOut',
                              delay: i * 0.04
                            }}
                            className={cn(
                              "w-1 rounded-full",
                              audioVisualizer === 'wave' ? "bg-[#5A5A40]" : "bg-[#A3A380]"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="text-center text-[#8E8E82] py-20 px-8">
                  <Music className="mx-auto mb-4 opacity-35 animate-bounce-slow" size={48} />
                  <p className="text-sm font-serif italic">Sambungkan musik baru untuk menghidupkan piringan hitam studio Anda.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Media Controls Bottom Ribbon Bar */}
        <footer className="bg-[#5A5A40] text-white py-5 px-6 md:px-8 border-t border-white/5 flex flex-col md:flex-row items-center gap-4 shrink-0 transition-all duration-300">
          
          {/* Audio Slider Control */}
          <div className="w-full flex-1 flex items-center gap-3.5 order-2 md:order-1">
            <span className="text-[10px] font-mono opacity-80 shrink-0">{formatTime(currentTime)}</span>
            
            <div className="relative flex-1 h-1.5 flex items-center">
              <input 
                type="range" 
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full absolute inset-x-0 h-1 cursor-pointer opacity-0 z-20"
              />
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white relative rounded-full"
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-[#5A5A40] rounded-full" />
                </div>
              </div>
            </div>

            <span className="text-[10px] font-mono opacity-80 shrink-0">{formatTime(duration)}</span>
          </div>

          {/* Core Player Action Controls */}
          <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-7 order-1 md:order-2 shrink-0">
            
            {/* Repeat, Shuffle & Volume Pack */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsShuffle(!isShuffle)}
                className={cn("p-2 rounded-xl transition-all", isShuffle ? "text-[#A3A380]" : "text-white/60 hover:text-white")}
                title="Shuffle"
              >
                <Shuffle size={16} />
              </button>
              <button 
                onClick={() => setRepeatMode(curr => curr === 'none' ? 'all' : curr === 'all' ? 'one' : 'none')}
                className={cn("p-2 rounded-xl relative transition-all", repeatMode !== 'none' ? "text-[#A3A380]" : "text-white/60 hover:text-white")}
                title="Repeat Mode"
              >
                <Repeat size={16} />
                {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-white text-[#5A5A40] w-3 h-3 rounded-full flex items-center justify-center">1</span>}
              </button>
            </div>

            {/* Back, Play, Next */}
            <div className="flex items-center gap-3.5">
              <button 
                onClick={prevTrack}
                className="p-2 text-white/70 hover:text-white hover:scale-105 active:scale-95 transition-all"
              >
                <SkipBack size={18} fill="currentColor" />
              </button>
              <button 
                onClick={togglePlay}
                className="w-11 h-11 rounded-full bg-white text-[#5A5A40] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                {status === 'playing' ? <Pause size={18} fill="currentColor" /> : <Play size={18} className="ml-0.5" fill="currentColor" />}
              </button>
              <button 
                onClick={nextTrack}
                className="p-2 text-white/70 hover:text-white hover:scale-105 active:scale-95 transition-all"
              >
                <SkipForward size={18} fill="currentColor" />
              </button>
            </div>

            {/* Volume pack */}
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 text-white/70 hover:text-white transition-all"
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input 
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-14 sm:w-20 cursor-pointer accent-white"
              />
            </div>

          </div>

        </footer>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, SkipForward, SkipBack, 
  Volume2, VolumeX, Repeat, Shuffle, 
  List, Music, Plus, Trash2, Heart,
  MoreVertical, Search, X
} from 'lucide-react';
import { Track, PlaybackStatus, RepeatMode } from '../types';
import { cn, formatTime } from '../lib/utils';

export default function AudioPlayer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [status, setStatus] = useState<PlaybackStatus>('stopped');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTrack = currentTrackIndex >= 0 ? tracks[currentTrackIndex] : null;

  // Sync state with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (status === 'playing') {
      audioRef.current?.play().catch(e => console.error("Playback error", e));
    } else if (status === 'paused') {
      audioRef.current?.pause();
    }
  }, [status, currentTrackIndex]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newTracks: Track[] = Array.from(files).map((file: File) => {
      // Basic heuristic to extract title/artist from filename
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      const parts = fileName.split(" - ");
      const artist = parts.length > 1 ? parts[0] : "Unknown Artist";
      const title = parts.length > 1 ? parts[1] : parts[0];

      return {
        id: Math.random().toString(36).substr(2, 9),
        title,
        artist,
        audioUrl: URL.createObjectURL(file), // Local blob URL
        fileName: file.name,
        duration: 0 // Will be updated when loaded
      };
    });

    setTracks(prev => [...prev, ...newTracks]);
    if (currentTrackIndex === -1) {
      setCurrentTrackIndex(0);
    }
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
        setIsLibraryOpen(true);
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
      // Avoid same track if possible
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

  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full h-screen flex flex-col p-6 md:p-10 overflow-hidden select-none bg-[#F5F5F0] text-[#2C2C24]">
      {/* Background Album Art (Subtle Gradient Shift instead of dark atmosphere) */}
      <div className="absolute inset-0 z-[-1] bg-gradient-to-br from-[#5A5A40]/10 to-[#A3A380]/10 opacity-30" />

      <audio
        ref={audioRef}
        src={currentTrack?.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Header Navigation */}
      <header className="flex justify-between items-center mb-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5A5A40] rounded-full flex items-center justify-center shadow-lg shadow-[#5A5A40]/20">
            <Music className="w-5 h-5 text-white" />
          </div>
          <span className="font-serif text-2xl font-semibold tracking-tight whitespace-nowrap">Musik Assistant</span>
        </div>
        <nav className="hidden md:flex gap-8 text-xs font-medium uppercase tracking-widest text-[#8E8E82]">
          <button 
            onClick={() => setIsLibraryOpen(false)}
            className={cn("transition-all pb-1", !isLibraryOpen ? "text-[#5A5A40] border-b-2 border-[#5A5A40]" : "hover:text-[#5A5A40]")}
          >
            Listening Now
          </button>
          <button 
            onClick={() => setIsLibraryOpen(true)}
            className={cn("transition-all pb-1", isLibraryOpen ? "text-[#5A5A40] border-b-2 border-[#5A5A40]" : "hover:text-[#5A5A40]")}
          >
            Library
          </button>
          <span className="cursor-default opacity-50">Profiles</span>
        </nav>
        <div className="w-32 h-10 bg-white rounded-full border border-[#D1D1CB] flex items-center px-4 gap-2 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Studio Hi-Fi</span>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-10 overflow-hidden mb-10">
        {/* Album Art Section */}
        <section className={cn(
          "flex flex-col justify-center items-center h-full transition-all duration-700",
          isLibraryOpen ? "md:col-span-12 lg:col-span-7" : "md:col-span-12"
        )}>
          <AnimatePresence mode="wait">
            {tracks.length > 0 ? (
              <motion.div 
                key={currentTrack?.id || 'empty'}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="relative w-full max-w-[500px] aspect-square"
              >
                <div className="absolute inset-0 bg-[#D9D9D0] rounded-[48px] shadow-2xl overflow-hidden ring-1 ring-black/5">
                  {/* Decorative Pattern / Placeholder Art */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#5A5A40]/30 to-[#A3A380]/30 mix-blend-multiply" />
                  <img 
                    src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop"
                    alt="Organic Echoes" 
                    className="w-full h-full object-cover opacity-80"
                  />
                  
                  {/* Text Overlay */}
                  <div className="absolute bottom-10 left-10 right-10 text-white z-10">
                    <p className="text-[10px] uppercase tracking-[0.3em] opacity-80 font-bold mb-2">Track {currentTrackIndex + 1} of {tracks.length}</p>
                    <h1 className="font-serif text-5xl font-light mb-3 leading-tight drop-shadow-md">
                      {currentTrack?.title || "Quiet Forest"}
                    </h1>
                    <p className="text-xl opacity-90 italic font-serif">
                      {currentTrack?.artist || "Nature Whisperer"} — {currentTrack?.album || "Organic Echoes"}
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="w-32 h-32 bg-[#5A5A40]/10 rounded-full flex items-center justify-center text-[#5A5A40]">
                  <Music size={64} strokeWidth={1} />
                </div>
                <div>
                  <h2 className="font-serif text-3xl mb-2">Belum ada musik</h2>
                  <p className="text-[#8E8E82] max-w-xs mx-auto">
                    Masukkan musik hasil download Anda untuk mulai mendengarkan secara offline.
                  </p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-3 bg-[#5A5A40] text-white rounded-full font-bold shadow-lg hover:bg-[#484832] transition-colors"
                >
                  Pilih File Musik
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Playlist / Library Section */}
        <AnimatePresence>
          {isLibraryOpen && (
            <motion.section 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "md:col-span-12 lg:col-span-5 flex flex-col bg-white/40 rounded-[40px] border p-8 shadow-sm backdrop-blur-md overflow-hidden transition-all",
                isDragging ? "border-[#5A5A40] bg-[#5A5A40]/5 scale-[0.99]" : "border-[#D1D1CB]"
              )}
            >
              <div className="flex justify-between items-end mb-8">
                <h2 className="font-serif text-3xl text-[#2C2C24]">Daftar Putar</h2>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-[#5A5A40] text-white rounded-full hover:scale-105 transition-all shadow-md"
                  >
                    <Plus size={18} />
                  </button>
                  <span className="text-[10px] uppercase tracking-widest text-[#8E8E82] font-bold">
                    {Math.max(0, tracks.length - currentTrackIndex - 1)} Tracks Remaining
                  </span>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  multiple 
                  accept="audio/*" 
                  className="hidden" 
                />
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E82]" size={16} />
                <input 
                  type="text"
                  placeholder="Filter your collection..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#EBEBE4]/50 border border-[#D1D1CB] rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-[#5A5A40] transition-all"
                />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                {filteredTracks.map((track, idx) => {
                  const isActive = tracks.indexOf(track) === currentTrackIndex;
                  return (
                    <motion.div
                      key={track.id}
                      onClick={() => {
                        setCurrentTrackIndex(tracks.indexOf(track));
                        setStatus('playing');
                      }}
                      className={cn(
                        "group flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all duration-300",
                        isActive ? "bg-white shadow-md border border-[#EBEBE4]" : "hover:bg-white/30 border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        isActive ? "bg-[#F5F5F0]" : "bg-[#D9D9D0]"
                      )}>
                        {isActive && status === 'playing' ? (
                           <div className="flex items-end gap-0.5 h-3">
                           {[1, 2, 3].map(i => (
                             <motion.div 
                               key={i}
                               animate={{ height: [4, 12, 6, 12, 4] }}
                               transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                               className="w-0.5 bg-[#5A5A40] rounded-full"
                             />
                           ))}
                         </div>
                        ) : (
                          <Music className="text-[#8E8E82]" size={18} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-semibold text-sm", isActive ? "text-[#2C2C24]" : "text-[#5A5A40]")}>
                          {track.title}
                        </p>
                        <p className="text-xs text-[#8E8E82] uppercase tracking-wide font-medium">{track.artist}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-[#8E8E82]">
                          {formatTime(track.duration || 0)}
                        </span>
                        <button 
                          onClick={(e) => removeTrack(e, track.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-[#8E8E82] hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Audio Control Bar (Pill Shape) */}
      <footer className="h-24 bg-[#5A5A40] rounded-full shadow-2xl flex items-center px-10 gap-4 md:gap-12 text-white shrink-0 mb-4 ring-1 ring-white/10">
        <div className="flex gap-4 md:gap-6 items-center shrink-0">
          <button 
            onClick={prevTrack}
            className="opacity-70 hover:opacity-100 transition-all active:scale-90"
          >
            <SkipBack size={24} fill="currentColor" />
          </button>
          <button 
            onClick={togglePlay}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#5A5A40] shadow-inner hover:scale-105 active:scale-95 transition-all"
          >
            {status === 'playing' ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
          </button>
          <button 
            onClick={nextTrack}
            className="opacity-70 hover:opacity-100 transition-all active:scale-90"
          >
            <SkipForward size={24} fill="currentColor" />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex justify-between text-[9px] uppercase tracking-widest font-bold opacity-60">
            <span>{formatTime(currentTime)}</span>
            <div className="flex-1 text-center truncate px-4 hidden md:block">
              {currentTrack?.title || "Ready to play"}
            </div>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="relative group/seeker">
            <input 
              type="range" 
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 cursor-pointer accent-white opacity-0 absolute inset-0 z-10"
            />
            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-white rounded-full relative"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-4 border-[#5A5A40] rounded-full" />
              </motion.div>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 shrink-0">
          <div className="flex items-center gap-3 group/vol">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="opacity-70 hover:opacity-100 transition-all"
            >
              {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <div className="w-20 lg:w-32 h-1 bg-white/20 rounded-full relative">
               <input 
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-full opacity-0 absolute inset-0 z-10 cursor-pointer"
              />
              <div 
                className="h-full bg-white rounded-full" 
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setIsShuffle(!isShuffle)}
              className={cn("transition-all", isShuffle ? "text-white" : "opacity-40 hover:opacity-70")}
            >
              <Shuffle size={18} />
            </button>
            <button 
              onClick={() => setRepeatMode(curr => curr === 'none' ? 'all' : curr === 'all' ? 'one' : 'none')}
              className={cn("transition-all relative", repeatMode !== 'none' ? "text-white" : "opacity-40 hover:opacity-70")}
            >
              <Repeat size={18} />
              {repeatMode === 'one' && <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold">1</span>}
            </button>
          </div>
        </div>

        {/* Mobile Library Toggle */}
        <button 
          onClick={() => setIsLibraryOpen(!isLibraryOpen)}
          className="md:hidden opacity-70 hover:opacity-100"
        >
          <List size={24} />
        </button>
      </footer>
    </div>
  );
}

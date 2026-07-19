import React, { useState, useEffect, useRef } from 'react';

interface WaveformPlayerProps {
  audioUrl: string;
  onDownload: () => void;
  isDark: boolean;
  countryFlag: string;
  countryName: string;
}

const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  audioUrl,
  onDownload,
  isDark,
  countryFlag,
  countryName,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>([]);

  // Generate simulated dynamic waveform bars based on audio URL change
  useEffect(() => {
    const barCount = 42;
    const bars: number[] = [];
    for (let i = 0; i < barCount; i++) {
      // Create a nice authentic speech-like waveform distribution
      const baseHeight = 20 + Math.sin(i * 0.4) * 35 + Math.cos(i * 0.8) * 25;
      const randomNoise = Math.random() * 20;
      bars.push(Math.min(100, Math.max(15, baseHeight + randomNoise)));
    }
    setWaveformBars(bars);
    setIsPlaying(false);
    setCurrentTime(0);
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-[#09090B] border-white/10 shadow-2xl' : 'bg-white border-[#E4E4E7] shadow-lg shadow-[#D4FF00]/5'
      }`}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#D4FF00] to-[#D4FF00] flex items-center justify-center text-2xl shadow-md shrink-0">
            {countryFlag}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#D4FF00]">
                Sortie HD 24kHz
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
            </div>
            <h4 className="text-base font-extrabold text-zinc-900 dark:text-white mt-0.5">
              Voix-Off {countryName} • Studio Mix
            </h4>
          </div>
        </div>

        <button
          onClick={onDownload}
          className={`w-full sm:w-auto px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-md ${
            isDark
              ? 'bg-[#D4FF00] text-black hover:bg-[#E2FF3B] shadow-[#D4FF00]/10'
              : 'bg-[#D4FF00] text-black hover:bg-[#E2FF3B] shadow-[#D4FF00]/15'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Télécharger WAV</span>
        </button>
      </div>

      {/* Waveform Visualization & Controls */}
      <div className="flex items-center gap-4 sm:gap-6">
        <button
          onClick={togglePlay}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-90 shadow-xl ${
            isDark
              ? 'bg-gradient-to-tr from-[#D4FF00] to-[#D4FF00] text-black hover:scale-105'
              : 'bg-gradient-to-tr from-[#D4FF00] to-[#E2FF3B] text-black hover:scale-105'
          }`}
          title={isPlaying ? 'Mettre en pause' : 'Écouter'}
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 001.555.832l3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 h-14 bg-zinc-100 dark:bg-zinc-900/80 px-3 py-2 rounded-2xl border border-zinc-200 dark:border-white/5 relative overflow-hidden cursor-pointer"
            onClick={(e) => {
              if (!audioRef.current || duration <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const newPercentage = clickX / rect.width;
              audioRef.current.currentTime = newPercentage * duration;
              setCurrentTime(audioRef.current.currentTime);
            }}
          >
            {/* Progress overlay */}
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-150 ${
                'bg-[#D4FF00]/15 border-r-2 border-[#D4FF00]'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />

            {waveformBars.map((height, idx) => {
              const barProgress = (idx / waveformBars.length) * 100;
              const isPassed = barProgress <= progressPercentage;
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    isPassed
                      ? 'bg-[#D4FF00]'
                      : isDark
                      ? 'bg-zinc-700/60 group-hover:bg-zinc-600'
                      : 'bg-zinc-300 group-hover:bg-zinc-400'
                  }`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-2.5 px-1 font-mono text-xs font-bold text-zinc-500">
            <span className={isPlaying ? 'text-[#D4FF00] font-black' : ''}>
              {formatTime(currentTime)}
            </span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaveformPlayer;

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  random,
  Audio,
  staticFile,
  Img
} from 'remotion';

const COLORS = {
  background: '#050505',
  text: '#FAFAFA',
  accentOrange: '#D4FF00', // Neon green for consistency with the brand
  accentNeon: '#D4FF00',
  glassBg: 'rgba(15, 15, 15, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
};

export const AfriVoiceAd: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ================= TIMING =================
  const S1_INTRO = 0;
  const S2_MOCKUP = 120;
  const S3_WAVEFORM = 280;
  const S4_OUTRO = 420;
  
  // ================= ANIMATIONS =================
  
  // Intro (Apple style: slow fade up, subtle scale)
  const introOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const introScale = interpolate(frame, [0, 100], [1.1, 1], { extrapolateRight: 'clamp' });
  const introTextY = spring({ fps, frame: frame - 20, config: { damping: 15, stiffness: 60 } });
  
  // Mockup (Samsung/Apple style: smooth 3D entry, perfect glassmorphism)
  const uiFrame = frame - S2_MOCKUP;
  const uiScale = spring({ fps, frame: uiFrame, config: { damping: 16, stiffness: 80 } });
  const uiRotateX = interpolate(uiFrame, [0, 90], [10, 0], { extrapolateRight: 'clamp' });
  const uiY = interpolate(uiFrame, [0, 60], [100, 0], { extrapolateRight: 'clamp' });
  const uiOpacity = interpolate(uiFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Typing effect
  const typeText = "Bienvenue sur AfriVoice. L'IA de voix-off ultime pour l'Afrique.";
  const typeProgress = interpolate(uiFrame, [40, 120], [0, typeText.length], { extrapolateRight: 'clamp' });
  const displayedText = typeText.substring(0, Math.floor(typeProgress));

  // Waveform
  const waveFrame = frame - S3_WAVEFORM;
  const waveOpacity = interpolate(waveFrame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const waveScale = spring({ fps, frame: waveFrame, config: { damping: 14, stiffness: 70 } });

  // Outro
  const outroFrame = frame - S4_OUTRO;
  const outroScale = spring({ fps, frame: outroFrame, config: { damping: 14, stiffness: 90 } });
  const outroOpacity = interpolate(outroFrame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const pulseScale = interpolate(Math.sin((frame - S4_OUTRO) * 0.1), [-1, 1], [1, 1.03]);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background, fontFamily: '"Inter", sans-serif' }}>
      
      {/* 🎵 FOND SONORE ÉPIQUE (BENSOUND EPIC) */}
      <Audio 
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 
        volume={interpolate(frame, [S3_WAVEFORM - 15, S3_WAVEFORM], [0.6, 0.05], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' })} 
        startFrom={150}
      />

      {/* 🌌 LUMIÈRES VOLUMÉTRIQUES (Apple Pro Style) */}
      <AbsoluteFill>
        <div style={{
            position: 'absolute', top: '-10%', left: '10%', width: 800, height: 800,
            background: `radial-gradient(circle, ${COLORS.accentNeon}15 0%, transparent 70%)`, filter: 'blur(120px)'
        }} />
        <div style={{
            position: 'absolute', bottom: '-20%', right: '0%', width: 1000, height: 1000,
            background: `radial-gradient(circle, ${COLORS.accentNeon}10 0%, transparent 60%)`, filter: 'blur(150px)'
        }} />

        {/* Particules Dynamiques Flottantes (Effet supplémentaire) */}
        {Array.from({ length: 40 }).map((_, i) => {
          const yOffset = interpolate(frame % 300, [0, 300], [0, -300]);
          return (
            <div key={i} style={{
              position: 'absolute',
              left: random(`px-${i}`) * 1080,
              top: (random(`py-${i}`) * 1920) + yOffset,
              width: random(`ps-${i}`) * 6 + 2,
              height: random(`ps-${i}`) * 6 + 2,
              borderRadius: '50%',
              backgroundColor: COLORS.accentNeon,
              opacity: interpolate(frame, [0, 30], [0, 0.4]),
              boxShadow: `0 0 15px ${COLORS.accentNeon}`
            }} />
          );
        })}
      </AbsoluteFill>

      {/* 🎬 SÉQUENCE 1 : INTRO MINIMALISTE (0 - 120) */}
      <Sequence from={S1_INTRO} durationInFrames={S2_MOCKUP + 20}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ 
            opacity: interpolate(frame, [S2_MOCKUP - 20, S2_MOCKUP], [1, 0], { extrapolateRight: 'clamp' }),
            transform: `scale(${introScale})`,
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <h1 style={{ 
              fontSize: 130, fontWeight: 900, color: COLORS.text, letterSpacing: '-4px', margin: 0,
              opacity: introOpacity, textShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}>
              AfriVoice<span style={{ color: COLORS.accentNeon }}>AI</span>
            </h1>
            <div style={{ 
              transform: `translateY(${interpolate(introTextY, [0, 1], [40, 0])}px)`, 
              opacity: interpolate(introTextY, [0, 1], [0, 1]),
              marginTop: 20, textAlign: 'center'
            }}>
              <p style={{ fontSize: 60, fontWeight: 700, color: '#FAFAFA', letterSpacing: '-1px', margin: 0 }}>
                Le 1er Studio de <br/> <span style={{ color: COLORS.accentNeon }}>Voix-Off 100% Africaines.</span>
              </p>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 💻 SÉQUENCE 2 : LE STUDIO HD (120 - 280) */}
      <Sequence from={S2_MOCKUP} durationInFrames={180}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          {/* Son du clavier synchronisé avec la frappe */}
          <Audio 
            src={staticFile("keyboard.ogg")} 
            startFrom={0}
            endAt={80} // Joue pendant la frappe (80 frames)
            volume={interpolate(uiFrame, [40, 120], [0.8, 0], { extrapolateRight: 'clamp' })}
          />

          <h2 style={{ 
            fontSize: 70, color: COLORS.text, fontWeight: 800, marginBottom: 40, 
            opacity: interpolate(uiFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(uiFrame, [0, 20], [20, 0], { extrapolateRight: 'clamp' })}px)`
          }}>
            <span style={{ color: COLORS.accentNeon }}>L'Application de Voix-Off</span> Ultime.
          </h2>

          <div style={{
            width: '80%', height: 700,
            background: COLORS.glassBg, backdropFilter: 'blur(40px)',
            border: `1px solid ${COLORS.glassBorder}`, borderRadius: 32,
            boxShadow: `0 50px 100px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1)`,
            transform: `scale(${uiScale}) perspective(1200px) rotateX(${uiRotateX}deg) translateY(${uiY}px)`,
            opacity: interpolate(uiFrame, [140, 160], [1, 0], { extrapolateRight: 'clamp' }), // Fade out avant waveform
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            {/* Top Bar macOS style */}
            <div style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 30px', gap: 12, borderBottom: `1px solid ${COLORS.glassBorder}` }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#4A4A4A' }}/>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#4A4A4A' }}/>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#4A4A4A' }}/>
              <div style={{ marginLeft: 'auto', fontSize: 18, color: '#71717A', fontWeight: 600, letterSpacing: '1px' }}>STUDIO HD</div>
            </div>
            
            <div style={{ padding: 60, display: 'flex', flexDirection: 'column', gap: 30, height: '100%' }}>
              {/* Params UI */}
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ flex: 1, height: 70, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: `1px solid ${COLORS.glassBorder}`, display: 'flex', alignItems: 'center', padding: '0 25px', fontSize: 24, color: COLORS.accentNeon, fontWeight: 700 }}>
                  🇨🇮 Accent Ivoirien
                </div>
                <div style={{ flex: 1, height: 70, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: `1px solid ${COLORS.glassBorder}`, display: 'flex', alignItems: 'center', padding: '0 25px', fontSize: 24, color: '#FFF', fontWeight: 500 }}>
                  🎙️ Voix Studio (Pro)
                </div>
              </div>
              
              {/* Text Area */}
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 40, fontSize: 38, color: '#E4E4E7', lineHeight: 1.6, border: `1px solid ${COLORS.glassBorder}`, fontWeight: 500 }}>
                {displayedText}
                <span style={{ opacity: interpolate(Math.sin(uiFrame * 0.5), [-1, 1], [0, 1]), color: COLORS.accentNeon }}>|</span>
              </div>

              {/* Generate Button */}
              <div style={{ 
                height: 90, background: COLORS.accentNeon, borderRadius: 20, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: 30, fontWeight: 900, color: '#000', letterSpacing: '1px',
                transform: `scale(${interpolate(uiFrame, [120, 130, 140], [1, 0.98, 1])})`, // Clic simulé
                boxShadow: uiFrame > 125 ? `0 0 40px ${COLORS.accentNeon}50` : 'none'
              }}>
                GÉNÉRER LA VOIX
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 🌊 SÉQUENCE 3 : MAGIE AUDIO (280 - 420) */}
      <Sequence from={S3_WAVEFORM} durationInFrames={160}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          {/* Son de la voix générée */}
          <Audio 
            src={staticFile("voice.mp3")} 
            volume={1}
            startFrom={0}
          />
          
          <div style={{ 
            opacity: interpolate(frame, [S4_OUTRO - 20, S4_OUTRO], [1, 0], { extrapolateRight: 'clamp' }),
            transform: `scale(${waveScale})`,
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', height: 300, opacity: waveOpacity }}>
              {Array.from({ length: 50 }).map((_, i) => {
                const height = Math.abs(Math.sin((waveFrame) * 0.25 + i * 0.4) * Math.cos(i * 0.6)) * 0.8 + 0.15;
                return (
                  <div key={i} style={{
                    width: 12, height: 20 + height * 280,
                    background: COLORS.accentNeon,
                    borderRadius: 20,
                    boxShadow: `0 0 20px ${COLORS.accentNeon}60`
                  }} />
                );
              })}
            </div>
            <h2 style={{ fontSize: 75, fontWeight: 900, color: COLORS.text, marginTop: 80, letterSpacing: '-1px', opacity: waveOpacity, textAlign: 'center', lineHeight: 1.1 }}>
              Une Qualité <br/>
              <span style={{ color: COLORS.accentNeon }}>Studio Professionnelle.</span>
            </h2>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 🚀 SÉQUENCE 4 : OUTRO ÉPIQUE (420 - 550) */}
      <Sequence from={S4_OUTRO}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ 
            transform: `scale(${outroScale})`, 
            opacity: outroOpacity,
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: `${COLORS.accentNeon}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 40, border: `2px solid ${COLORS.accentNeon}50` }}>
              <svg className="w-16 h-16 text-[#D4FF00]" fill="none" viewBox="0 0 24 24" stroke={COLORS.accentNeon}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 style={{ fontSize: 130, fontWeight: 900, color: COLORS.text, letterSpacing: '-4px', margin: 0, lineHeight: 1.1 }}>
              Faites parler <br/>
              <span style={{ color: COLORS.accentNeon }}>vos idées.</span>
            </h1>
            
            <p style={{ fontSize: 45, color: '#A1A1AA', marginTop: 30, fontWeight: 600, letterSpacing: '0px' }}>
              Testez la magie de l'IA dès aujourd'hui.
            </p>
            
            <div style={{
              marginTop: 80, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: COLORS.text,
              color: '#000', 
              padding: '35px 80px', borderRadius: 100,
              fontSize: 40, fontWeight: 800, textTransform: 'uppercase',
              transform: `scale(${pulseScale})`,
              boxShadow: `0 20px 60px rgba(255, 255, 255, 0.15)`,
              letterSpacing: '1px'
            }}>
              COMMENCER MAINTENANT
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

    </AbsoluteFill>
  );
};

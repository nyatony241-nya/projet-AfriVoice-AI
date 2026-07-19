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
} from 'remotion';

const COLORS = {
  background: '#09090B',
  text: '#FFFFFF',
  accentOrange: '#D4FF00',
  accentNeon: '#D4FF00',
  glassBg: 'rgba(24, 24, 27, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
};

export const AfriVoiceAd: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Particules Premium (Poussière d'or / néon)
  const particles = Array.from({ length: 50 }, (_, i) => {
    const yOffset = interpolate(frame % 450, [0, 450], [0, -400]);
    return {
      x: random(`px-${i}`) * 1080,
      y: (random(`py-${i}`) * 1920) + yOffset,
      size: random(`ps-${i}`) * 5 + 1,
      opacity: interpolate(frame, [0, 450], [0, 0.8]),
    };
  });

  // ================= ANIMATIONS =================
  // Intro
  const introBlur = interpolate(frame, [0, 20], [30, 0], { extrapolateRight: 'clamp' });
  const introScale = spring({ fps, frame, config: { damping: 14, stiffness: 80 } });
  const subtitleY = spring({ fps, frame: frame - 15, config: { damping: 12, stiffness: 100 } });

  // UI Mockup (L'application)
  const uiScale = spring({ fps, frame: frame - 110, config: { damping: 14, stiffness: 90 } });
  const uiRotate = interpolate(frame - 110, [0, 60], [5, 0], { extrapolateRight: 'clamp' });
  
  // Waveform
  const waveOpacity = interpolate(frame - 260, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Outro
  const outroScale = spring({ fps, frame: frame - 350, config: { damping: 12, stiffness: 100 } });
  const pulseScale = interpolate(Math.sin((frame - 380) * 0.15), [-1, 1], [1, 1.05]);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background, fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}>
      
      {/* 🎵 FOND SONORE LOCAL */}
      <Audio 
        src={staticFile("background.mp3")} 
        volume={0.6} 
        startFrom={300} // Démarre au moment épique
      />

      {/* 🌌 LUMIÈRES & PARTICULES */}
      <AbsoluteFill>
        <div style={{
            position: 'absolute', top: '10%', left: '-10%', width: 1000, height: 1000,
            background: `radial-gradient(circle, ${COLORS.accentOrange}25 0%, transparent 60%)`, filter: 'blur(100px)'
        }} />
        <div style={{
            position: 'absolute', bottom: '10%', right: '-20%', width: 1000, height: 1000,
            background: `radial-gradient(circle, ${COLORS.accentNeon}20 0%, transparent 60%)`, filter: 'blur(100px)'
        }} />

        {particles.map((p, i) => (
          <div key={i} style={{
            position: 'absolute', left: p.x, top: p.y, width: p.size, height: p.size,
            borderRadius: '50%', backgroundColor: i % 2 === 0 ? COLORS.accentNeon : COLORS.accentOrange,
            opacity: p.opacity, boxShadow: `0 0 10px ${i % 2 === 0 ? COLORS.accentNeon : COLORS.accentOrange}`
          }} />
        ))}
      </AbsoluteFill>

      {/* 🎬 SÉQUENCE 1 : Le Logo et L'Accroche (0 - 110) */}
      <Sequence from={0} durationInFrames={120}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center' }}>
          
          {/* LE LOGO ULTRA PROÉMINENT */}
          <div style={{ 
            transform: `scale(${introScale})`, 
            filter: `blur(${introBlur}px)`,
            display: 'flex', alignItems: 'center', gap: 30, marginBottom: 60 
          }}>
            <div style={{ fontSize: 140, filter: `drop-shadow(0px 20px 30px ${COLORS.accentOrange}80)` }}>🎙️</div>
            <h1 style={{ fontSize: 140, fontWeight: 900, color: COLORS.text, letterSpacing: '-5px', margin: 0 }}>
              AfriVoice<span style={{ color: COLORS.accentOrange }}>AI</span>
            </h1>
          </div>
          
          {/* L'ACCROCHE (VOIX OFF) */}
          <div style={{ 
            transform: `translateY(${interpolate(subtitleY, [0, 1], [100, 0])}px)`, 
            opacity: interpolate(subtitleY, [0, 1], [0, 1]) 
          }}>
            <p style={{ fontSize: 75, fontWeight: 800, color: COLORS.text, lineHeight: 1.2, margin: 0 }}>
              Le 1er Studio de <br/>
              <span style={{ color: COLORS.accentNeon }}>Voix-Off 100% Africaines.</span>
            </p>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 💻 SÉQUENCE 2 : Le Mockup de l'Application PRO (110 - 270) */}
      <Sequence from={110} durationInFrames={160}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          
          <h2 style={{ 
            fontSize: 65, color: COLORS.text, fontWeight: 800, marginBottom: 60, 
            opacity: interpolate(frame - 110, [0, 20], [0, 1]) 
          }}>
            L'Application de <span style={{ color: COLORS.accentOrange }}>Voix-Off</span> Ultime.
          </h2>

          {/* Fausse Interface de l'Application (Mockup) */}
          <div style={{
            width: '85%', height: 700,
            background: COLORS.glassBg, backdropFilter: 'blur(30px)',
            border: `2px solid ${COLORS.glassBorder}`, borderRadius: 40,
            boxShadow: `0 40px 80px rgba(0,0,0,0.8), 0 0 0 2px ${COLORS.accentOrange}30`,
            transform: `scale(${uiScale}) perspective(1000px) rotateX(${uiRotate}deg)`,
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            {/* Header du Mockup */}
            <div style={{ height: 80, borderBottom: `2px solid ${COLORS.glassBorder}`, display: 'flex', alignItems: 'center', padding: '0 40px', gap: 15 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#EF4444' }}/>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E2FF3B' }}/>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#10B981' }}/>
              <div style={{ marginLeft: 'auto', fontSize: 24, color: '#A1A1AA', fontWeight: 'bold' }}>AfriVoice Studio</div>
            </div>
            
            {/* Contenu du Mockup */}
            <div style={{ padding: 50, display: 'flex', flexDirection: 'column', gap: 40 }}>
              {/* Selecteurs simulés */}
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ flex: 1, height: 80, background: '#000', borderRadius: 20, border: `2px solid ${COLORS.glassBorder}`, display: 'flex', alignItems: 'center', padding: '0 30px', fontSize: 30, color: COLORS.accentNeon, fontWeight: 'bold' }}>
                  🌍 Accent : Ivoirien
                </div>
                <div style={{ flex: 1, height: 80, background: '#000', borderRadius: 20, border: `2px solid ${COLORS.glassBorder}`, display: 'flex', alignItems: 'center', padding: '0 30px', fontSize: 30, color: '#FFF' }}>
                  🗣️ Voix : Aminata (Pro)
                </div>
              </div>
              
              {/* Zone de texte simulée avec écriture animée */}
              <div style={{ flex: 1, background: '#000', borderRadius: 20, padding: 40, fontSize: 35, color: '#A1A1AA', lineHeight: 1.5, border: `2px solid ${COLORS.glassBorder}` }}>
                {`"Bienvenue sur AfriVoice. La meilleure IA pour vos `}
                <span style={{ color: COLORS.text, fontWeight: 'bold' }}>projets publicitaires...</span>
                <span style={{ opacity: interpolate(Math.sin(frame * 0.5), [-1, 1], [0, 1]) }}>|</span>
              </div>

              {/* Bouton générer simulé */}
              <div style={{ height: 100, background: `linear-gradient(90deg, ${COLORS.accentOrange}, ${COLORS.accentNeon})`, borderRadius: 25, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 900, color: '#000' }}>
                🎙️ GÉNÉRER LA VOIX-OFF
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 🌊 SÉQUENCE 3 : Qualité Audio & Onde Sonore (260 - 360) */}
      <Sequence from={260} durationInFrames={100}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ fontSize: 90, fontWeight: 900, color: COLORS.text, marginBottom: 120, opacity: waveOpacity, textAlign: 'center', lineHeight: 1.1 }}>
            Une Qualité <br/>
            <span style={{ color: COLORS.accentNeon }}>Studio Professionnelle.</span>
          </h2>
          
          <div style={{ display: 'flex', gap: 15, alignItems: 'center', height: 350, opacity: waveOpacity }}>
            {Array.from({ length: 45 }).map((_, i) => {
              // Calcul mathématique pour une onde vocale très réaliste
              const height = Math.abs(Math.sin((frame - 260) * 0.2 + i * 0.3) * Math.cos(i * 0.5)) * 0.8 + 0.2;
              return (
                <div key={i} style={{
                  width: 14, height: 30 + height * 300,
                  background: `linear-gradient(to top, ${COLORS.accentOrange}, ${COLORS.accentNeon})`,
                  borderRadius: 20,
                  boxShadow: `0 0 25px ${COLORS.accentOrange}50`
                }} />
              );
            })}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 🚀 SÉQUENCE 4 : Appel à l'action final (350 - 450) */}
      <Sequence from={350}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ transform: `scale(${outroScale})` }}>
            <h1 style={{ fontSize: 140, fontWeight: 900, color: COLORS.text, letterSpacing: '-5px', margin: 0, lineHeight: 1.1 }}>
              Faites parler <br/>
              <span style={{ color: COLORS.accentOrange }}>vos idées.</span>
            </h1>
            
            <p style={{ fontSize: 55, color: '#A1A1AA', marginTop: 30, fontWeight: 'bold', letterSpacing: '-1px' }}>
              Testez la magie de l'IA dès aujourd'hui.
            </p>
            
            {/* Bouton Pulsant Ultra Premium */}
            <div style={{
              marginTop: 90, display: 'inline-block',
              background: `linear-gradient(90deg, ${COLORS.accentOrange}, ${COLORS.accentNeon})`,
              color: '#000', 
              padding: '45px 120px', borderRadius: 100,
              fontSize: 55, fontWeight: 900, textTransform: 'uppercase',
              transform: `scale(${pulseScale})`,
              boxShadow: `0 30px 80px rgba(234, 88, 12, 0.5)`,
              letterSpacing: '2px'
            }}>
              GÉNÉRER MA VOIX-OFF
            </div>

            <p style={{
              fontSize: 45, color: COLORS.text, marginTop: 80, fontWeight: 900,
              opacity: interpolate(frame, [400, 420], [0, 1], { extrapolateRight: 'clamp' }),
              letterSpacing: '2px',
              textShadow: '0 5px 20px rgba(0,0,0,0.8)'
            }}>
              projet-afri-voice-ai.vercel.app
            </p>
          </div>
        </AbsoluteFill>
      </Sequence>

    </AbsoluteFill>
  );
};

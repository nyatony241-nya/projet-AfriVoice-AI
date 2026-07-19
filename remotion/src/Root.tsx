import { Composition } from 'remotion';
import { AfriVoiceAd } from './AfriVoiceAd';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AfriVoiceAd"
      component={AfriVoiceAd}
      durationInFrames={450} // 15 secondes
      fps={30}
      width={1080}   // Format Carré/Vertical optimisé pour Instagram/TikTok/Facebook
      height={1920}  // (Modifiez en 1920x1080 si vous voulez le format YouTube classique)
    />
  );
};

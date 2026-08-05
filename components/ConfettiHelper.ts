// ──────────────────────────────────────────────────────────────
// ConfettiHelper — Lightweight Canvas Confetti Engine
//
// Autonomously spawns fullscreen confetti particles for 
// celebration effects on successful audio generation or auth.
// Zero dependencies, perfectly safe for builds, runs in 60fps.
// ──────────────────────────────────────────────────────────────

interface ConfettiParticle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

const COLORS = [
  '#D4FF00', // Neon Lime (Primary App Accent)
  '#EA580C', // Orange Terre (Africa Theme)
  '#16A34A', // Green
  '#CA8A04', // Gold
  '#DC2626', // Red
  '#2563EB', // Blue
  '#9333EA', // Purple
];

/**
 * Triggers a 3-second fullscreen confetti celebration on the page.
 */
export function triggerCelebration(): void {
  if (typeof window === 'undefined') return;

  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set size
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const particles: ConfettiParticle[] = [];
  const particleCount = 120;

  // Initialize particles from the center/bottom or random spots
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100, // Spawn above screen
      size: Math.random() * 8 + 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speedX: Math.random() * 4 - 2,
      speedY: Math.random() * 5 + 4, // Gravity falling speed
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 4 - 2,
      opacity: 1,
    });
  }

  let animationFrameId: number;
  const startTime = Date.now();
  const duration = 2500; // 2.5 seconds active animation

  // Render loop
  const animate = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > duration && particles.length === 0) {
      // Cleanup
      window.removeEventListener('resize', resizeCanvas);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // Update position
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += p.rotationSpeed;

      // Slow down fade out towards the end
      if (elapsed > duration - 800) {
        p.opacity -= 0.02;
      }

      // Remove off-screen or faded out particles
      if (p.y > canvas.height || p.opacity <= 0) {
        particles.splice(i, 1);
        continue;
      }

      // Draw particle
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.opacity);
      
      // Draw rectangular confetti piece
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }

    // Spawn burst effects if animation is still young
    if (elapsed < 300 && Math.random() > 0.6) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 20, // Spawn from bottom shooting up
        size: Math.random() * 8 + 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speedX: Math.random() * 6 - 3,
        speedY: -(Math.random() * 8 + 8), // Shoot upward
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
        opacity: 1,
      });
    }

    animationFrameId = requestAnimationFrame(animate);
  };

  animate();
}

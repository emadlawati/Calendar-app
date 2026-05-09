import confetti from "canvas-confetti";

export function triggerConfetti() {
  const duration = 1500;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#fce4ec", "#ffeedb", "#e8f5e9", "#fff3e0", "#f3e5f5"],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#fce4ec", "#ffeedb", "#e8f5e9", "#fff3e0", "#f3e5f5"],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}

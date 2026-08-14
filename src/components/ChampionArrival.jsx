import { useEffect, useState } from "react";

// Bannière plein écran annonçant l'arrivée d'un joueur Diamant/Or/Bronze
// dans un salon en ligne. L'intensité (particules, lueur, durée) suit
// `event.tier.intensity` (Diamant=3, Or=2, Bronze=1).
export default function ChampionArrival({ event, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!event) return;
    setVisible(true);
    const duration = 1700 + event.tier.intensity * 650;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDone?.(), 300);
    }, duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  if (!event) return null;
  const { tier, name } = event;
  const sparkleCount = tier.intensity * 5;
  const glowAlpha = tier.intensity >= 3 ? "40" : tier.intensity === 2 ? "28" : "18";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pointer-events-none transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="absolute inset-0 champion-glow"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${tier.glow}${glowAlpha}, transparent 60%)`,
          animation: visible ? "champion-glow-pulse 1.1s ease-in-out infinite" : "none",
        }}
      />

      {Array.from({ length: sparkleCount }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full champion-sparkle"
          style={{
            top: "6%",
            left: `${50 + Math.sin(i * 47.3) * 42}%`,
            width: 4 + (i % 3) * 2,
            height: 4 + (i % 3) * 2,
            background: tier.glow,
            boxShadow: `0 0 8px ${tier.glow}`,
            animation: `sparkle-fall ${1.1 + (i % 5) * 0.15}s ease-in ${i * 0.06}s both`,
          }}
        />
      ))}

      <div
        className="mt-10 sm:mt-14 flex items-center gap-3 px-5 py-3 sm:px-7 sm:py-4 rounded-2xl border champion-pop"
        style={{
          background: "linear-gradient(180deg, rgba(23,24,26,0.95), rgba(23,24,26,0.88))",
          borderColor: `${tier.glow}77`,
          boxShadow: `0 0 ${18 + tier.intensity * 16}px ${tier.glow}${
            tier.intensity >= 3 ? "99" : "55"
          }, 0 14px 32px -12px rgba(0,0,0,0.75)`,
        }}
      >
        <tier.badgeIcon
          style={{ width: 22 + tier.intensity * 4, height: 22 + tier.intensity * 4, color: tier.glow }}
        />
        <p className="text-sm sm:text-base font-medium text-stone-100 whitespace-nowrap">
          <span
            className="font-bold"
            style={{
              backgroundImage: tier.gradient,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Joueur {tier.label}
          </span>{" "}
          vient d'arriver — {name}
        </p>
      </div>
    </div>
  );
}

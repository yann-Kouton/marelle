import { Gem, Medal, Star } from "lucide-react";

// Les 4 paliers visuels du classement mondial (par saison).
// intensity pilote la force de l'animation d'arrivée en salon.
export const TIERS = {
  diamond: {
    key: "diamond",
    label: "Diamant",
    intensity: 3,
    gradient: "linear-gradient(135deg,#c9f6ff,#6fd0ff 35%,#8b7bff 70%,#e2c6ff)",
    glow: "#8fd9ff",
    badgeIcon: Gem,
  },
  gold: {
    key: "gold",
    label: "Or",
    intensity: 2,
    gradient: "linear-gradient(135deg,#fff2c2,#ffce54 45%,#dd9a1f 85%)",
    glow: "#ffce54",
    badgeIcon: Medal,
  },
  bronze: {
    key: "bronze",
    label: "Bronze",
    intensity: 1,
    gradient: "linear-gradient(135deg,#f3c8a4,#cd7f47 50%,#8a532a)",
    glow: "#cd7f47",
    badgeIcon: Medal,
  },
  top10: {
    key: "top10",
    label: "Top 10 mondial",
    intensity: 0,
    gradient: "linear-gradient(135deg,#e3e3ee,#a8a8c4 55%,#75758f)",
    glow: "#b3b3cc",
    badgeIcon: Star,
  },
};

export function tierForRank(rank) {
  if (rank === 1) return TIERS.diamond;
  if (rank === 2) return TIERS.gold;
  if (rank === 3) return TIERS.bronze;
  if (rank >= 4 && rank <= 10) return TIERS.top10;
  return null;
}

// Un cadre de saison possédé a pour id `${gameId}-${tier}-s${season}`.
export function parseFrameId(frameId) {
  const m = /^(.+)-(diamond|gold|bronze)-s(\d+)$/.exec(frameId || "");
  if (!m) return null;
  const [, gameId, tier, season] = m;
  return { gameId, tier, season: Number(season) };
}

export function frameStyleFromId(frameId) {
  const parsed = parseFrameId(frameId);
  return parsed ? TIERS[parsed.tier] : null;
}

// Pseudo stylisé selon le tier (dégradé du tier appliqué au texte).
export function RankedName({ name, tier, className = "" }) {
  if (!tier) return <span className={className}>{name}</span>;
  return (
    <span
      className={`font-semibold ${className}`}
      style={{
        backgroundImage: tier.gradient,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        filter: `drop-shadow(0 0 6px ${tier.glow}66)`,
      }}
    >
      {name}
    </span>
  );
}

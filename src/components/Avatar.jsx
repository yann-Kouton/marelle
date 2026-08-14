import { avatarThumbnail } from "../firebase/cloudinary";

// `frame` (optionnel) : un tier de src/components/Rank.jsx ({ gradient, glow,
// badgeIcon }) — utilisé pour afficher l'anneau Diamant/Or/Bronze/Top10 ou un
// cadre de saison équipé, sans changer le rendu par défaut si absent.
export default function Avatar({ url, name = "?", size = 40, frame = null }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const inner = url ? (
    <img
      src={avatarThumbnail(url, size * 2)}
      alt={name}
      width={size}
      height={size}
      className="rounded-full object-cover bg-stone-800 block"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full bg-stone-700 text-stone-200 flex items-center justify-center font-medium"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-label={name}
    >
      {initials || "?"}
    </div>
  );

  if (!frame) return inner;

  const ringPad = Math.max(2, Math.round(size * 0.06));
  const BadgeIcon = frame.badgeIcon;

  return (
    <div
      className="relative inline-flex rounded-full"
      style={{
        padding: ringPad,
        background: frame.gradient,
        boxShadow: `0 0 ${Math.round(size * 0.4)}px ${frame.glow}66`,
      }}
    >
      <div className="rounded-full overflow-hidden" style={{ width: size, height: size }}>
        {inner}
      </div>
      {BadgeIcon && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center"
          style={{
            width: Math.max(14, size * 0.4),
            height: Math.max(14, size * 0.4),
            background: frame.gradient,
            boxShadow: "0 0 3px rgba(0,0,0,0.7)",
          }}
        >
          <BadgeIcon style={{ width: "62%", height: "62%", color: "#1c1006" }} />
        </span>
      )}
    </div>
  );
}

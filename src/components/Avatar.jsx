import { avatarThumbnail } from "../firebase/cloudinary";

export default function Avatar({ url, name = "?", size = 40 }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  if (url) {
    return (
      <img
        src={avatarThumbnail(url, size * 2)}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover bg-stone-800"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-stone-700 text-stone-200 flex items-center justify-center font-medium"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-label={name}
    >
      {initials || "?"}
    </div>
  );
}

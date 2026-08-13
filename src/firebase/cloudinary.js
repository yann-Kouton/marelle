const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

const MAX_SIZE_MB = 5;

// Upload non signé : nécessite un "Upload preset" Cloudinary en mode "Unsigned"
// (Cloudinary Console > Settings > Upload > Upload presets). Voir le README.
export async function uploadAvatar(file) {
  if (!isCloudinaryConfigured) {
    throw new Error("cloudinary-non-configure");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("fichier-invalide");
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error("fichier-trop-lourd");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "marelle/avatars");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("upload-echoue");
  const data = await res.json();
  return data.secure_url;
}

// Insère une transformation Cloudinary (recadrage carré centré visage) dans l'URL.
export function avatarThumbnail(url, size = 96) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace(
    "/upload/",
    `/upload/c_fill,g_face,w_${size},h_${size},q_auto,f_auto/`
  );
}

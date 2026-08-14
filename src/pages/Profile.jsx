import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import BackLink from "../components/BackLink";
import { useAuth } from "../hooks/useAuth";
import { updateUserProfile, signOutUser } from "../firebase/auth";
import { uploadAvatar, isCloudinaryConfigured } from "../firebase/cloudinary";
import Avatar from "../components/Avatar";

export default function Profile() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [displayName, setDisplayName] = useState(profile?.displayName || user?.displayName || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadAvatar(file);
      setAvatarUrl(url);
    } catch (err) {
      if (err.message === "fichier-trop-lourd") setError("Image trop lourde (5 Mo max).");
      else if (err.message === "fichier-invalide") setError("Choisis un fichier image.");
      else setError("Envoi de l'image impossible. Réessaie.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!displayName.trim()) return setError("Le pseudo ne peut pas être vide.");
    setSaving(true);
    setError("");
    try {
      await updateUserProfile(user.uid, { displayName: displayName.trim(), avatarUrl });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setError("Impossible d'enregistrer le profil.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await signOutUser();
    navigate("/");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      <BackLink to="/" className="self-start" />
      <h1 className="text-2xl font-semibold text-stone-100">Ton profil</h1>

      <div className="flex flex-col items-center gap-3">
        <Avatar url={avatarUrl} name={displayName} size={88} />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {isCloudinaryConfigured ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-sm text-emerald-500 hover:underline disabled:opacity-50"
          >
            {uploading ? "Envoi en cours…" : "Changer l'avatar"}
          </button>
        ) : (
          <p className="text-xs text-stone-500 max-w-xs text-center">
            Avatar indisponible : configure Cloudinary dans .env
          </p>
        )}
      </div>

      <form onSubmit={handleSave} className="w-full max-w-xs flex flex-col gap-3">
        <div>
          <label className="text-xs text-stone-400">Pseudo</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={20}
            className="w-full mt-1 bg-stone-800 text-stone-100 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors"
        >
          {saved && <Check className="w-4 h-4" />}
          {saved ? "Enregistré" : "Enregistrer"}
        </button>
      </form>

      <button onClick={handleLogout} className="text-sm text-stone-500 hover:text-stone-300">
        Se déconnecter
      </button>
    </div>
  );
}

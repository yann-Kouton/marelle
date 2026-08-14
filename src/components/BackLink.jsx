import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackLink({ to = "/", children = "Retour", className = "" }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 text-stone-500 text-sm hover:text-stone-300 transition-colors ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {children}
    </Link>
  );
}

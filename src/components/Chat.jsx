import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";

export default function Chat({ messages, onSend, myUid }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <div className="flex flex-col h-72 bg-stone-900/60 border border-stone-700 rounded-xl overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-stone-500 text-center mt-4">
            Aucun message pour l'instant — dis bonjour 👋
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-end gap-2 ${m.uid === myUid ? "flex-row-reverse" : ""}`}
          >
            <Avatar url={m.avatarUrl} name={m.name} size={24} />
            <div
              className={`max-w-[70%] rounded-lg px-2.5 py-1.5 text-sm ${
                m.uid === myUid
                  ? "bg-emerald-700/70 text-emerald-50"
                  : "bg-stone-700/70 text-stone-100"
              }`}
            >
              {m.uid !== myUid && (
                <p className="text-[10px] font-medium text-stone-300 mb-0.5">{m.name}</p>
              )}
              <p className="break-words">{m.text}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 p-2 border-t border-stone-700">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écris un message…"
          maxLength={500}
          className="flex-1 bg-stone-800 text-stone-100 placeholder-stone-500 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <button
          type="submit"
          className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}

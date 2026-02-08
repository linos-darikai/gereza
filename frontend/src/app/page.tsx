'use client';

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  const [roomCode, setRoomCode] = useState("");

  useEffect(() => {
    setMounted(true);
    setRoomCode(generateRoomCode());
  }, []);

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Only generate if mounted to avoid hydration mismatch, or just generate in onClick
  // Better to just use a simple function call in the href or onClick

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-stone-900 via-stone-950 to-black p-4 text-stone-200 font-serif">
      <main className="flex w-full max-w-3xl flex-col items-center justify-center gap-12 text-center">
        {/* Title Section */}
        <div className="animate-fadeIn relative">
          <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 opacity-20 blur-xl"></div>
          <h1 className="relative text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-600 to-red-500 drop-shadow-sm">
            GEREZA
          </h1>
          <p className="mt-4 text-xl tracking-[0.2em] text-stone-500 uppercase font-sans">
            AI-Powered Prison Escape
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-6 w-full max-w-md animate-slideUp fade-in-0 slide-in-from-bottom-4 duration-1000">
          <Link
            href={`/join?mode=create&roomCode=${roomCode}`}
            className="group relative flex w-full items-center justify-center overflow-hidden rounded-sm border-2 border-amber-800 bg-stone-900/80 px-8 py-5 transition-all hover:border-amber-500 hover:bg-stone-800 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-900/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="relative z-10 text-2xl font-bold text-amber-100 tracking-wide font-mono group-hover:text-white transition-colors">
              CREATE ROOM
            </span>
          </Link>

          <Link
            href="/join?mode=join"
            className="group relative flex w-full items-center justify-center overflow-hidden rounded-sm border-2 border-stone-700 bg-black/40 px-8 py-4 transition-all hover:border-stone-500 hover:bg-stone-900"
          >
            <span className="text-lg font-bold text-stone-400 tracking-wide font-mono group-hover:text-stone-200 transition-colors">
              JOIN EXISTING ROOM
            </span>
          </Link>
        </div>

        {/* Footer/Credits */}
        <div className="mt-16 text-stone-700 text-sm font-sans flex gap-6">
          <span>MULTIPLAYER ALPHA</span>
          <span>•</span>
          <span>POWERED BY GEMINI</span>
        </div>
      </main>
    </div>
  );
}

'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLobby } from '../../hooks/useGameServer';

function JoinContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get('mode') || 'join'; // 'create' or 'join'
    const initialRoomCode = searchParams.get('roomCode') || '';

    const { lobbies, loading: lobbiesLoading, refresh: refreshLobbies } = useLobby();

    const [username, setUsername] = useState('');
    const [characterName, setCharacterName] = useState('');
    const [roomCode, setRoomCode] = useState(initialRoomCode);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const params = new URLSearchParams();
        params.set('username', username);
        params.set('characterName', characterName);

        if (mode === 'join') {
            params.set('roomCode', roomCode);
        } else {
            params.set('create', 'true');
            // If we have a pre-generated room code for create mode, pass it
            if (roomCode) {
                params.set('roomCode', roomCode);
            }
        }

        router.push(`/lobby?${params.toString()}`);
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-stone-900 via-stone-950 to-black p-4 text-stone-200 font-serif">
            <div className="w-full max-w-md bg-stone-900/80 border border-stone-700 p-8 rounded-sm shadow-2xl relative">
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-amber-500"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-amber-500"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-amber-500"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-amber-500"></div>

                <h1 className="text-3xl font-bold text-center mb-2 text-amber-500 tracking-wider">
                    {mode === 'create' ? 'CREATE A ROOM' : 'JOIN A ROOM'}
                </h1>
                {mode === 'create' && roomCode && (
                    <div className="text-center mb-6">
                        <span className="text-stone-500 text-xs uppercase tracking-widest mr-2">ROOM CODE:</span>
                        <span className="text-2xl text-white font-mono font-bold tracking-widest">{roomCode}</span>
                    </div>
                )}
                <p className="text-center text-stone-500 mb-8 font-sans text-sm uppercase tracking-widest">
                    Prepare for confinement
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6 font-mono">

                    {mode === 'join' && (
                        <div className="flex flex-col gap-2">
                            <label className="text-xs uppercase tracking-widest text-stone-400">Room Code</label>
                            <input
                                type="text"
                                required
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                placeholder="Ex. ABCD"
                                className="bg-black/50 border border-stone-700 p-3 text-lg tracking-widest text-white focus:border-amber-600 focus:outline-none transition-colors rounded-sm uppercase placeholder:text-stone-700"
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <label className="text-xs uppercase tracking-widest text-stone-400">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Your Name"
                            className="bg-black/50 border border-stone-700 p-3 text-stone-200 focus:border-amber-600 focus:outline-none transition-colors rounded-sm"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs uppercase tracking-widest text-stone-400">Character Name</label>
                        <input
                            type="text"
                            required
                            value={characterName}
                            onChange={(e) => setCharacterName(e.target.value)}
                            placeholder="Character Name"
                            className="bg-black/50 border border-stone-700 p-3 text-stone-200 focus:border-amber-600 focus:outline-none transition-colors rounded-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        className="mt-4 bg-amber-900/50 hover:bg-amber-800/80 text-amber-100 border border-amber-800/50 py-4 font-bold tracking-widest transition-all hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] rounded-sm"
                    >
                        ENTER LOBBY
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <Link href="/" className="text-stone-600 text-xs hover:text-stone-400 font-sans transition-colors">
                        ← BACK TO MENU
                    </Link>
                </div>
            </div>

            {/* Public Lobbies List - Only show in Join mode */}
            {mode === 'join' && (
                <div className="w-full max-w-md mt-8 bg-stone-900/50 border border-stone-800 p-6 rounded-sm">
                    <div className="flex justify-between items-center mb-4 border-b border-stone-800 pb-2">
                        <h2 className="text-stone-400 font-mono text-sm uppercase tracking-widest">Active Sectors</h2>
                        <button
                            onClick={refreshLobbies}
                            className="text-amber-700 hover:text-amber-500 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                                <path d="M16 16h5v5" />
                            </svg>
                        </button>
                    </div>

                    {lobbiesLoading ? (
                        <div className="text-center text-stone-600 py-4 font-mono text-xs animate-pulse">
                            Scanning available frequencies...
                        </div>
                    ) : lobbies.length === 0 ? (
                        <div className="text-center text-stone-600 py-4 font-mono text-xs">
                            No active sectors found.
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {lobbies.map((lobby) => (
                                <li key={lobby.id}>
                                    <button
                                        onClick={() => setRoomCode(lobby.room_code || '')}
                                        className="w-full text-left bg-black/40 hover:bg-amber-900/20 border border-stone-800 hover:border-amber-900/50 p-3 rounded-sm transition-all group"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-mono font-bold text-stone-300 group-hover:text-amber-200">
                                                {lobby.room_code}
                                            </span>
                                            <span className="text-xs text-stone-500 font-mono">
                                                {lobby.currentPlayers}/{lobby.max_players} Prisoners
                                            </span>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

export default function JoinPage() {
    return (
        <Suspense>
            <JoinContent />
        </Suspense>
    )
}

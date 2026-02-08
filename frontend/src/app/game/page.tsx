'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGame } from '../../hooks/useGameServer';

function GameContent() {
    const searchParams = useSearchParams();
    const roomId = searchParams.get('roomId');

    // We still fetch data to ensure we are connected/have session
    const { game, loading } = useGame(roomId || undefined);
    const [counter, setCounter] = useState(0);

    // Simple local counter for visual effect if no real game timer exists yet
    useEffect(() => {
        const interval = setInterval(() => {
            setCounter(c => c + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!roomId) {
        return <div className="min-h-screen flex items-center justify-center bg-black text-red-500 font-mono">ERROR: NO SIGNAL</div>;
    }

    if (loading && !game) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black text-amber-900 font-mono">
                <div className="animate-pulse">INITIALIZING...</div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-black text-white overflow-hidden relative">
            {/* Background ambiance */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-900/20 via-black to-black"></div>

            <div className="relative z-10 flex flex-col items-center">
                <div className="border border-stone-800 p-20 bg-stone-950/50 backdrop-blur-sm relative group">
                    {/* Decorative corners */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-900/50"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-900/50"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-900/50"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-900/50"></div>

                    <span className="text-9xl font-mono text-stone-200 tracker-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        {game?.id || '1'}
                    </span>

                    <div className="absolute -bottom-12 left-0 right-0 text-center">
                        <span className="text-xs font-mono text-stone-600 uppercase tracking-[0.5em]">
                            SECTOR {game?.room_code}
                        </span>
                    </div>
                </div>

                {/* Optional Status Line */}
                <div className="mt-24 font-mono text-xs text-stone-800">
                    STATUS: <span className="text-stone-600">{game?.status || 'UNKNOWN'}</span>
                    <span className="mx-4 text-stone-800">|</span>
                    TIME: <span className="text-amber-900">{counter}</span>
                </div>
            </div>
        </div>
    );
}

export default function GamePage() {
    return (
        <Suspense>
            <GameContent />
        </Suspense>
    )
}

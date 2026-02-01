'use client'

import { useState } from 'react'
import { useUiChat, exposeComponent } from '@hashbrownai/react'
import { s } from '@hashbrownai/core'

// ============================================================
// GEREZA COMPONENTS - Exposed to the LLM
// ============================================================

interface SceneCardProps {
    title: string
    description: string
    mood?: 'mysterious' | 'dangerous' | 'peaceful' | 'tense'
}

function SceneCard({ title, description, mood = 'mysterious' }: SceneCardProps) {
    const moodColors = {
        mysterious: 'from-purple-900/50 to-indigo-900/50 border-purple-500/30',
        dangerous: 'from-red-900/50 to-orange-900/50 border-red-500/30',
        peaceful: 'from-green-900/50 to-emerald-900/50 border-green-500/30',
        tense: 'from-yellow-900/50 to-amber-900/50 border-yellow-500/30'
    }

    return (
        <div className={`bg-gradient-to-br ${moodColors[mood]} border rounded-lg p-6 backdrop-blur-sm animate-fadeIn`}>
            <h3 className="text-2xl font-bold text-white mb-3 font-serif">{title}</h3>
            <p className="text-gray-200 leading-relaxed">{description}</p>
        </div>
    )
}

interface DiceRollProps {
    result: number
    sides: number
    purpose: string
    dc?: number
}

function DiceRoll({ result, sides, purpose, dc = 15 }: DiceRollProps) {
    const isSuccess = result >= dc

    return (
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 animate-rollIn">
            <div className="flex items-center gap-4">
                <div className={`text-4xl font-bold ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
                    {result}
                </div>
                <div className="flex-1">
                    <div className="text-sm text-gray-400">{purpose}</div>
                    <div className="text-white">
                        d{sides} vs DC {dc}
                    </div>
                    <div className={`text-sm font-semibold ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
                        {isSuccess ? '✓ Success!' : '✗ Failed'}
                    </div>
                </div>
            </div>
        </div>
    )
}

interface ActionButtonProps {
    label: string
    description?: string
    variant?: 'primary' | 'secondary' | 'danger'
}

function ActionButton({ label, description, variant = 'primary' }: ActionButtonProps) {
    const variantStyles = {
        primary: 'bg-red-600 hover:bg-red-700 border-red-500',
        secondary: 'bg-gray-700 hover:bg-gray-600 border-gray-500',
        danger: 'bg-orange-600 hover:bg-orange-700 border-orange-500'
    }

    return (
        <div className={`${variantStyles[variant]} border rounded-lg p-4 w-full text-left`}>
            <div className="text-white font-semibold text-lg">{label}</div>
            {description && <div className="text-gray-300 text-sm mt-1">{description}</div>}
        </div>
    )
}

interface CharacterStatusProps {
    name: string
    hp: number
    maxHp: number
    status?: string
}

function CharacterStatus({ name, hp, maxHp, status }: CharacterStatusProps) {
    const hpPercentage = (hp / maxHp) * 100
    const hpColor = hpPercentage > 50 ? 'bg-green-500' : hpPercentage > 25 ? 'bg-yellow-500' : 'bg-red-500'

    return (
        <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-white font-bold">{name}</h4>
                {status && <span className="text-sm text-gray-400 italic">{status}</span>}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div className={`${hpColor} h-full transition-all duration-500`} style={{ width: `${hpPercentage}%` }} />
            </div>
            <div className="text-sm text-gray-300 mt-1">HP: {hp}/{maxHp}</div>
        </div>
    )
}

interface InventoryItemProps {
    name: string
    description: string
    icon?: string
}

function InventoryItem({ name, description, icon = '📦' }: InventoryItemProps) {
    return (
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3">
            <div className="flex items-start gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                    <div className="text-white font-medium">{name}</div>
                    <div className="text-gray-400 text-sm">{description}</div>
                </div>
            </div>
        </div>
    )
}

// ============================================================
// EXPOSED COMPONENTS FOR LLM
// ============================================================

const exposedSceneCard = exposeComponent(SceneCard, {
    name: 'SceneCard',
    description: 'Display a scene in the adventure with a title, description, and mood. Use this to describe locations, events, and situations.',
    props: {
        title: s.string('Title of the scene'),
        description: s.streaming.string('Vivid description of what is happening'),
        mood: s.enumeration('The mood/atmosphere of the scene', ['mysterious', 'dangerous', 'peaceful', 'tense'] as const)
    }
})

const exposedDiceRoll = exposeComponent(DiceRoll, {
    name: 'DiceRoll',
    description: 'Show a dice roll result. Use when the player attempts an action that requires a skill check.',
    props: {
        result: s.number('The result of the d20 roll (1-20)'),
        sides: s.number('Number of sides on the die, usually 20'),
        purpose: s.string('What the roll was for, e.g. "Stealth check" or "Attack roll"'),
        dc: s.number('The difficulty class to beat, usually 10-18')
    }
})

const exposedActionButton = exposeComponent(ActionButton, {
    name: 'ActionButton',
    description: 'A choice button the player can consider. Display 2-4 of these after each scene.',
    props: {
        label: s.string('Short action text like "Search the room" or "Attack the guard"'),
        description: s.string('Brief description of what this action might lead to'),
        variant: s.enumeration('primary for main actions, secondary for careful options, danger for risky ones', ['primary', 'secondary', 'danger'] as const)
    }
})

const exposedCharacterStatus = exposeComponent(CharacterStatus, {
    name: 'CharacterStatus',
    description: 'Show the player character health and status. Use after combat or when health changes.',
    props: {
        name: s.string('Character name'),
        hp: s.number('Current hit points'),
        maxHp: s.number('Maximum hit points'),
        status: s.string('Status effect like "Wounded" or "Poisoned"')
    }
})

const exposedInventoryItem = exposeComponent(InventoryItem, {
    name: 'InventoryItem',
    description: 'Display an item the player has found or owns.',
    props: {
        name: s.string('Item name'),
        description: s.string('Brief description of the item'),
        icon: s.string('An emoji icon for the item like 🗡️ or 🔑')
    }
})

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function GerezaHashbrownPage() {
    const [inputValue, setInputValue] = useState('')

    const {
        messages,
        sendMessage,
        isLoading,
        lastAssistantMessage
    } = useUiChat({
        model: 'gemini-3-flash-preview',
        system: `You are the dungeon master for GEREZA, a dark prison escape adventure game.

SETTING:
- The player is trapped in a mysterious medieval prison called "Gereza"
- Strange magic permeates the walls, prisoners whisper of a hidden escape route
- Guards are ruthless but can be outsmarted
- The deeper levels hold darker secrets

YOUR RESPONSIBILITIES:
1. Create immersive scenes using the SceneCard component
2. Present 2-4 choices using ActionButton components after each scene
3. When players attempt risky actions, show DiceRoll results (roll d20, DC 10-18)
4. Track player health with CharacterStatus when it changes
5. Show items found with InventoryItem component

GAME RULES:
- Player starts with 20 HP
- Failed dangerous rolls may cause 1-5 damage
- Success on skill checks opens new paths
- Combat is resolved with attack rolls vs guard DC

STYLE:
- Dark, atmospheric, tense
- Short punchy descriptions
- Give the player agency
- React to their choices meaningfully

START: When the player begins, describe waking up in a cold stone cell. Show the scene and 2-3 initial choices.`,
        components: [
            exposedSceneCard,
            exposedDiceRoll,
            exposedActionButton,
            exposedCharacterStatus,
            exposedInventoryItem
        ]
    })

    const handleSend = (text: string) => {
        if (!text.trim() || isLoading) return
        sendMessage({ role: 'user', content: text })
        setInputValue('')
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-900/20 to-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-white mb-2 font-serif">⚔️ Gereza</h1>
                    <p className="text-gray-300">AI-Powered Prison Adventure</p>
                    <p className="text-xs text-gray-500 mt-1">Powered by Hashbrown + Google Gemini</p>
                </div>

                {/* Messages / UI */}
                <div className="space-y-4 mb-6">
                    {messages.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-400 mb-4">You awaken in darkness...</p>
                            <button
                                onClick={() => handleSend('I wake up and look around')}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all hover:scale-105"
                            >
                                🔒 Begin Your Escape
                            </button>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className="animate-fadeIn">
                            {msg.role === 'user' && (
                                <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 ml-auto max-w-md text-right">
                                    <p className="text-gray-200">{msg.content}</p>
                                </div>
                            )}
                            {msg.role === 'assistant' && 'ui' in msg && msg.ui && (
                                <div className="space-y-3">{msg.ui}</div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Input */}
                <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                    <input
                        type="text"
                        placeholder="What do you do?"
                        className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-red-500"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSend(inputValue)
                        }}
                        disabled={isLoading}
                    />
                </div>

                {isLoading && (
                    <div className="text-center mt-4">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                        <p className="text-gray-400 mt-2">The shadows stir...</p>
                    </div>
                )}
            </div>
        </div>
    )
}

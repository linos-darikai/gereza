'use client'

import { useState } from 'react'
import {
    SceneCard,
    DiceRoll,
    ActionButton,
    InventoryItem,
    CharacterStatus
} from '@/components/GerezaComponents'

// Type for game scenes
type GameScene = {
    id: string
    title: string
    description: string
    mood: 'mysterious' | 'dangerous' | 'peaceful' | 'tense'
    actions: Action[]
    diceRoll?: {
        result: number
        sides: number
        purpose: string
    }
}

type Action = {
    label: string
    description: string
    nextSceneId: string
    variant?: 'primary' | 'secondary' | 'danger'
    requiresDiceRoll?: boolean
    dc?: number
    onSuccess?: string
    onFailure?: string
}

// Predefined D&D adventure scenes
const scenes: Record<string, GameScene> = {
    entrance: {
        id: 'entrance',
        title: 'The Forgotten Dungeon',
        description: 'You stand before the crumbling entrance of an ancient dungeon. Moss-covered stones form an archway, beyond which darkness beckons. A faint, eerie glow pulses from somewhere deep within. The air smells of damp earth and forgotten secrets.',
        mood: 'mysterious',
        actions: [
            {
                label: 'Enter the Dungeon',
                description: 'Step through the ancient archway into the unknown',
                nextSceneId: 'hallway'
            },
            {
                label: 'Search the Entrance',
                description: 'Look around for clues or hidden items',
                nextSceneId: 'searchEntrance',
                requiresDiceRoll: true,
                dc: 12
            }
        ]
    },
    searchEntrance: {
        id: 'searchEntrance',
        title: 'A Fortunate Discovery',
        description: 'Your keen eyes catch a glint beneath some rubble. You uncover an old lantern, still containing oil! This will help light your way.',
        mood: 'peaceful',
        actions: [
            {
                label: 'Take the Lantern and Enter',
                description: 'Equip the lantern and proceed into the dungeon',
                nextSceneId: 'hallway'
            }
        ]
    },
    hallway: {
        id: 'hallway',
        title: 'The Dark Hallway',
        description: 'The corridor stretches before you, lined with ancient tapestries depicting battles long forgotten. Two passages branch ahead: one to the left echoes with dripping water, while the right passage glows with a faint green light.',
        mood: 'mysterious',
        actions: [
            {
                label: 'Go Left (Water Sounds)',
                description: 'Follow the sound of dripping water',
                nextSceneId: 'waterChamber'
            },
            {
                label: 'Go Right (Green Glow)',
                description: 'Investigate the eerie green light',
                nextSceneId: 'treasureRoom',
                variant: 'primary'
            },
            {
                label: 'Examine the Tapestries',
                description: 'Study the ancient artwork for clues',
                nextSceneId: 'tapestryClues',
                variant: 'secondary'
            }
        ]
    },
    waterChamber: {
        id: 'waterChamber',
        title: 'The Flooded Chamber',
        description: 'You enter a large chamber ankle-deep in cold water. In the center, a stone pedestal rises from the pool, holding an ornate silver chalice. The water ripples—something is moving beneath the surface...',
        mood: 'tense',
        actions: [
            {
                label: 'Wade Carefully to the Chalice',
                description: 'Attempt to retrieve the chalice',
                nextSceneId: 'goblinAmbush',
                requiresDiceRoll: true,
                dc: 15
            },
            {
                label: 'Leave This Room',
                description: 'Retreat back to the hallway',
                nextSceneId: 'hallway',
                variant: 'secondary'
            }
        ]
    },
    treasureRoom: {
        id: 'treasureRoom',
        title: 'The Enchanted Treasury',
        description: 'The green glow emanates from crystals embedded in the walls. Before you lies a small chest, unsealed and inviting. Gold coins glitter within, along with a shimmering blue potion.',
        mood: 'mysterious',
        actions: [
            {
                label: 'Take the Treasure',
                description: 'Grab the gold and the blue potion',
                nextSceneId: 'victory'
            },
            {
                label: 'Check for Traps',
                description: 'Carefully inspect the chest and room',
                nextSceneId: 'trapFound',
                requiresDiceRoll: true,
                dc: 13,
                variant: 'secondary'
            }
        ]
    },
    trapFound: {
        id: 'trapFound',
        title: 'A Clever Adventurer',
        description: 'You notice thin wires connected to the chest! This would have triggered a poison dart trap. You carefully disarm it and safely collect 50 gold pieces and a Potion of Healing.',
        mood: 'peaceful',
        actions: [
            {
                label: 'Continue Exploring',
                description: 'Press deeper into the dungeon',
                nextSceneId: 'victory'
            }
        ]
    },
    goblinAmbush: {
        id: 'goblinAmbush',
        title: 'Goblin Ambush!',
        description: 'As you reach for the chalice, three goblins burst from the shadows! Their crude weapons glint in the dim light. You must fight!',
        mood: 'dangerous',
        actions: [
            {
                label: 'Attack with Sword',
                description: 'Strike at the nearest goblin',
                nextSceneId: 'combatWin',
                requiresDiceRoll: true,
                dc: 14,
                variant: 'danger'
            },
            {
                label: 'Try to Flee',
                description: 'Run back to the hallway',
                nextSceneId: 'hallway',
                variant: 'secondary'
            }
        ]
    },
    combatWin: {
        id: 'combatWin',
        title: 'Victory!',
        description: 'Your blade finds its mark! The goblins scatter and flee into the darkness. You claim the silver chalice—a valuable prize!',
        mood: 'peaceful',
        actions: [
            {
                label: 'Return to Explore More',
                description: 'Head back to the main hallway',
                nextSceneId: 'hallway'
            },
            {
                label: 'Exit the Dungeon',
                description: 'Leave while you\'re ahead',
                nextSceneId: 'victory'
            }
        ]
    },
    tapestryClues: {
        id: 'tapestryClues',
        title: 'Ancient Warnings',
        description: 'Studying the tapestries, you decipher ancient runes warning of "dangers in the waters" and "safe treasures in the light." This knowledge may prove useful...',
        mood: 'peaceful',
        actions: [
            {
                label: 'Continue Exploring',
                description: 'Armed with this knowledge, choose your path',
                nextSceneId: 'hallway'
            }
        ]
    },
    victory: {
        id: 'victory',
        title: 'Adventure Complete!',
        description: 'You emerge from the dungeon victorious, your pack heavier with treasure and your experience with adventure. The legends will remember this day!',
        mood: 'peaceful',
        actions: [
            {
                label: 'Start New Adventure',
                description: 'Begin again from the entrance',
                nextSceneId: 'entrance'
            }
        ]
    }
}

export default function GerezaStoryPage() {
    const [currentSceneId, setCurrentSceneId] = useState('entrance')
    const [gameState, setGameState] = useState({
        playerHp: 20,
        playerMaxHp: 20,
        inventory: ['Rusty Sword', 'Torch'],
        gold: 0
    })
    const [lastRoll, setLastRoll] = useState<{ result: number; sides: number; purpose: string } | null>(null)

    const currentScene = scenes[currentSceneId]

    const rollDice = (sides: number) => {
        return Math.floor(Math.random() * sides) + 1
    }

    const handleAction = (action: Action) => {
        if (action.requiresDiceRoll && action.dc) {
            const roll = rollDice(20)
            setLastRoll({ result: roll, sides: 20, purpose: action.description })

            // Success or failure based on DC
            if (roll >= action.dc) {
                // Success
                if (action.nextSceneId === 'searchEntrance') {
                    setGameState(prev => ({
                        ...prev,
                        inventory: [...prev.inventory, 'Lantern']
                    }))
                } else if (action.nextSceneId === 'trapFound') {
                    setGameState(prev => ({
                        ...prev,
                        inventory: [...prev.inventory, 'Potion of Healing'],
                        gold: prev.gold + 50
                    }))
                } else if (action.nextSceneId === 'combatWin') {
                    setGameState(prev => ({
                        ...prev,
                        inventory: [...prev.inventory, 'Silver Chalice'],
                        playerHp: Math.max(1, prev.playerHp - 3) // Take some damage in combat
                    }))
                }
                setCurrentSceneId(action.nextSceneId)
            } else {
                // Failure - slight different outcome
                if (action.nextSceneId === 'goblinAmbush') {
                    setGameState(prev => ({
                        ...prev,
                        playerHp: Math.max(1, prev.playerHp - 5) // Take damage from failed combat
                    }))
                    setCurrentSceneId('hallway') // Flee back to hallway
                } else {
                    setCurrentSceneId(action.nextSceneId) // Still proceed but without bonuses
                }
            }
        } else {
            // No roll required, just proceed
            setLastRoll(null)

            // Handle treasure room
            if (action.nextSceneId === 'victory' && currentSceneId === 'treasure Room') {
                setGameState(prev => ({
                    ...prev,
                    inventory: [...prev.inventory, 'Potion of Healing'],
                    gold: prev.gold + 30
                }))
            }

            setCurrentSceneId(action.nextSceneId)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-white mb-2 font-serif">
                        ⚔️ Gereza
                    </h1>
                    <p className="text-gray-300">Interactive Story Adventure</p>
                </div>

                {/* Player Status */}
                <div className="mb-6">
                    <CharacterStatus
                        name="Your Character"
                        hp={gameState.playerHp}
                        maxHp={gameState.playerMaxHp}
                        status={gameState.playerHp < 10 ? 'Wounded' : undefined}
                    />
                </div>

                {/* Inventory & Gold */}
                {gameState.inventory.length > 0 && (
                    <div className="mb-6 bg-gray-800/30 border border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-white font-bold">🎒 Inventory</h3>
                            <div className="text-yellow-400 font-bold">💰 {gameState.gold} Gold</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {gameState.inventory.map((item, idx) => (
                                <div key={idx} className="text-gray-300 text-sm">• {item}</div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Current Scene */}
                <div className="mb-6">
                    <SceneCard
                        title={currentScene.title}
                        description={currentScene.description}
                        mood={currentScene.mood}
                    />
                </div>

                {/* Last Dice Roll */}
                {lastRoll && (
                    <div className="mb-6">
                        <DiceRoll {...lastRoll} />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                    {currentScene.actions.map((action, idx) => (
                        <ActionButton
                            key={idx}
                            label={action.label}
                            description={action.description}
                            onClick={() => handleAction(action)}
                            variant={action.variant || 'primary'}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-gray-500 text-sm">
                    <p>Press action buttons to progress the story</p>
                    {currentScene.actions.some(a => a.requiresDiceRoll) && (
                        <p className="mt-1">⚔️ Some actions require dice rolls (DC checks)</p>
                    )}
                </div>
            </div>
        </div>
    )
}

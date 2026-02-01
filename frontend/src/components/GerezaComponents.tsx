'use client'

import { useState } from 'react'

interface SceneCardProps {
  title: string
  description: string
  imageUrl?: string
  mood?: 'mysterious' | 'dangerous' | 'peaceful' | 'tense'
}

export function SceneCard({ title, description, imageUrl, mood = 'mysterious' }: SceneCardProps) {
  const moodColors = {
    mysterious: 'from-purple-900/50 to-indigo-900/50 border-purple-500/30',
    dangerous: 'from-red-900/50 to-orange-900/50 border-red-500/30',
    peaceful: 'from-green-900/50 to-emerald-900/50 border-green-500/30',
    tense: 'from-yellow-900/50 to-amber-900/50 border-yellow-500/30'
  }

  return (
    <div
      className={`bg-gradient-to-br ${moodColors[mood]} border rounded-lg p-6 backdrop-blur-sm animate-fadeIn`}
    >
      {imageUrl && (
        <div className="mb-4 rounded-lg overflow-hidden">
          <img src={imageUrl} alt={title} className="w-full h-48 object-cover" />
        </div>
      )}
      <h3 className="text-2xl font-bold text-white mb-3 font-serif">{title}</h3>
      <p className="text-gray-200 leading-relaxed">{description}</p>
    </div>
  )
}

interface DiceRollProps {
  result: number
  sides: number
  modifier?: number
  purpose: string
}

export function DiceRoll({ result, sides, modifier = 0, purpose }: DiceRollProps) {
  const total = result + modifier
  const isSuccess = total >= 15 // DC 15 for demo purposes

  return (
    <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 animate-rollIn">
      <div className="flex items-center gap-4">
        <div className={`text-4xl font-bold ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
          {result}
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-400">{purpose}</div>
          <div className="text-white">
            d{sides} roll: {result} {modifier !== 0 && `+ ${modifier}`} = <strong>{total}</strong>
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
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
}

export function ActionButton({ label, description, onClick, variant = 'primary' }: ActionButtonProps) {
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 border-blue-500',
    secondary: 'bg-gray-700 hover:bg-gray-600 border-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 border-red-500'
  }

  return (
    <button
      onClick={onClick}
      className={`${variantStyles[variant]} border rounded-lg p-4 w-full text-left transition-all hover:scale-105 hover:shadow-lg`}
    >
      <div className="text-white font-semibold text-lg">{label}</div>
      {description && <div className="text-gray-300 text-sm mt-1">{description}</div>}
    </button>
  )
}

interface InventoryItemProps {
  name: string
  description: string
  icon?: string
}

export function InventoryItem({ name, description, icon = '🎒' }: InventoryItemProps) {
  return (
    <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3 hover:bg-gray-700/50 transition-colors">
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

interface CharacterStatusProps {
  name: string
  hp: number
  maxHp: number
  status?: string
}

export function CharacterStatus({ name, hp, maxHp, status }: CharacterStatusProps) {
  const hpPercentage = (hp / maxHp) * 100
  const hpColor = hpPercentage > 50 ? 'bg-green-500' : hpPercentage > 25 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-white font-bold">{name}</h4>
        {status && <span className="text-sm text-gray-400 italic">{status}</span>}
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={`${hpColor} h-full transition-all duration-500`}
          style={{ width: `${hpPercentage}%` }}
        />
      </div>
      <div className="text-sm text-gray-300 mt-1">
        HP: {hp}/{maxHp}
      </div>
    </div>
  )
}

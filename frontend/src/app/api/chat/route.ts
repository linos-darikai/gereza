import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json()

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages,
            temperature: 0.8,
            max_tokens: 1000
        })

        return NextResponse.json(completion)
    } catch (error: any) {
        console.error('OpenAI API Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate response' },
            { status: 500 }
        )
    }
}

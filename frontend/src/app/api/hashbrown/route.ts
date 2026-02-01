import { HashbrownGoogle } from '@hashbrownai/google'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
    let body: any

    try {
        body = await req.json()

        console.log('=== Hashbrown API Request (Gemini) ===')
        console.log('Operation:', body.operation)
        console.log('Model:', body.model)
        console.log('System Prompt:', body.system?.substring(0, 100) + '...')
        console.log('Messages count:', body.messages?.length)
        console.log('Tools count:', body.tools?.length)

        if (!body.system) {
            console.error('ERROR: No system prompt in request!')
            return NextResponse.json({ error: 'Missing system prompt' }, { status: 400 })
        }

        if (!process.env.GEMINI_KEY) {
            console.error('ERROR: No GEMINI_KEY environment variable!')
            return NextResponse.json({ error: 'Missing Gemini API key' }, { status: 500 })
        }

        // Use Hashbrown's Google adapter for Gemini streaming
        const stream = HashbrownGoogle.stream.text({
            apiKey: process.env.GEMINI_KEY,
            request: body
        })

        // Collect all chunks for debugging
        const chunks: Uint8Array[] = []

        // Create a readable stream for Next.js App Router
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        chunks.push(chunk)
                        controller.enqueue(chunk)
                    }

                    // Debug: log the full response
                    const fullResponse = Buffer.concat(chunks).toString('utf-8')
                    console.log('=== Gemini Response Preview ===')
                    console.log(fullResponse.substring(0, 500))
                    if (fullResponse.length > 500) {
                        console.log(`... (${fullResponse.length} total characters)`)
                    }
                } catch (streamError: any) {
                    console.error('Hashbrown Stream Error:', streamError?.message || streamError)
                    console.error('Stream Error Details:', streamError)
                } finally {
                    try {
                        controller.close()
                    } catch (closeError) {
                        // Controller might already be closed
                    }
                    console.log('=== Gemini Stream completed ===')
                }
            }
        })

        return new NextResponse(readableStream, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        })
    } catch (error: any) {
        console.error('=== Hashbrown API Error ===')
        console.error('Error message:', error?.message || error)
        console.error('Error stack:', error?.stack)
        return NextResponse.json(
            { error: error?.message || 'Failed to generate response' },
            { status: 500 }
        )
    }
}

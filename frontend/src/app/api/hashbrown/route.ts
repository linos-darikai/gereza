import { HashbrownGoogle } from '@hashbrownai/google'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Robust retry helper that handles both connection errors AND empty streams
async function retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            console.warn(`[API] Attempt ${i + 1} failed: ${error.message || error}`);

            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i); // Exponential backoff
                console.log(`[API] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

export async function POST(req: NextRequest) {
    console.log('[API] POST /api/hashbrown received');
    let body: any

    try {
        body = await req.json()

        if (!body.system) {
            return NextResponse.json({ error: 'Missing system prompt' }, { status: 400 })
        }

        if (!process.env.GEMINI_KEY) {
            console.error('[API] ERROR: No GEMINI_KEY environment variable!')
            return NextResponse.json({ error: 'Missing Gemini API key' }, { status: 500 })
        }

        // Use Hashbrown's Google adapter for Gemini streaming
        console.log('[API] initializing Gemini stream...');

        // Wrap stream creation in retry logic
        const reliableStream = await retryOperation(async () => {
            const stream = HashbrownGoogle.stream.text({
                apiKey: process.env.GEMINI_KEY!,
                request: body
            })

            // CRITICAL: Peek at the first chunk to ensure the stream is alive and not empty.
            // Many "silent failures" are actually 200 OK responses with empty bodies.
            const iterator = stream[Symbol.asyncIterator]();
            let firstResult;
            try {
                firstResult = await iterator.next();
            } catch (err) {
                console.warn('[API] Stream initialization failed (network error?):', err);
                throw err;
            }

            if (firstResult.done) {
                // Throwing here triggers the retry loop!
                throw new Error("Received empty response from AI services");
            }

            // Return a new async iterable that stitches the first chunk back onto the stream
            return {
                async *[Symbol.asyncIterator]() {
                    yield firstResult.value;
                    while (true) {
                        const { value, done } = await iterator.next();
                        if (done) break;
                        yield value;
                    }
                }
            };
        }, 3, 1000);

        console.log('[API] Gemini stream initialized and verified successfully');

        // Create a readable stream for Next.js App Router
        const readableStream = new ReadableStream({
            async start(controller) {
                console.log('[API] Starting response stream to client');
                try {
                    for await (const chunk of reliableStream) {
                        try {
                            controller.enqueue(chunk)
                        } catch (err) {
                            console.warn('[API] Client disconnected during stream');
                            return
                        }
                    }
                    console.log('[API] Stream completed successfully');
                } catch (streamError: any) {
                    console.error('[API] Stream Broken:', streamError?.message || streamError)
                    try {
                        controller.error(streamError)
                    } catch (e) {
                        // ignore
                    }
                } finally {
                    try {
                        controller.close()
                    } catch (closeError) {
                        // ignore
                    }
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
        console.error('=== Hashbrown API Critical Failure ===')
        console.error('Error message:', error?.message || error)

        return NextResponse.json(
            { error: error?.message || 'Failed to generate response. The AI service is currently unavailable.' },
            { status: 503 }
        )
    }
}

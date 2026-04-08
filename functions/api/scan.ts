interface Env {
  ANTHROPIC_API_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (!env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('receipt') as File | null

    if (!file) {
      return Response.json({ error: 'No receipt image provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    const mediaType = file.type || 'image/jpeg'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: `Extract all line items from this receipt. Return ONLY valid JSON with this exact structure, no other text:
{
  "items": [
    {"name": "Item name", "price": 1.99}
  ],
  "tax": 0.00,
  "tip": 0.00,
  "total": 0.00
}

Rules:
- Include every purchasable item with its price
- If tax is shown, include it in "tax"
- If tip/gratuity is shown, include it in "tip"
- If a total is shown, include it in "total"
- Prices should be numbers, not strings
- If you can't read a price, use 0 and include the item
- Do not include subtotal as an item`
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return Response.json({ error: 'AI service error', details: err }, { status: 502 })
    }

    const result = await response.json() as any
    const text = result.content?.[0]?.text || ''

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ error: 'Could not parse receipt', raw: text }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return Response.json(parsed)
  } catch (err: any) {
    return Response.json({ error: 'Failed to process receipt', details: err.message }, { status: 500 })
  }
}

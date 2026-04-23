import axios from 'axios'

export type AiVerifyResult = {
  isValid: boolean
  reason: string
  extracted?: Record<string, unknown>
}

export async function verifyQrWithAi(input: { userId: string; eventId: string; qrData: string }): Promise<AiVerifyResult> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return {
      isValid: true,
      reason: 'OPENAI_API_KEY not set, using mock verification',
      extracted: {
        qrData: input.qrData
      }
    }
  }

  const prompt = `You are a QR attendance verifier. Validate the QR payload for a volunteer attendance check-in.\n\nReturn strict JSON with keys: isValid (boolean), reason (string), extracted (object).\n\nInput:\nuserId=${input.userId}\neventId=${input.eventId}\nqrData=${input.qrData}`

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Return only JSON. No markdown.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      timeout: 15000
    }
  )

  const text = res.data?.choices?.[0]?.message?.content
  if (typeof text !== 'string') {
    return { isValid: false, reason: 'AI returned empty response' }
  }

  try {
    const parsed = JSON.parse(text)
    return {
      isValid: Boolean(parsed.isValid),
      reason: String(parsed.reason ?? ''),
      extracted: typeof parsed.extracted === 'object' ? parsed.extracted : undefined
    }
  } catch {
    return { isValid: false, reason: 'Failed to parse AI JSON response', extracted: { raw: text } }
  }
}

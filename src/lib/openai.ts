import OpenAI from 'openai'

export function getOpenAIClient(apiKey?: string | null): OpenAI | null {
  const key = apiKey || process.env.OPENAI_API_KEY
  if (!key) return null
  return new OpenAI({ apiKey: key })
}

export async function generateMentalImageAndFlashcard(
  noteContent: string,
  promptTemplate: string,
  apiKey?: string | null
): Promise<{ mentalImage: string; flashcard: string } | null> {
  const client = getOpenAIClient(apiKey)
  if (!client) return null

  const defaultPrompt = `Redacta una DESCRIPCIÓN VISUAL ESCRITA en texto (una escena mnemotécnica detallada, explicativa y fácil de imaginar) que represente el concepto de la nota. 
IMPORTANTE: No generes imágenes ni archivos gráficos, solo escribe la explicación textual y descriptiva de la escena mental (qué objetos hay, qué ocurre y cómo cada elemento simboliza el concepto para recordarlo). Genera también una pregunta tipo flashcard.

Responde en el mismo idioma de la nota con el siguiente formato exacto:
IMAGEN_MENTAL: [Descripción escrita detallada y explicativa de la escena mental mnemotécnica]
FLASHCARD: [Pregunta directa de repaso]`

  const prompt = `${promptTemplate || defaultPrompt}\n\nNOTA:\n${noteContent}`

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en mnemotecnia y palacios de la memoria. Redactas descripciones escritas en texto de escenas visuales memorables para facilitar la retención. Tus respuestas son explicativas, totalmente en texto y enfocadas en la memoria.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 600,
      temperature: 0.8,
    })

    const text = completion.choices[0]?.message?.content || ''

    const mentalImageMatch = text.match(/IMAGEN_MENTAL:\s*([\s\S]*?)(?=FLASHCARD:|$)/)
    const flashcardMatch = text.match(/FLASHCARD:\s*([\s\S]*)$/)

    const mentalImage = mentalImageMatch?.[1]?.trim() || text.trim()
    const flashcard = flashcardMatch?.[1]?.trim() || '¿Cuál es el concepto principal de esta nota?'

    return { mentalImage, flashcard }
  } catch (error) {
    console.error('OpenAI error:', error)
    return null
  }
}

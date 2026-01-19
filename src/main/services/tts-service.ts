import OpenAI from 'openai';

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export async function generateSpeech(
  apiKey: string,
  text: string,
  voice: string = 'nova',
  speed: number = 1.0
): Promise<ArrayBuffer> {
  const openai = new OpenAI({ apiKey });

  // Validate text
  if (!text || typeof text !== 'string') {
    throw new Error('Text is required');
  }

  if (text.length > 4096) {
    throw new Error('Text too long. Maximum 4096 characters.');
  }

  // Validate voice
  const validVoices: TTSVoice[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  const selectedVoice = validVoices.includes(voice as TTSVoice) ? (voice as TTSVoice) : 'nova';

  // Validate speed
  const validSpeed = Math.max(0.25, Math.min(4.0, speed));

  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: selectedVoice,
    input: text,
    speed: validSpeed,
  });

  return response.arrayBuffer();
}

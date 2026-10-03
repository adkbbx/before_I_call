// Remove delivery directions from provider text, preserving literal bracketed content.
export function spokenText(text: string): string {
  return text.replace(/\[(?:slow|slower|slowly|fast|faster|happy|sad|excited|calm|angry|nervous|curious|cheerful|serious|gentle|whisper|whispers|whispering|shout|shouts|shouting|laugh|laughs|laughing|chuckles|sigh|sighs|sighing|pause|short pause|long pause|breath|breathes|inhales|exhales|crying|sarcastic|thoughtful|reassuring)\]\s*/gi, '').trim();
}

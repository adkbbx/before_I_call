// Remove delivery directions from provider text, preserving literal bracketed content.
export function hasEndCallRequest(text: string): boolean {
  return /\bend_call\s*\(\s*(?:reason|system__message_to_speak)\s*=[\s\S]*\)\s*[.!]?\s*$/i.test(text);
}

export function spokenText(text: string): string {
  const dialogue = text.replace(/(?:\bcall\s+)?\bend_call\s*\(\s*(?:reason|system__message_to_speak)\s*=[\s\S]*$/i, '');
  return dialogue.replace(/\[(?:slow|slower|slowly|fast|faster|happy|sad|excited|calm|angry|nervous|curious|cheerful|serious|gentle|whisper|whispers|whispering|shout|shouts|shouting|laugh|laughs|laughing|chuckles|sigh|sighs|sighing|pause|short pause|long pause|breath|breathes|inhales|exhales|crying|sarcastic|thoughtful|reassuring)\]\s*/gi, '').trim();
}

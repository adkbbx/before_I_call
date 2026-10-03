# Before I Call design

Friendly, unhurried conversation practice for residents of Japan. The interface should feel like a calm room to rehearse in: nothing scores you, nothing rushes you, and help is always one tap away without ending the call.

## Type and colour

- **Type:** Schibsted Grotesk 400/500/600 for English and Zen Kaku Gothic New 400/500 for Japanese, self-hosted through Fontsource. The PDF call card bundles the same faces from `server/fonts` (OFL).
- **Colour:** a forest-green accent (`#315b49`) on warm neutral surfaces, with a soft green tint for prepared answers and the call card. Dark mode switches to a mint accent (`#a1ccb1`) on deep green-black surfaces. Ending a call is the one red control (`#b42332`).
- **Tokens:** CSS custom properties in `src/styles.css` own both themes. The app follows the system theme by default; the header button switches between light and dark and remembers the choice. A small inline script in `index.html` applies a saved choice before first paint.

## Layout

- Controls have a minimum 44px target; primary actions are 52px.
- At 767px and below, home, setup and the call collapse to one column, and the call controls become a four-across grid.
- The call screen has a narrow rail with the situation and progress, and a wide workspace with the current sentence centred above its audio controls. The current sentence stays anchored while help opens.
- Demo questions and answers reserve the height of the longest turn, so the controls do not jump between turns.
- Reduced motion disables the waveform and entry animations.

## Japanese reading support

Japanese uses native ruby furigana with contextual readings. Underlined words reveal an English meaning on hover, focus or tap; Escape and blur dismiss it. Meaning popups anchor above the word, flip below when needed, and stay inside narrow viewports. Romaji appears below Japanese sentences. Scripted readings are curated; live readings are generated on the server with pykakasi and Janome without changing the original sentence, and the bundled lexicon is the fallback if that request fails.

## Flows

- **Home** leads with starting a real practice and offers three selectable guided examples per language, with the selected situation shown before playing.
- **Setup** has one situation field with **Choose an example** presets, an optional **Enhance prompt** with Undo, and an **Options** disclosure for practice language, explanation language and how audio is handled. Live availability is checked before asking for the microphone, and the guided demo stays one click away when live voice is unavailable.
- **Guided demo** plays the partner's question, then the learner's prepared reply, before **Continue**. End, pause and replay cancel any pending advance. Previous turns stay available with their audio.
- **Live call** shows elapsed and remaining time, a live microphone level, **Explain question**, **Slow replay**, **Repeat question**, a typed-answer field and a labelled red **End call** button. Explanations open in a modal dialog with a focus trap and return focus when closed.
- **Call card** pages through the conversation one turn at a time, or the useful words three at a time, with readings and meanings. After a live call, each partner reply can be reported. **Download call card** produces an A4 PDF in the same type and colours: the situation, each turn as a speech-shaped card with furigana over kanji, romaji and meaning, then a grid of useful words. If the PDF cannot be made, a plain-text card downloads instead.

## Audio

Guided demos use saved ElevenLabs speech: Multilingual v2 for most clips and Eleven v3 for one clip that v2 mispronounced. Each speaker has a distinct voice. See `public/audio/PROVENANCE.md`.

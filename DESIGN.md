# Before I Call design

The October 3 redesign follows the requested design-taste skill. Friendly conversation practice for English-speaking residents of Japan.

Schibsted Grotesk 400/500/600 for English and Zen Kaku Gothic New 400/500 for Japanese, self-hosted. Ink-blue actions on cool neutral surfaces. Speech-shaped corners distinguish spoken questions, prepared answers and explanations. No scores or streaks.

CSS semantic tokens in src/styles.css own light and system dark themes. Controls have a minimum 44px target; primary actions are 52px. At 767px the setup, home and call collapse to a single column. At wide widths explanations sit beside the conversation. Reduced motion disables waveform and entry animation.

Japanese uses native ruby with contextual readings. Underlined words reveal an English meaning on hover, focus or tap; Escape and blur dismiss it. Meaning popups anchor above the word, flip below when needed, and remain within narrow viewports. Romaji appears below Japanese sentences. Scripted readings are curated; live dictionary readings are generated locally without changing the original sentence. Known vocabulary is the fallback if that service fails.

The demo plays a prepared learner reply before advancing to the next partner turn. End, pause and retry cancel pending advancement. Live availability is checked before asking for microphone permission, with a working demo path when unavailable.

Live setup uses a responsive preset picker with editable details. Partner labels follow demo/live mode rather than naming every service a building manager.


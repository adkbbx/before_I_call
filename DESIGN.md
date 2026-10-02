# Before I Call design

The October 3 redesign follows the requested design-taste skill. Friendly conversation practice for English-speaking residents of Japan.

Outfit 500/600 for headings, DM Sans 400/500/600 for body, self-hosted. Ink-blue actions on cool neutral surfaces. Speech-shaped corners distinguish spoken questions, prepared answers and explanations. No scores or streaks.

CSS semantic tokens in src/styles.css own light and system dark themes. Controls have a minimum 44px target; primary actions are 52px. At 767px the setup, home and call collapse to a single column. At wide widths explanations sit beside the conversation. Reduced motion disables waveform and entry animation.

Japanese uses native ruby with contextual readings. Underlined words reveal an English meaning on hover, focus or tap; Escape and blur dismiss it. Tooltips stay within narrow viewports. Scripted readings are curated; live readings are generated separately and validated without changing the original sentence. Known vocabulary is the fallback if that service fails.

The demo plays a prepared learner reply before advancing to the next partner turn. End, pause and retry cancel pending advancement. Live availability is checked before asking for microphone permission, with a working demo path when unavailable.

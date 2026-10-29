# P2b content notes

The source writes the hill name as 紀国坂 without ruby. The brief also requires 紀伊国坂. Both spellings remain in the Mujina story-word list; きのくにざか and きいのくにざか are editorial readings, not Aozora ruby. Where Aozora supplies ruby for a story word, the regression tests compare the reading directly. The author review flags remain false.

Mujina uses 蕎麦屋 rather than 蕎麦 as a story word. The reading そば also means "beside". Protecting the longer そばや span avoids converting 濠のそば into 濠の蕎麦. One already completed hosted run, mujina/s02/N4, had that token corrected back to the model's saved wording without another model call. All four completed Mujina N4 runs were then tokenised again using the revised story-word list, and their final coverage and ghost lists were recalculated. Raw requests and responses, timings, retry counts and historical first-draft metrics remain intact.

Removing spaces cannot resolve every ambiguity in all-hiragana prose. The prompt now requests normal kanji, unspaced Japanese and numeric notation. The checker normalises spaces and full-width digits, protects story words by their written forms and readings, and leaves other unknown content words visible as glossed ghosts.

The retained Ollama runs predate the P2b checker and prompt changes. They are historical comparison evidence, not a controlled comparison using identical settings. Mujina/s01/N4 is a failed Ollama run. No new Ollama model call was made in P2b. The live health endpoint was checked and the server stopped; the live retell request was deliberately skipped because memory was tight.

Coverage measures vocabulary, not fidelity, grammar, sentence length or the suitability of every kanji. Model retellings still need human review. The three-scene sample and any remaining failures are recorded in the final build report.

The P2b JSON repair also handles one observed wrapper error: a missing closing JSON quote after the final Japanese sentence in a rewrite array. It inserts only that quote, then parses and validates the result. Tests cover the observed form, valid strings containing braces, and unrelated malformed strings that must still fail. Scene retries remain bounded to the single retry requested in the brief.

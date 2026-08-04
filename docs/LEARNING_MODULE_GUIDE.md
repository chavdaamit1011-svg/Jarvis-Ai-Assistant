# Jarvis Learn AI module guide

## Where lessons live

- `src/lib/learning/types.ts` defines the strict lesson and progress types.
- `src/lib/learning/topics.ts` is the single data source for every lesson.
- `src/components/learn/learn-dashboard.tsx` renders the course dashboard.
- `src/components/learn/topic-lesson.tsx` renders every dynamic lesson route.

## Add a lesson

1. Add a `LearningTopic` entry to `LEARNING_TOPICS` in the intended sequence.
2. Use a unique URL-safe `slug` and set its prerequisites.
3. Provide beginner-friendly text for overview, flow, example, Jarvis usage, practice, interview questions, and quiz.
4. Set `planned: true` if there is no real implementation yet. Planned lessons intentionally show a placeholder instead of a fake playground.
5. A live playground can link to an existing, real route through `playground`.

## Progress storage

Browser-only progress uses `jarvis.learn.progress.v1`. It stores the last/current topic, per-topic status, completed tabs, quiz score, last-opened time, and the local developer-unlock preference. Reads are defensive: invalid data falls back to an empty state.

## Current real playgrounds

- Tokenization: `/playground/tokenizer`
- Embeddings semantic-search demo: `/embedding-test`

These routes remain independent developer tools; Learn AI links to them rather than duplicating their implementation.

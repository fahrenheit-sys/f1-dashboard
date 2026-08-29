-- 28 Aug 2026 — "Shape Your Club" one-click voting from the monthly email.
--
-- Each option in the email is its own link, so a vote costs a single tap. The
-- link carries the GHL contact id, which is how a vote is attributed without
-- asking anyone to identify themselves.
--
-- One vote per person per question: the unique constraint lets a second tap
-- replace the first rather than double-count, so changing your mind works.

CREATE TABLE IF NOT EXISTS votes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ghl_contact_id TEXT NOT NULL,
  question       TEXT NOT NULL CHECK (question IN ('lifestyle','fitness','wellness')),
  answer         TEXT NOT NULL,
  CONSTRAINT votes_one_per_question UNIQUE (ghl_contact_id, question)
);

COMMENT ON TABLE votes IS 'Shape Your Club responses, one tap from the monthly email.';

CREATE INDEX IF NOT EXISTS votes_question_answer_idx ON votes (question, answer);

-- Results, once responses start arriving.
SELECT question, answer, COUNT(*) AS votes
  FROM votes GROUP BY question, answer ORDER BY question, votes DESC;

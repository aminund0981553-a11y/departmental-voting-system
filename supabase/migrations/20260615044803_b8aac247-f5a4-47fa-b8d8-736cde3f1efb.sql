
-- Self-nomination support for candidates
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NOT NULL DEFAULT now();

-- Backfill: keep existing approved flag consistent with status
UPDATE public.candidates SET status = CASE WHEN approved THEN 'approved' ELSE 'pending' END;

CREATE INDEX IF NOT EXISTS candidates_user_idx ON public.candidates(user_id);
CREATE INDEX IF NOT EXISTS candidates_status_idx ON public.candidates(status);

-- One pending/approved nomination per user per position
CREATE UNIQUE INDEX IF NOT EXISTS candidates_user_position_unique
  ON public.candidates(user_id, position_id)
  WHERE user_id IS NOT NULL AND status <> 'rejected';

-- Update RLS: allow students to create their own pending nominations & view them
DROP POLICY IF EXISTS "Candidates viewable by all" ON public.candidates;
CREATE POLICY "Candidates viewable"
  ON public.candidates FOR SELECT
  TO anon, authenticated
  USING (
    approved
    OR status = 'approved'
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Users can self-nominate"
  ON public.candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND approved = false
  );

CREATE POLICY "Users update own pending nomination"
  ON public.candidates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND approved = false);

CREATE POLICY "Users withdraw own pending nomination"
  ON public.candidates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

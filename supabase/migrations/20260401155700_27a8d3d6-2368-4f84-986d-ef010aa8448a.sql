
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can do anything on payment_requests" ON public.payment_requests;

-- Allow anyone to read their own requests by telegram_id (no auth needed)
CREATE POLICY "Anyone can read payment requests by telegram_id"
ON public.payment_requests FOR SELECT
USING (true);

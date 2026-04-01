
DROP POLICY "Anyone can create withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Service role can create withdrawal requests"
  ON public.withdrawal_requests FOR INSERT
  TO authenticated WITH CHECK (true);

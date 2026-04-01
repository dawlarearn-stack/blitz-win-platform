
-- Make user_id nullable since we're using telegram_id as identifier for Telegram WebApp users
ALTER TABLE public.payment_requests ALTER COLUMN user_id DROP NOT NULL;

-- Drop the foreign key constraint on user_id
ALTER TABLE public.payment_requests DROP CONSTRAINT IF EXISTS payment_requests_user_id_fkey;

-- Create function to insert payment request without auth
CREATE OR REPLACE FUNCTION public.create_payment_request(
  p_telegram_id TEXT,
  p_energy_amount INTEGER,
  p_price_mmk TEXT,
  p_payment_method public.payment_method,
  p_receipt_last4 TEXT,
  p_sender_name TEXT,
  p_sender_phone TEXT,
  p_screenshot_url TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.payment_requests (
    user_id, telegram_id, energy_amount, price_mmk, payment_method,
    receipt_last4, sender_name, sender_phone, screenshot_url, expires_at
  ) VALUES (
    NULL, p_telegram_id, p_energy_amount, p_price_mmk, p_payment_method,
    p_receipt_last4, p_sender_name, p_sender_phone, p_screenshot_url,
    COALESCE(p_expires_at, now() + interval '1 hour')
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Add RLS bypass policy for the function
CREATE POLICY "Service role can do anything on payment_requests"
ON public.payment_requests FOR ALL
USING (true)
WITH CHECK (true);

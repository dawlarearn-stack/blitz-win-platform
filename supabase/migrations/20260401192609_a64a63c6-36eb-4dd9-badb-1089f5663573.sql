
-- Create withdrawal method enum
CREATE TYPE public.withdrawal_method AS ENUM ('binance_id', 'bep20', 'kbz_pay', 'wave_pay');

-- Create withdrawal status enum
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected');

-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  withdrawal_method withdrawal_method NOT NULL,
  amount_points INTEGER NOT NULL,
  amount_usd TEXT,
  amount_mmk TEXT,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'MMK')),
  -- Binance ID fields
  binance_account_name TEXT,
  binance_uid TEXT,
  -- BEP20 fields
  bep20_address TEXT,
  -- MMK fields
  account_name TEXT,
  phone_number TEXT,
  status withdrawal_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read by telegram_id (same pattern as payment_requests)
CREATE POLICY "Anyone can read withdrawal requests"
  ON public.withdrawal_requests FOR SELECT
  TO public USING (true);

-- Allow anyone to insert (edge function uses service role)
CREATE POLICY "Anyone can create withdrawal requests"
  ON public.withdrawal_requests FOR INSERT
  TO public WITH CHECK (true);

-- Admins can update
CREATE POLICY "Admins can update withdrawal requests"
  ON public.withdrawal_requests FOR UPDATE
  TO public USING (has_role(auth.uid(), 'admin'::app_role));

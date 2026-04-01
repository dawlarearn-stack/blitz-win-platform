import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '@supabase/supabase-js/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const {
      telegram_id,
      energy_amount,
      price_mmk,
      payment_method,
      receipt_last4,
      sender_name,
      sender_phone,
      screenshot_url,
    } = body

    // Validate required fields
    if (!telegram_id || !energy_amount || !price_mmk || !payment_method || !receipt_last4 || !sender_name || !sender_phone) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (receipt_last4.length !== 4) {
      return new Response(JSON.stringify({ error: 'Receipt last 4 digits must be exactly 4 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check for existing pending request from same user
    const { data: existing } = await supabase
      .from('payment_requests')
      .select('id')
      .eq('telegram_id', telegram_id)
      .eq('status', 'pending')
      .single()

    if (existing) {
      return new Response(JSON.stringify({ error: 'You already have a pending payment request' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

    // Use a placeholder user_id since we're using telegram_id as identifier
    // We need a valid UUID for the foreign key - use a deterministic one based on telegram_id
    const { data, error } = await supabase.rpc('create_payment_request', {
      p_telegram_id: telegram_id,
      p_energy_amount: energy_amount,
      p_price_mmk: price_mmk,
      p_payment_method: payment_method,
      p_receipt_last4: receipt_last4,
      p_sender_name: sender_name,
      p_sender_phone: sender_phone,
      p_screenshot_url: screenshot_url || null,
      p_expires_at: expires_at,
    })

    if (error) {
      console.error('Insert error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
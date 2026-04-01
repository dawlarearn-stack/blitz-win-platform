import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
      withdrawal_method,
      amount_points,
      amount_usd,
      amount_mmk,
      currency,
      binance_account_name,
      binance_uid,
      bep20_address,
      account_name,
      phone_number,
    } = body

    // Validate required fields
    if (!telegram_id || !withdrawal_method || !amount_points || !currency) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (amount_points < 500000) {
      return new Response(JSON.stringify({ error: 'Minimum withdrawal is 500,000 points ($5)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate method-specific fields
    if (withdrawal_method === 'binance_id' && (!binance_account_name || !binance_uid)) {
      return new Response(JSON.stringify({ error: 'Binance account name and UID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (withdrawal_method === 'bep20' && !bep20_address) {
      return new Response(JSON.stringify({ error: 'BEP20 address required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if ((withdrawal_method === 'kbz_pay' || withdrawal_method === 'wave_pay') && (!account_name || !phone_number)) {
      return new Response(JSON.stringify({ error: 'Account name and phone number required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check for existing pending withdrawal
    const { data: existing } = await supabase
      .from('withdrawal_requests')
      .select('id')
      .eq('telegram_id', telegram_id)
      .eq('status', 'pending')
      .limit(1)

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: 'You already have a pending withdrawal request' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await supabase
      .from('withdrawal_requests')
      .insert({
        telegram_id,
        withdrawal_method,
        amount_points,
        amount_usd: amount_usd || null,
        amount_mmk: amount_mmk || null,
        currency,
        binance_account_name: binance_account_name || null,
        binance_uid: binance_uid || null,
        bep20_address: bep20_address || null,
        account_name: account_name || null,
        phone_number: phone_number || null,
      })
      .select('id')
      .single()

    if (error) throw error

    // Send Telegram notification to admin
    try {
      const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram'
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
      const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')

      if (LOVABLE_API_KEY && TELEGRAM_API_KEY) {
        const methodLabels: Record<string, string> = {
          binance_id: 'Binance ID',
          bep20: 'BEP20',
          kbz_pay: 'KBZ Pay',
          wave_pay: 'WavePay',
        }
        const amountDisplay = currency === 'USD' ? `$${amount_usd}` : `${amount_mmk} MMK`
        const message = `🔔 <b>New Withdrawal Request</b>\n\n👤 TG ID: ${telegram_id}\n💰 Amount: ${amountDisplay}\n📊 Points: ${amount_points.toLocaleString()}\n🏦 Method: ${methodLabels[withdrawal_method] || withdrawal_method}\n\nAdmin Panel မှ Approve/Reject လုပ်ပါ။`

        // Send to admin (you can configure an admin chat ID)
        // For now just log it
        console.log('Withdrawal notification:', message)
      }
    } catch (notifErr) {
      console.error('Notification failed:', notifErr)
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
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

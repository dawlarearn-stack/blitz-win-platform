import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
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

    const adminKey = req.headers.get('x-admin-key')
    const expectedKey = Deno.env.get('ADMIN_SECRET_KEY')
    if (!expectedKey || adminKey !== expectedKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const status = url.searchParams.get('status') || 'pending'

      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST') {
      const { id, action } = await req.json()

      if (!id || !['approved', 'rejected'].includes(action)) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data, error } = await supabase
        .from('withdrawal_requests')
        .update({ status: action })
        .eq('id', id)
        .eq('status', 'pending')
        .select()
        .single()

      if (error) throw error

      // Send Telegram notification
      if (data.telegram_id) {
        try {
          const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram'
          const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
          const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')

          if (LOVABLE_API_KEY && TELEGRAM_API_KEY) {
            const methodLabels: Record<string, string> = {
              binance_id: 'Binance ID',
              bep20: 'BEP20 (BSC)',
              kbz_pay: 'KBZ Pay',
              wave_pay: 'WavePay',
            }
            const amountDisplay = data.currency === 'USD' ? `$${data.amount_usd}` : `${data.amount_mmk}`
            const methodLabel = methodLabels[data.withdrawal_method] || data.withdrawal_method

            let message = ''
            if (action === 'approved') {
              message = `✅ <b>Withdrawal Approved!</b>\n\n💰 Amount: ${amountDisplay}\n📊 Points: ${data.amount_points.toLocaleString()}\n🏦 Method: ${methodLabel}\n\nသင့်ထံသို့ ငွေလွှဲပေးပြီးပါပြီ။ 🎉`
            } else {
              message = `❌ <b>Withdrawal Rejected</b>\n\n💰 Amount: ${amountDisplay}\n📊 Points: ${data.amount_points.toLocaleString()}\n🏦 Method: ${methodLabel}\n\nအချက်အလက်များ မမှန်ကန်ပါ။ ပြန်လည်စစ်ဆေးပြီး ထပ်မံတောင်းဆိုနိုင်ပါသည်။`
            }

            await fetch(`${GATEWAY_URL}/sendMessage`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'X-Connection-Api-Key': TELEGRAM_API_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chat_id: data.telegram_id,
                text: message,
                parse_mode: 'HTML',
              }),
            })
          }
        } catch (telegramErr) {
          console.error('Telegram notification failed:', telegramErr)
        }
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
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

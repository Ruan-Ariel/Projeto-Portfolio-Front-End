import { createClient } from 'npm:@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const TO_EMAIL = Deno.env.get('CONTACT_TO_EMAIL') ?? ''
const FROM_EMAIL = Deno.env.get('CONTACT_FROM_EMAIL') ?? 'Portfólio <onboarding@resend.dev>'
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean)
const MAX_PER_HOUR = 5

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const REASONS: Record<string, string> = {
  profissional: 'Oportunidade profissional',
  freelance: 'Projeto freelance',
  outro: 'Outro',
}

type Payload = {
  nome?: string
  email?: string
  motivo?: string
  assunto?: string
  mensagem?: string
  website?: string
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? ''
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
    'Vary': 'Origin',
  }
}

function reply(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

function validate(p: Payload) {
  const errors: Record<string, string> = {}
  const nome = (p.nome ?? '').trim()
  const email = (p.email ?? '').trim()
  const assunto = (p.assunto ?? '').trim()
  const mensagem = (p.mensagem ?? '').trim()

  if (nome.length < 3 || nome.length > 80) errors.nome = 'O nome deve ter de 3 a 80 caracteres.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) errors.email = 'Informe um e-mail válido.'
  if (!p.motivo || !(p.motivo in REASONS)) errors.motivo = 'Selecione o motivo do contato.'
  if (p.motivo === 'outro' && (assunto.length < 5 || assunto.length > 100)) {
    errors.assunto = 'O assunto deve ter de 5 a 100 caracteres.'
  }
  if (mensagem.length < 30 || mensagem.length > 1000) errors.mensagem = 'A mensagem deve ter de 30 a 1000 caracteres.'

  return { errors, nome, email, assunto, mensagem }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (req.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405, origin)
  if (!ALLOWED_ORIGINS.includes(origin ?? '')) return reply({ error: 'Origem não autorizada.' }, 403, origin)

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return reply({ error: 'Corpo da requisição inválido.' }, 400, origin)
  }

  if (payload.website) return reply({ ok: true }, 200, origin)

  const { errors, nome, email, assunto, mensagem } = validate(payload)
  if (Object.keys(errors).length) return reply({ errors }, 422, origin)

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null

  if (ip) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', since)
    if ((count ?? 0) >= MAX_PER_HOUR) {
      return reply({ error: 'Muitas mensagens em pouco tempo. Tente novamente mais tarde.' }, 429, origin)
    }
  }

  const { data: saved, error: dbError } = await supabase
    .from('contact_messages')
    .insert({
      name: nome,
      email,
      reason: payload.motivo,
      subject: payload.motivo === 'outro' ? assunto : null,
      message: mensagem,
      ip,
    })
    .select('id')
    .single()

  if (dbError || !saved) {
    console.error('Erro ao salvar:', dbError)
    return reply({ error: 'Não foi possível salvar sua mensagem. Tente novamente.' }, 500, origin)
  }

  const motivoTxt = REASONS[payload.motivo!]
  const assuntoEmail = `Novo contato: ${payload.motivo === 'outro' ? assunto : motivoTxt} — ${nome}`
  const html = `
    <h2>Nova mensagem pelo portfólio</h2>
    <p><strong>Nome:</strong> ${escapeHtml(nome)}</p>
    <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
    <p><strong>Motivo:</strong> ${escapeHtml(motivoTxt)}</p>
    ${payload.motivo === 'outro' ? `<p><strong>Assunto:</strong> ${escapeHtml(assunto)}</p>` : ''}
    <p><strong>Mensagem:</strong></p>
    <p style="white-space:pre-wrap">${escapeHtml(mensagem)}</p>`

  let status: 'sent' | 'failed' = 'sent'
  let emailError: string | null = null
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email,
        subject: assuntoEmail,
        html,
      }),
    })
    if (!res.ok) {
      status = 'failed'
      emailError = (await res.text()).slice(0, 500)
      console.error('Resend recusou:', emailError)
    }
  } catch (e) {
    status = 'failed'
    emailError = String(e).slice(0, 500)
    console.error('Falha ao chamar o Resend:', e)
  }

  await supabase.from('contact_messages').update({ email_status: status, email_error: emailError }).eq('id', saved.id)

  return reply({ ok: true }, 200, origin)
})

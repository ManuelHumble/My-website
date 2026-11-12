const recentSubmissions = new Map();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;
const MESSAGE_CONTROL_PATTERN = /[\u0000-\u0008\u000b-\u000c\u000e-\u001f\u007f]/;
const DEFAULT_ORIGINS = [
  'https://okoroemmanuelnjoku.com',
  'https://www.okoroemmanuelnjoku.com',
  'https://okoroemmanuelcom.vercel.app',
  'http://localhost:8000',
  'http://localhost:8001'
];

function json(res, status, body, origin) {
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(body);
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
}

function allowedOrigins() {
  return String(process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(','))
    .split(',').map(value => value.trim()).filter(Boolean);
}

function requestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(String(req.body || '{}')); } catch { return null; }
}

module.exports = async function contactHandler(req, res) {
  const origin = String(req.headers.origin || '');
  const origins = allowedOrigins();
  if (origin && !origins.includes(origin)) return json(res, 403, {error: 'This form origin is not allowed.'});
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return json(res, 405, {error: 'Method not allowed.'}, origin);

  const body = requestBody(req);
  if (!body) return json(res, 400, {error: 'Send the form as JSON.'}, origin);
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();
  const website = String(body.website || '').trim();
  const startedAt = Number(body.formStartedAt || 0);

  if (website) return json(res, 400, {error: 'Unable to send this message.'}, origin);
  if (startedAt && Date.now() - startedAt < 2000) return json(res, 400, {error: 'Please take a moment before sending.'}, origin);
  if (name.length < 2 || name.length > 100 || CONTROL_PATTERN.test(name)) return json(res, 400, {error: 'Enter a valid name.'}, origin);
  if (email.length > 254 || !EMAIL_PATTERN.test(email) || CONTROL_PATTERN.test(email)) return json(res, 400, {error: 'Enter a valid email address.'}, origin);
  if (!message || message.length > 5000 || MESSAGE_CONTROL_PATTERN.test(message)) return json(res, 400, {error: 'Please enter a message (maximum 5,000 characters).'}, origin);

  const now = Date.now();
  const ip = clientIp(req);
  const previous = recentSubmissions.get(ip) || [];
  const recent = previous.filter(timestamp => now - timestamp < 15 * 60 * 1000);
  if (recent.length >= 5) return json(res, 429, {error: 'Too many messages from this connection. Please try again later.'}, origin);
  recent.push(now);
  recentSubmissions.set(ip, recent);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL || 'okoromanuel@gmail.com';
  if (!apiKey || !from || !to) return json(res, 503, {error: 'The contact service is not configured yet.'}, origin);

  let resendResponse;
  try {
    resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`},
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Portfolio enquiry from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`
      })
    });
  } catch (error) {
    console.error('Contact email request failed:', error.message);
    return json(res, 502, {error: 'The email service is temporarily unavailable. Please try again later.'}, origin);
  }
  if (!resendResponse.ok) {
    console.error('Resend rejected contact message:', await resendResponse.text());
    return json(res, 502, {error: 'The email service could not accept your message. Please try again later.'}, origin);
  }
  return json(res, 200, {message: 'Thanks — your message has been sent.'}, origin);
};

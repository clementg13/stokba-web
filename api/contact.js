const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const { name, email, subject, message, website } = body;

  if (website) {
    return res.status(200).json({ ok: true });
  }

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Champs requis manquants.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  if (String(name).length > 200 || String(email).length > 200 || String(subject || '').length > 200 || String(message).length > 5000) {
    return res.status(400).json({ error: 'Contenu trop long.' });
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.CONTACT_TO || user;

  if (!host || !user || !pass) {
    return res.status(500).json({ error: 'Configuration SMTP manquante.' });
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const safeSubject = String(subject || '').trim() || 'Nouveau message';
  const cleanName = String(name).replace(/[\r\n]+/g, ' ').trim();
  const cleanEmail = String(email).replace(/[\r\n]+/g, ' ').trim();

  try {
    await transporter.sendMail({
      from: `"Stokba Contact" <${user}>`,
      to,
      replyTo: `${cleanName} <${cleanEmail}>`,
      subject: `[Contact Stokba] ${safeSubject}`,
      text: `Nom : ${cleanName}\nEmail : ${cleanEmail}\n\n${message}`,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('SMTP error:', err && err.message);
    return res.status(500).json({ error: "Échec de l'envoi. Merci de réessayer." });
  }
};

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}

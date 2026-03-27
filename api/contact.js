const { Resend } = require('resend');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, email, message } = req.body || {};

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
        return res.status(400).json({ error: 'Invalid input' });
    }

    if (name.length > 200 || email.length > 320 || message.length > 5000) {
        return res.status(400).json({ error: 'Input too long' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const sanitize = (str) => str.replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    const safeName = sanitize(name);
    const safeEmail = sanitize(email);
    const safeMessage = sanitize(message).replace(/\n/g, '<br>');

    try {
        await Promise.all([
            resend.emails.send({
                from: 'Stackcraft <noreply@swiftsites.nz>',
                to: 'eli@stackcraft.co.nz',
                subject: `New inquiry from ${safeName}`,
                html: [
                    '<div style="font-family: sans-serif; color: #333; max-width: 600px;">',
                    `<h2 style="color: #111;">New project inquiry</h2>`,
                    `<p><strong>Name:</strong> ${safeName}</p>`,
                    `<p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>`,
                    `<p><strong>Brief:</strong></p>`,
                    `<div style="background: #f5f5f5; padding: 16px; border-radius: 6px; margin-top: 8px;">${safeMessage}</div>`,
                    '</div>'
                ].join('')
            }),
            resend.emails.send({
                from: 'Stackcraft <noreply@swiftsites.nz>',
                to: email,
                subject: 'Got your message — Stackcraft',
                html: [
                    '<div style="font-family: sans-serif; color: #333; max-width: 600px;">',
                    `<p>Hey ${safeName},</p>`,
                    `<p>Thanks for reaching out. I've got your brief and will review it shortly.</p>`,
                    `<p>Expect to hear back from me within 24 hours with questions or a scope outline.</p>`,
                    `<p style="margin-top: 24px;">— Eli<br><span style="color: #888;">Stackcraft</span></p>`,
                    '</div>'
                ].join('')
            })
        ]);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Email send failed:', error);
        return res.status(500).json({ error: 'Failed to send message. Try again later.' });
    }
};

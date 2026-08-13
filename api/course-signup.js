const { Resend } = require('resend');

// Cutoff for the "next course free" bonus. First-of-many course, standing
// start on LinkedIn - 100 is reachable but still means something. Adjust
// freely; nothing else depends on this number being any particular value.
const BONUS_CUTOFF = 100;

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

    const { name, email } = req.body || {};

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }

    if (typeof name !== 'string' || typeof email !== 'string') {
        return res.status(400).json({ error: 'Invalid input' });
    }

    if (name.length > 200 || email.length > 320) {
        return res.status(400).json({ error: 'Input too long' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    if (!process.env.RESEND_COURSE_AUDIENCE_ID) {
        console.error('RESEND_COURSE_AUDIENCE_ID not configured');
        return res.status(500).json({ error: 'Signup is not configured yet. Try emailing eli@stackcraft.co.nz directly.' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const audienceId = process.env.RESEND_COURSE_AUDIENCE_ID;

    const sanitize = (str) => str.replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    const safeName = sanitize(name);
    const [firstName, ...rest] = safeName.split(' ');
    const lastName = rest.join(' ');

    try {
        // Count existing contacts BEFORE adding this one, so the new
        // signup's position is "how many were already ahead of them" + 1.
        // Small race window if two signups land at the exact same
        // millisecond - acceptable for a lead-magnet signup flow, not
        // worth a database just to close a one-person edge case.
        const list = await resend.contacts.list({ audienceId });
        const existingCount = (list?.data?.data || []).length;
        const signupNumber = existingCount + 1;
        const qualifiesForBonus = signupNumber <= BONUS_CUTOFF;

        const created = await resend.contacts.create({
            audienceId,
            email,
            firstName: firstName || '',
            lastName: lastName || '',
            unsubscribed: false,
        });

        if (created?.error) {
            // Resend returns an error object (not a throw) for things like
            // "contact already exists" - treat that specific case as a
            // soft success so re-signing-up doesn't look like a failure.
            const msg = String(created.error?.message || '');
            if (!/already exists/i.test(msg)) {
                throw new Error(msg || 'Failed to add contact');
            }
        }

        await resend.emails.send({
            from: 'Stackcraft <hello@stackcraft.co.nz>',
            to: email,
            subject: qualifiesForBonus
                ? "You're in — plus your bonus, confirmed"
                : "You're in",
            html: [
                '<div style="font-family: sans-serif; color: #333; max-width: 600px;">',
                `<p>Hey ${safeName},</p>`,
                '<p>You\'re signed up for <strong>Ethical and Legal Use of AI in Regulated Industries</strong>. The first lesson lands in your inbox shortly, then one every week.</p>',
                qualifiesForBonus
                    ? `<p>You're signup <strong>#${signupNumber}</strong> — inside the first ${BONUS_CUTOFF}, so you're locked in for free access to the next course too, whenever it's ready.</p>`
                    : '<p>Free the whole way through — enjoy the course.</p>',
                '<p style="margin-top: 24px;">— Eli<br><span style="color: #888;">Stackcraft</span></p>',
                '</div>'
            ].join('')
        });

        return res.status(200).json({ success: true, signupNumber, qualifiesForBonus, bonusCutoff: BONUS_CUTOFF });
    } catch (error) {
        console.error('Course signup failed:', error);
        return res.status(500).json({ error: 'Failed to sign up. Try again or email eli@stackcraft.co.nz directly.' });
    }
};

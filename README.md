# Stackcraft

Solo dev studio website — custom web apps, AI integrations, automation tools, and APIs.

## Stack

- Vanilla HTML, CSS, JS (no frameworks, no build step)
- Vercel serverless function for contact form
- Resend for transactional email

## Local Development

Open `index.html` in a browser. No build step required.

For the contact form API, you'll need to run via Vercel CLI:

```bash
npm install
vercel dev
```

## Deployment

```bash
npm i -g vercel
vercel
```

### Environment Variables

Set in your Vercel project settings:

| Variable | Description |
| --- | --- |
| `RESEND_API_KEY` | API key from [Resend](https://resend.com) |

## Contact Form

`POST /api/contact` with JSON body:

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "helpType": "Consultancy",
  "message": "Project details..."
}
```

- Sends notification to `eli@stackcraft.co.nz`, with the enquirer's address as reply-to
- Sends auto-reply confirmation to the submitter
- From address: `Stackcraft <hello@stackcraft.co.nz>`
- Success requires the provider to accept the notification; a failed courtesy reply does not discard a delivered enquiry.

## October 2026 refresh

- Seven static pages, shared CSS/JS, accessible mobile navigation and contextual enquiries.
- Portrait: approved existing image from `https://swiftsites.nz/studio/eli-mitchell-v2.webp`, reused at Eli's request without editing.
- Validator screenshot: actual dashboard template from `/home/eli/projects/po-validator/webapp/templates/dashboard.html`, rendered locally with invented, labelled sample batches. No database, client records, credentials, or production session contents were used.
- Validator 50% processing-time reduction: supplied directly by Eli on 8 October 2026; described as the result in his workflow, not a universal guarantee.
- Other project descriptions derive from the previous published site. Diagrams are explicitly labelled as workflow illustrations, not screenshots.
- Baseline commit: `02be145`; rollback archive retained outside this repository.
- Run `node --test tests/contact.test.js` for provider failure, validation and success regression checks. These tests stub email delivery and send nothing externally.
- Real inbox delivery must be checked separately; local tests do not establish delivery.

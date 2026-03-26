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
  "message": "Project details..."
}
```

- Sends notification to `fadereport@gmail.com`
- Sends auto-reply confirmation to the submitter
- From address: `Stackcraft <noreply@swiftsites.nz>`

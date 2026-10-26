# Premium site implementation

The versioned catalogue and all nine locale dictionaries live in `premium/`.
USD is canonical; EUR, NZD, AUD and VND are display conversions using server-side validated reference rates. Currency and language are independent. The public UI does not state an unconfirmed billing entity or tax registration.

SwiftSites uses Next.js. Run `npm run build` and `npm run test:premium`.
Stackcraft uses the shared renderer to build static pages into `dist` and Vercel root `api` functions for contact/prices. Run `npm run build` and `npm run test:api` there.

Edit shared files in the SwiftSites worktree, run `node scripts/build-locales.mjs`, then `node scripts/prepare-stack.mjs` to copy the versioned shared files to the adjacent Stackcraft worktree. Rebuild and test both. Never transplant a whole runtime from another client site.

The contact path requires existing Resend configuration; Swift chat requires its existing Anthropic configuration. Tests mock email requests and do not establish real inbox delivery. Do not send test leads without the required authority. Never commit environment values.

Portfolio screenshots are existing public work, with illustrative records explicitly labelled. The approved Eli portrait remains unchanged. Fonts retain their original SIL OFL notices in `public/premium/fonts`.

No operational PO, ACC or CMS instructions or records are part of this site work. Client anonymity is intentional. The validator example describes software Eli built and a reported result, not a personal-use tool or independently audited guarantee.

The previous website-review endpoint remains retired. Existing signed agreements retain their terms. Original source/public archives and restore verification are held in the canonical business archive.

Optional Google Analytics setup, consent behavior and activation checks: [ANALYTICS.md](ANALYTICS.md).

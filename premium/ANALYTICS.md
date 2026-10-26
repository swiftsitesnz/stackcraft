# Google Analytics

The verified public measurement ID in `premium/analytics.json` enables automatic
basic analytics for its brand. Build-time `GA4_SWIFT_MEASUREMENT_ID` and
`GA4_STACK_MEASUREMENT_ID` override the file; an empty value disables analytics.
Malformed IDs fail validation. Keep each brand's real stream separate.

## Current behavior

- Basic Analytics starts automatically. There is no consent banner, analytics
  panel or footer analytics control. The previous local consent-choice store is
  no longer used. The privacy page describes the actual cookie-based collection.
- Collection runs only on `https://www.swiftsites.nz` for SwiftSites and
  `https://stackcraft.co.nz` for Stackcraft; local/preview hosts and 404s do not collect.
- One explicit sanitized `page_view` is sent per page load and per restored
  back/forward-cache view. Google's automatic page view is disabled to avoid duplicates.
- Successful contact and on-site forms emit `generate_lead` only after the site API
  returns HTTP success and `success: true`. Analytics failures do not change an
  already successful enquiry into a failure message.
- Events use an explicit allowlist: renderer-owned page URL/title, referrer origin,
  brand, language, approved service ID, contact/on-site type and the exact Vietnamese
  `danang-2026` offer. Raw query strings, fragments, referrer paths, names, email,
  message, budget and other form fields are excluded. No invented monetary value.
- Advertising storage/user data/personalisation remain denied; Google Signals and
  ad personalisation are disabled in code and account settings. URL passthrough is off.
  Account-side Enhanced Measurement remains OFF. No Google Ads links are configured.
- Cookies use a 180-day lifetime and SameSite=Lax;Secure. An externally supplied
  `ga-disable-MEASUREMENT_ID` browser-level opt-out is respected.

## Runtime cache version

The loader uses a content-hashed asset pathname, `/premium/analytics-4aaed0be9cea.js`.
This bypasses previously cached opt-in code at the old unversioned URL, including
SwiftSites’ four-hour Cloudflare/browser cache. If the runtime changes, rename it
to its new LF-normalised SHA-256 prefix and update all loader references. The cache-version test
fails if content and filename drift or a renderer points at the old URL.

## Verification and maintenance

Preserve the real per-brand IDs and account settings. Do not copy whole renderers
or build scripts between repositories: Swift and Stack have intentional differences.
Stack's English homepage also carries the Search Console verification meta tag.

SwiftSites: `npm run test:premium`, `npm run lint`, `npm run build`.
Stackcraft: `npm run test:api`, `npm run test:analytics`, `npm run build`.
VM tests do not contact Google. API tests stub email providers. A separately
requested live form submission is required to verify actual enquiry delivery.

After an authorized release, confirm there is no analytics interface, that a fresh
production visit loads the matching tag without interaction and appears in the
correct GA Realtime property, and that CSP reports no blocked Analytics endpoints.
Normal navigation and locale changes must not duplicate page views. Preview hosts
must remain silent. Do not use a synthetic measurement ID in production.

Only Google tag-loader and Google Analytics collection hosts are permitted by CSP.
Existing unrelated Cloudflare beacon policy has not been expanded.

## References

- [Google configuration fields](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)
- [Google CSP guidance](https://developers.google.com/tag-platform/security/guides/csp)
- [Enhanced Measurement](https://support.google.com/analytics/answer/9216061)
- [Recommended lead event](https://developers.google.com/analytics/devguides/collection/ga4/reference/events#generate_lead)

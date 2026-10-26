# Optional Google Analytics

Google Analytics is disabled while the brand's ID is empty in `premium/analytics.json`.
The IDs are public identifiers, not credentials. Use the verified GA4 web-stream ID
for the matching brand. Build-time `GA4_SWIFT_MEASUREMENT_ID` and
`GA4_STACK_MEASUREMENT_ID` override the file; an empty override disables the tag.
Malformed IDs fail the build. Do not use a placeholder ID for a release.

## Behavior

- The notice is in normal page flow and cannot cover navigation or a form.
  All nine languages include the notice, controls and privacy explanation.
- Until an explicit opt-in, no Google script, Google request or GA cookie is created.
  Rejection is a first-class choice. The footer reopens settings.
- Choices expire after 180 days. Revocation disables the tag and clears accessible
  `_ga` cookies. Cross-tab changes and back/forward-cache restoration are checked;
  a readable missing/expired/invalid preference does not count as consent.
- Collection is allowed only on `https://www.swiftsites.nz` for SwiftSites and
  `https://stackcraft.co.nz` for Stackcraft. Local and preview sites do not collect.
- Each full page navigation sends one explicit `page_view` after consent; a restored
  back/forward-cache page sends one new view. All site navigation currently uses
  native anchors. If that changes to client routing, revisit this lifecycle.
- Successful contact and on-site forms send `generate_lead` only after the site's
  API returns HTTP success and `success: true`. Tracking failure cannot change a
  successfully sent enquiry into a failure message.
- Event parameters are explicitly constructed: canonical page URL/title, referrer
  origin, brand, language, approved service ID, contact/on-site type, and the exact
  Vietnamese `danang-2026` offer when present. Query strings, fragments, raw
  referrer paths, names, addresses, email, message, budget and other form fields
  are excluded. No made-up monetary value is assigned to a lead.
- Advertising consent remains denied. Google Signals and ad personalization are
  disabled in code; URL passthrough is off. Google Ads is not integrated.

## Account-side activation checklist

1. Finish the owner-controlled Analytics account/property/web-stream setup and
   required terms acceptance. Keep each brand's stream separate.
2. Turn **Enhanced Measurement off**, including history-based pageviews, form
   interactions and site search. The site emits its own sanitized events; automatic
   events are outside that payload allowlist. Keep Google Signals and Ads features off.
3. Set the two verified measurement IDs. Mark `generate_lead` as a key event if
   desired; the code does not require an assigned monetary value.
4. Build and run the tests before publishing. Do not copy the whole shared renderer
   between repos: they have intentional differences. Sync only analytics changes.
5. After authorized publication, check actual network requests and GA Realtime or
   DebugView: none before consent, one page view after consent, no duplication on
   locale navigation, and no further collection after revocation. Confirm no CSP
   errors. Only a separately authorized real enquiry can verify live lead delivery.

SwiftSites: `npm run test:premium`, `npm run lint`, `npm run build`.
Stackcraft: `npm run test:api`, `npm run test:analytics`, `npm run build`.
The analytics VM tests do not contact Google. API tests stub email providers.

The allowed CSP origins are the Google tag loader and Google Analytics collection
hosts only. SwiftSites' pre-existing edge-injected Cloudflare Insights beacon remains
blocked; this change does not expand policy for that separate service.

## References

- [Google consent setup](https://developers.google.com/tag-platform/security/guides/consent)
- [Google configuration fields](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)
- [Google CSP guidance](https://developers.google.com/tag-platform/security/guides/csp)
- [Enhanced Measurement](https://support.google.com/analytics/answer/9216061)
- [Recommended lead event](https://developers.google.com/analytics/devguides/collection/ga4/reference/events#generate_lead)

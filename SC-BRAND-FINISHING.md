# Greenville brand finishing — September 21, 2026

Added multi-size ICO and PNG favicons, an Apple touch icon, and a storefront manifest using the existing South Carolina logo. Existing driver manifest/icons remain separate.

The homepage YouTube cover now uses a local photo with the existing SC logo and live-text South Carolina identification, instead of the generic cartoon thumbnail. It is a promotional cover, not a claim to be a captured video frame or a Greenville event photograph. Clicking still opens the existing YouTube video. Other video IDs retain thumbnail fallback behavior.

Corrected SMTP TLS selection for port 465 and STARTTLS ports, set connection timeouts, and reject empty/partially rejected SMTP envelopes rather than calling them sent. Unit tests use mocks and cannot prove actual inbox delivery.

Unchanged: New York repository/service, prices, package inclusions, inventory, database schema, customer records, order/payment routes, and credentials. Missing sender credentials still require secure configuration by the account holder; this patch does not invent or copy them. Missing exact product photos remain disclosed reference images; conflicting package inclusions have not been guessed or rewritten.

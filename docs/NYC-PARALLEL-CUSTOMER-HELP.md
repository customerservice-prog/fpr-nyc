# NYC customer-help repair (parallel to Stripe/catalog setup)

Scope: contact page, FAQ source-of-truth, native FAQ disclosures and their tests only.

Verified defects at base 2b4b39bc: contact iframe queried Riverdale, SC; the public service-area sentence rendered BUSINESS.address (empty); Google profile link was rendered even when its configured target was empty; FAQ listed SC cities, inherited dollar estimates, insurance and free-delivery/cancellation claims not verified for NYC. The contact client treated any 2xx response as success and left the completed form available for duplicate submission when email delivery failed.

No changes to Stripe, pricing, inventory, database migrations, Railway variables, DNS, indexing, logo or the Syracuse/SC/RentSketch repositories. Another agent owns those setup items. Do not treat this change as a payment or catalog launch approval.

FAQ copy deliberately directs order-specific terms, venue documentation and equipment limits to the confirmed NYC quote/team instead of inventing policies. The visible FAQ and JSON-LD use the same source; delivery communities come from nycServiceAreas. Contact dates follow America/New_York, including the evening before UTC midnight.

Validation: unit checks, existing NYC regression checks, TypeScript, build, local disposable-database browser tests (POST mocked, no real inquiry sent), and read-only live browser checks after merge. Keep production payments/indexing at their existing disabled settings; never flip either to make a test pass.

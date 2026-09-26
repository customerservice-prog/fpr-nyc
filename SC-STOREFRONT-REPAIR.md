# Greenville storefront repair — 2026-09-21

Scope: SC storefront only. NY is a read-only visual/asset reference.

Preserved: all database rows, prices, package inclusions, delivery-only policy, quote validation, tax/deposit settings, Stripe credentials and customer records.

Restored: clean hero, visible mobile CTAs, category images/cards, full category grid, higher YouTube placement, RentSketch animated walkthrough, grouped mobile navigation, desktop designer navigation, service-area ZIP/address-with-ZIP estimator and searchable directory, attributed shared gallery/reviews, exact-size SC tent-lighting cross-sell.

Images: copied public brand assets are served locally. Shared gallery/reviews are explicitly identified as New York material, not Greenville event evidence. Known old promotional wedding art is replaced without changing the package offer. Later admin edits are retained.

RentSketch: the prior SC launcher used tenant=friendly (the NY tenant). It is no longer used for SC. Set NEXT_PUBLIC_RENTSKETCH_SC_TENANT only after provisioning a distinct SC tenant and verifying its Greenville booking integration. Until then, online SC order access is not advertised as working and customers are directed to the Greenville team for layout assistance. No SC tenant, credentials or booking integration were fabricated.

Delivery: the checker uses the existing /api/delivery-fee ZIP calculation. It is not a verified street-address or road-distance quote; the dispatch address remains unconfirmed.

import Link from 'next/link'

export default function ScHomeSeo() {
  return <div className="mt-8 space-y-8">
    <div>
      <h2 className="text-xl font-bold text-dark mb-3">Tent Rentals in Greenville, SC</h2>
      <p className="text-body text-sm">Compare <Link href="/category/tent-rentals" prefetch={false} className="underline">pole tents, frame tents, and canopies</Link> for weddings, graduations, backyard parties, corporate events, and community celebrations. Choose a tent around guest count, seating, serving space, surface, access, and weather needs, then have our Greenville team confirm anchoring and installation requirements for the site.</p>
    </div>
    <div>
      <h2 className="text-xl font-bold text-dark mb-3">Table &amp; Chair Rentals in Greenville, SC</h2>
      <p className="text-body text-sm">Browse <Link href="/category/table-chair-rentals" prefetch={false} className="underline">banquet tables, round tables, cocktail tables, folding chairs, resin chairs, and Chiavari chairs</Link> for ceremonies, meals, and casual gatherings. Check the <Link href="/service-area#delivery-estimate" prefetch={false} className="underline">delivery fee for your event ZIP code</Link> while planning your order.</p>
    </div>
    <div>
      <h2 className="text-xl font-bold text-dark mb-3">Bounce House &amp; Water Slide Rentals in Greenville, SC</h2>
      <p className="text-body text-sm">Explore <Link href="/category/bounce-house-rentals" prefetch={false} className="underline">bounce houses and water slides</Link>, plus concessions, yard games, movie screens, foam-party equipment, generators, and other event add-ons. Review the item page for setup space, power, water, and other requirements before checkout.</p>
    </div>
    <div>
      <h2 className="text-xl font-bold text-dark mb-3">Wedding Rentals in Greenville, SC</h2>
      <p className="text-body text-sm">Compare <Link href="/weddings#packages" prefetch={false} className="underline">wedding packages</Link>, tents, tables, chairs, linens, lighting, dance floors, ceremony pieces, and reception equipment. Use our event-layout walkthrough to explore your setup, then have the Greenville team confirm availability, site requirements, and final pricing.</p>
    </div>
    <div>
      <h2 className="text-xl font-bold text-dark mb-3">Greenville &amp; Upstate South Carolina Delivery</h2>
      <p className="text-body text-sm">Friendly Party Rental SC serves Greenville and nearby Upstate communities including Greer, Simpsonville, Mauldin, Taylors, Easley, Travelers Rest, Fountain Inn, Piedmont, Spartanburg, Anderson, and surrounding areas. Travel fees are separate from rental and package prices. <Link href="/service-area" prefetch={false} className="underline">Review the service area and delivery estimator</Link>, or call <a href="tel:8646105324" className="underline">864-610-5324</a> for help planning your order.</p>
    </div>
  </div>
}

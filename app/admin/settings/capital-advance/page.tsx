export default function CapitalAdvancePage() {
  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Capital Advance</h1>
      <p className="text-sm text-gray-600 mb-4">
        This was a financing/cash-advance product tied to ERS's own payment processor (ERSPay). Since Friendly Party Rental now
        processes payments directly through Stripe rather than ERSPay, this feature does not apply to this system and has not
        been carried over. If financing against future bookings is something you want to explore, that would need to be set up
        directly with Stripe or a separate lender, not through this admin panel.
      </p>
      <p className="text-sm text-gray-500">No action is needed here.</p>
    </div>
  )
}

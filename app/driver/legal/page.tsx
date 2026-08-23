export default function DriverLegalPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-xl font-bold mb-4">Legal</h1>
      <div className="bg-white rounded shadow p-6 space-y-6 text-sm text-gray-700">
        <section>
          <h2 className="font-semibold text-base mb-2">Driver App Terms of Use</h2>
          <p>
            This application is provided for use by authorized Friendly Party Rental drivers to view
            assigned stops, communicate delivery and pickup status, collect payments, and record work
            hours. Use of this app is limited to work-related tasks assigned by Friendly Party Rental.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-base mb-2">Location Data</h2>
          <p>
            When you choose to share your location, your device&apos;s GPS position is sent to Friendly
            Party Rental dispatch only while a route is active, so the office can track delivery progress
            and assist customers with accurate arrival estimates. You can stop sharing at any time from the
            Home screen.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-base mb-2">Payment Collection</h2>
          <p>
            Card payments collected through the Card Reader are processed securely by Stripe. Drivers do
            not have access to full card numbers, and no card details are stored on this device.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-base mb-2">Time Tracking</h2>
          <p>
            Clock in and clock out times recorded in this app are used for payroll and scheduling
            purposes. Please clock in when you begin your shift and clock out when you finish.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-base mb-2">Contact</h2>
          <p>
            Questions about these terms or this app can be directed to Friendly Party Rental management.
          </p>
        </section>
      </div>
    </div>
  )
}

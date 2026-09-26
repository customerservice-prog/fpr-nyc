export default function DriverControlPanelPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-xl font-bold mb-4">Control Panel</h1>
      <div className="bg-white rounded shadow p-6">
        <p className="text-sm text-gray-600 mb-4">
          The Control Panel is the main office dashboard used by dispatch and admin staff to manage
          orders, scheduling, customers, and reports. Drivers with office access can open it below.
        </p>
        <a
          href="/admin"
          className="inline-block w-full text-center bg-green-700 text-white font-semibold py-3 rounded"
        >
          Open Control Panel
        </a>
      </div>
    </div>
  )
}

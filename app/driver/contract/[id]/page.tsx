'use client'

import { useParams } from 'next/navigation'

export default function DriverContractHandoff(){
 const params=useParams<{id:string}>()
 return <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center"><div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center"><h1 className="text-xl font-bold mb-2">Customer Contract</h1><p className="text-sm text-gray-600 mb-5">Hand the device to the customer. They must review the complete rental agreement and sign it themselves.</p><a href={`/contract/${params.id}`} className="block w-full rounded-lg bg-blue-700 text-white font-bold py-4">Open Contract to Review & Sign</a><a href="/driver" className="block mt-3 py-3 text-blue-700 font-semibold">Back to Driver Route</a></div></div>
}

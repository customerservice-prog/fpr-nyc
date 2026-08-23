'use client'

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'

interface PrintOrder {
id: string
orderNumber: string
eventDate: string
eventAddress?: string
eventCity?: string
eventState?: string
eventZip?: string
customerName: string
contractSignedAt?: string | null
contractSignatureName?: string | null
items: Array<{ itemName: string; quantity: number; unitPrice: number; total: number }>
}

export default function PrintContractsPage() {
const [date, setDate] = useState('')
const [orders, setOrders] = useState<PrintOrder[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
const params = new URLSearchParams(window.location.search)
const d = params.get('date') || ''
setDate(d)
fetch(`/api/admin/delivery/print-data?date=${d}`)
.then((r) => r.json())
.then((data) => setOrders(data.orders || []))
.finally(() => setLoading(false))
}, [])

if (loading) {
return <div className="p-8">Loading...</div>
}
return (
<div className="p-8 print:p-0">
<div className="mb-6 print:hidden">
<button onClick={() => window.print()} className="btn-admin px-4 py-2">Print All Contracts</button>
</div>
{orders.length === 0 && <p>No orders scheduled for this date.</p>}
{orders.map((order) => (
<div key={order.id} className="max-w-3xl mx-auto mb-12" style={{ pageBreakAfter: 'always' }}>
<div className="text-center mb-8">
<h1 className="text-2xl font-bold text-dark mb-1">Friendly Party Rental</h1>
<p className="text-body">Greenville, SC and surrounding Upstate South Carolina areas</p>
</div>

<div className="bg-gray-50 p-6 rounded-lg mb-8 space-y-1">
<h2 className="font-bold text-dark mb-2">Event Contract</h2>
<p className="text-sm">Order #{order.orderNumber}</p>
<p className="text-sm">Prepared for: {order.customerName}</p>
<p className="text-sm">Event Date: {formatDate(order.eventDate)}</p>
{order.eventAddress && (
<p className="text-sm">
{order.eventAddress}{order.eventCity ? `, ${order.eventCity}` : ''} {order.eventState} {order.eventZip}
</p>
)}
</div>

<div className="bg-white border rounded-lg p-4 mb-8">
<h2 className="font-bold text-dark mb-3">Items</h2>
<table className="w-full text-sm">
<thead>
<tr className="text-left border-b">
<th className="pb-2">Item</th>
<th className="pb-2 text-right">Qty</th>
<th className="pb-2 text-right">Price</th>
<th className="pb-2 text-right">Total</th>
</tr>
</thead>
<tbody>
{order.items.map((item, idx) => (
<tr key={idx} className="border-b last:border-0">
<td className="py-2">{item.itemName}</td>
<td className="py-2 text-right">{item.quantity}</td>
<td className="py-2 text-right">${item.unitPrice.toFixed(2)}</td>
<td className="py-2 text-right">${item.total.toFixed(2)}</td>
</tr>
))}
</tbody>
</table>
</div>

<div className="bg-white border rounded-lg p-4 mb-8 text-sm text-gray-700">
<h2 className="font-bold text-dark mb-2">Terms of Lease</h2>
<div className="text-xs leading-relaxed">
<p className="mb-3">In addition to the terms below, and the operation guidelines on each rented item, the Lessee (customer) agrees to supervise the operation of any rented item and further agrees that if the item is damaged that he/she will reimburse Friendly Party Rental L.L.C. for the full price to fix the damage and/or the full replacement value of the rented item. Before signing this contract, Lessee agrees that he/she has read the entire contract, has agreed to all terms and conditions herein, and has had all questions he/she may have answered to the Lessee&apos;s full satisfaction and understanding.</p>
<p className="mb-3">Net 30 Payment Terms (For Public Entities Only): The client agrees to pay the total rental amount within 30 days from the invoice date. A Purchase Order (P.O.) must be provided prior to the event as confirmation of payment. An invoice will be issued on the day of the event and payment must be made in full within 30 calendar days from the invoice date. Payments not received within the 30-day period will be subject to a 5% late fee per month until the balance is paid in full. Cancellations made 14 days or more before the event will incur a 25% cancellation fee of the total rental cost; cancellations made less than 14 days before the event will be charged the full rental amount as we cannot rebook the equipment on short notice. Payments can be made via check or credit card and must reference the invoice number. Failure to submit payment within the agreed timeframe may result in additional collection fees and may affect future rental agreements.</p>
<p className="mb-3">Delivery/Operation/Payments: To address specified by Lessee. Lessee grants Friendly Party Rental L.L.C. and its employees/contractors the right to enter said property for the delivery and return of the rented equipment at approximate times. All payments must be made at time of delivery. No refunds will be made after the equipment has been delivered. For jumpers, the lessee agrees to provide one electrical outlet rated at 115 volts with 20 amperes capacity per motor unit within 50 feet of each unit. No electrical cords are to be used. If the blower stops or the air pressure is low, remove all users immediately, and then check on the problem. Air tubes in the rear of the unit should be tied securely to the blower or tied off to prevent air from escaping. The electrical cord should be plugged into an outlet and be the only thing operating on that electrical circuit. Circuit breakers should also be checked. Customer is subject to an additional charge of $20.00 for all service calls due to electricity.</p>
<p className="mb-3">PLEASE DO NOT: Use Tape, String, Streamers, or balloons on Tents, poles, or straps. If you decide to decorate the tent please remove ALL tape, streamers, etc. If not a $50 Fee will be charged to the card on file!</p>
<p className="mb-3">General Rules for Safe Operation: Units must be operated over a smooth, compatible surface such as grass or hard top surface. The unit may NOT be operated on rough surfaces such as rocks, brick, glass, or any jagged objects. Unit cannot be moved by lessee after placed by Friendly Party Rental L.L.C. employees/contractors. Unit MUST BE properly anchored prior to use. Unit will be anchored initially by Friendly Party Rental L.L.C. employees/contractors and the anchors MUST NOT be removed during period of use. Never attempt to relocate, adjust or service a blower. Never use during high winds, gusty winds, thunderstorms or lightening. The unit can turn over in high winds, even if anchored, and this could result in severe injuries to the users. Do not resume use until adverse weather conditions have ceased. Always follow the manufacturers guidelines located on the unit itself.</p>
<p className="mb-3">Additional Safety Rules: Before entering the unit, have the users remove their shoes, eye glasses, belt buckles and any sharp objects. Never play, jump or enter a partially inflated/deflated unit. Never allow the users to climb or play on the outside or inside walls of the unit, columns, netting or roof of unit. Always follow the number of riders and rules posted on the unit itself. Do not plug or unplug the motor repeatedly as this will cause the unit to burn up and you will be responsible for any resulting damage. Always have an adult present, who has reviewed and understands both this contract and the rules posted on the unit itself, who can supervise the riders. Never allow the users to be unsupervised in or around the unit. Never allow more users than the maximum number of users per age group as described within this lease and on the unit itself. Never place a hose or water on or into the unit unless authorized by Friendly Party Rental L.L.C. Do not allow horseplay on, in, or around the unit. Always follow the directions for use on the unit itself. Only children of the same age group are to play on the unit at the same time.</p>
<p className="mb-3">Additional Terms of Lease: Friendly Party Rental L.L.C. is not responsible for bad weather, disruption of electrical service and/or unfavorable conditions that may arise and no charges or fees will be reimbursed as a result. ABSOLUTELY NO silly string or similar items, such as, but not limited to, food, drinks, confetti, foam or trash, in or around the unit at any time!!! Silly string and like objects will cause permanent damage to the unit and lessee will be responsible for the full replacement value of the rented unit and/or assessed a $75.00 cleaning fee if the unit is determined not to be permanently damaged. Lessee agrees not to operate the unit(s) in a manner contrary to this contract and the rules of use on each unit. If lessee operates the unit(s) in a manner contrary to the contract and rules of use on each unit, and the unit is damaged, Lessee agrees to pay the cost or repair or full replacement value of any damaged equipment or unit. Lessee agrees that the equipment leased is for Lessee&apos;s own use and said equipment is not be loaned, sub-let, mortgaged or in any other manner disposed of by Lessee. Lessee further agrees to be liable for any loss of said equipment by reason of fire, theft, or any other cause.</p>
<p className="mb-3">Hold Harmless Provisions: Lessee agrees to indemnify and hold Friendly Party Rental L.L.C. harmless from any and all claim, actions, suits, proceedings, costs, expenses, fees, damages and liabilities, including, but not limited to, reasonable attorney&apos;s fees and costs, arising by reason of injury, damage, or death to persons or property, in connection with or resulting from the use of the leased equipment. This includes, but is not limited to, the manufacture, selection, delivery, possession, use, operation, or return of the equipment. Lessee hereby releases and holds harmless Friendly Party Rental L.L.C. from injuries or damages incurred as a result of the use of the leased equipment. Friendly Party Rental L.L.C. cannot, under any circumstances, be held liable for injuries as a result of inappropriate use, God, nature, or other conditions beyond its control or knowledge. Lessee also agrees to indemnify and hold harmless Friendly Party Rental L.L.C. from any loss, damage, theft or destruction of the equipment during the term of the lease and any extensions thereof.</p>
<p className="mb-3">Disclaimer of Warranties: Friendly Party Rental L.L.C. makes no warranty of any kind, either express or implied, as to the condition of or performance of any leased equipment and Lessee agrees to immediately cease use of the equipment and contact Friendly Party Rental L.L.C. if any of the lease equipment develops any indication defect or improper working conditions. Lessee agrees to use the equipment at Lessees own risk.</p>
<p className="mb-3">Breach/Indemnity/Arbitration: In the event that Lessee breaches any of the terms of this lease, that Lessee will pay for all consequential damages and further indemnify Friendly Party Rental L.L.C. for all costs incurred by Friendly Party Rental L.L.C. incurred in enforcing the terms of the lease or in defending any claim or lawsuit arising out of the operation of said equipment, including the amount of any judgment, attorney&apos;s fees and costs. If Friendly Party Rental L.L.C. determines, within its own discretion, that Lessee has failed, in any way, to observe or comply with the conditions of this lease, Friendly Party Rental L.L.C. may exercise any of the following remedies: termination of this agreement; reenter property and retake the equipment; declare any outstanding rent and charges immediately due and payable and initiate whatever legal proceedings necessary to recover said equipment or monies; and/or pursue any additional remedies available it by law. If a conflict arises, Friendly Party Rental L.L.C. and Lessee will abide by the NY state laws and forgo filing a lawsuit to solve the dispute.</p>
<p className="mb-3">Frame Tent vs Pole Tent: What&apos;s the Difference? A frame tent is made of aluminum or steel pipes and fittings. They&apos;re assembled from the ground up. These freestanding tents do not require any center poles or stakes. Pole tents are held up with center poles and wood/metal side poles. They&apos;re covered with a top that is held in place with ratchet straps on the outside of the tent. These straps are attached to long stakes that are driven into the ground. We set stakes with a gas-powered hammer. Stakes are hammered 42 inches into the ground! You are responsible for knowing where your drains and power lines lay on your property, please keep this in mind when picking a spot for your tent! Keep in mind for early morning deliveries the hammer is slightly louder than a lawn mower. If you request the stakes in a different spot than advised and they get stuck on an underground obstruction, you are responsible for the removal and return of the stake!</p>
<p className="mb-3">All inflatable units MUST be staked in the ground for safety. If this is not possible, you will need to select jumper placement to be around secure items that we can tie off to, i.e. telephone poles, fence posts, etc. The unit must be secured on at least 3 corners. Sandbags are not safe for most setups and as a result, we do not use them.</p>
<p className="mb-3">Once we&apos;ve set up, we do not give refunds for any reason including weather. Please see the FAQ and Policies pages on our website. You will NOT be refunded for the following items: Sidewalls, Fans, tent heaters. If you book these items and realize you do not need them you are still responsible for them, as these items are limited and could have been rented out for another event.</p>
<p className="mb-3">If there is an unforeseen issue and we won&apos;t make it to your event in time a driver will call you and offer you a full refund. If you decide to go through with your order you will NOT be issued a refund of any kind!</p>
<p className="mb-3">If you cancel your rental at any time you will get a raincheck good for one year. Deposits are non-refundable. Events can be canceled at any time for reasons we see fit. We do NOT tolerate abusive or offensive language or behavior! Please keep in mind circumstances do happen and we understand that our goal is to keep you as a returning, loyal customer so in the event of an unforeseen circumstance, we will do our best to work with you on a case-by-case basis!</p>
<p className="mb-3">THE USE OF FALSE IDENTIFICATION OR INFORMATION TO OBTAIN EQUIPMENT OR THE FAILURE TO RETURN EQUIPMENT BY THE END OF THE RENTAL PERIOD SPECIFIED BY THE DUE DATE MAY BE CONSIDERED THEFT, SUBJECT TO CRIMINAL PROSECUTION, AND CIVIL LIABILITY PURSUANT TO APPLICABLE LAWS.</p>
<p className="mb-3">BY SIGNING MY NAME ON THIS CONTRACT I, BEING THE LESSEE, CONTACT PERSON, LESSEE REPRESENTATIVE, OR OTHER INDIVIDUAL ASSUMING THE ROLE OF LESSEE, ACKNOWLEDGE THAT I HAVE COMPLETELY READ AND UNDERSTAND THIS CONTRACT AND ANY AND ALL ACCOMPANIED ADDENDUM(S). I HAVE BEEN FULLY INSTRUCTED BY FRIENDLY PARTY RENTAL L.L.C. PERSONNEL AS A TRAINED OPERATOR FOR THE AFOREMENTIONED EQUIPMENT AND HAVE HAD ALL OF MY QUESTIONS ANSWERED TO MY SATISFACTION. I UNDERSTAND THAT I AM SOLELY RESPONSIBLE FOR ADHERING TO THE TERMS SET FORTH BY THIS RENTAL CONTRACT AGREEMENT AND ANY AND ALL ACCOMPANIED ADDENDUM(S).</p>
</div>
</div>


{order.contractSignedAt ? (
<div className="bg-green-50 border border-green-300 rounded-lg p-6 text-center">
<h2 className="text-xl font-bold text-green-700 mb-2">Contract Signed</h2>
<p className="text-sm">Signed by: {order.contractSignatureName}</p>
<p className="text-sm">Date: {formatDate(order.contractSignedAt)}</p>
</div>
) : (
<div className="border rounded-lg p-6">
<p className="text-sm mb-6">I have read and agree to the Terms of Lease above.</p>
<div className="flex gap-8 mt-8">
<div className="flex-1 border-t border-black pt-1 text-xs">Signature</div>
<div className="flex-1 border-t border-black pt-1 text-xs">Date</div>
</div>
</div>
)}
</div>
))}
</div>
)
}

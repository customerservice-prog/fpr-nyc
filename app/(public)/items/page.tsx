import {scPageMetadata} from '@/lib/scSeo'
import ItemsClient from './ItemsClient'
export const metadata=scPageMetadata('/items','Available Rentals for Your Date — Greenville, SC','Select a date to review available rental equipment. Browse the public category and individual rental pages for equipment details.',false)
export default function ItemsPage(){return <ItemsClient/>}

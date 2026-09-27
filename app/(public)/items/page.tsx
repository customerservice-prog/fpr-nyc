import {nycPageMetadata} from '@/lib/nycSeo'
import ItemsClient from './ItemsClient'
export const metadata=nycPageMetadata('/items','Available Rentals for Your Date — Riverdale, Bronx, NY','Select a date to review available rental equipment. Browse the public category and individual rental pages for equipment details.',false)
export default function ItemsPage(){return <ItemsClient/>}

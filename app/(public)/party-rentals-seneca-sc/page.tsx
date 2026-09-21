import CityRentalGuide,{cityRentalMetadata} from '@/components/public/CityRentalGuide'
export const metadata=cityRentalMetadata("seneca")
export default function Page(){return <CityRentalGuide slug="seneca"/>}

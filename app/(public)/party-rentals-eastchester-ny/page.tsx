import CityRentalGuide,{cityRentalMetadata} from '@/components/public/CityRentalGuide'
export const metadata=cityRentalMetadata("eastchester")
export default function Page(){return <CityRentalGuide slug="eastchester"/>}

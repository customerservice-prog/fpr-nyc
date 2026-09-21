import CityRentalGuide,{cityRentalMetadata} from '@/components/public/CityRentalGuide'
export const metadata=cityRentalMetadata("simpsonville")
export default function Page(){return <CityRentalGuide slug="simpsonville"/>}

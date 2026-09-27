import CityRentalGuide,{cityRentalMetadata} from '@/components/public/CityRentalGuide'
export const metadata=cityRentalMetadata("bronx")
export default function Page(){return <CityRentalGuide slug="bronx"/>}

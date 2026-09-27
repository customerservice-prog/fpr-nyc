import CityRentalGuide,{cityRentalMetadata} from '@/components/public/CityRentalGuide'
export const metadata=cityRentalMetadata("bronxville")
export default function Page(){return <CityRentalGuide slug="bronxville"/>}

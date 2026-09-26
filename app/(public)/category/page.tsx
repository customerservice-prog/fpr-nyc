import CategoryBrowse from './CategoryBrowse'
import { getPublicCategoryPictures } from '@/lib/publicCatalog'

export default async function CategoryPage() {
  const pictures=await getPublicCategoryPictures().catch(()=>({}))
  return <CategoryBrowse pictures={pictures}/>
}

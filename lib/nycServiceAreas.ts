// Downstate delivery areas. These are service areas, not separate physical storefronts.
export interface NycServiceArea { name:string; slug:string; href:string; zips:string[] }

export const NYC_SERVICE_AREAS: NycServiceArea[] = [
  { name:'Riverdale', slug:'riverdale', href:'/', zips:['10471','10463'] },
  { name:'Fieldston', slug:'fieldston', href:'/party-rentals-fieldston-ny', zips:['10471'] },
  { name:'Kingsbridge', slug:'kingsbridge', href:'/party-rentals-kingsbridge-ny', zips:['10463'] },
  { name:'Spuyten Duyvil', slug:'spuyten-duyvil', href:'/party-rentals-spuyten-duyvil-ny', zips:['10463'] },
  { name:'Yonkers', slug:'yonkers', href:'/party-rentals-yonkers-ny', zips:['10701','10703','10704','10705','10710'] },
  { name:'Mount Vernon', slug:'mount-vernon', href:'/party-rentals-mount-vernon-ny', zips:['10550','10552','10553'] },
  { name:'New Rochelle', slug:'new-rochelle', href:'/party-rentals-new-rochelle-ny', zips:['10801','10804','10805'] },
  { name:'Bronxville', slug:'bronxville', href:'/party-rentals-bronxville-ny', zips:['10708'] },
  { name:'Pelham', slug:'pelham', href:'/party-rentals-pelham-ny', zips:['10803'] },
  { name:'Eastchester', slug:'eastchester', href:'/party-rentals-eastchester-ny', zips:['10709'] },
  { name:'Tuckahoe', slug:'tuckahoe', href:'/party-rentals-tuckahoe-ny', zips:['10707'] },
  { name:'Scarsdale', slug:'scarsdale', href:'/party-rentals-scarsdale-ny', zips:['10583'] },
  { name:'White Plains', slug:'white-plains', href:'/party-rentals-white-plains-ny', zips:['10601','10603','10605','10606','10607'] },
  { name:'Larchmont', slug:'larchmont', href:'/party-rentals-larchmont-ny', zips:['10538'] },
  { name:'Mamaroneck', slug:'mamaroneck', href:'/party-rentals-mamaroneck-ny', zips:['10543'] },
]

export const NYC_PRIORITY_AREAS = ['fieldston','kingsbridge','yonkers','mount-vernon','new-rochelle','bronxville','pelham','eastchester']

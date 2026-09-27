// Initial Friendly Party Rental NYC delivery communities. These are service areas, not storefronts.
export interface NycServiceArea { name:string; slug:string; href:string; zips:string[] }
export const NYC_SERVICE_AREAS:NycServiceArea[]=[
 {name:'Riverdale',slug:'riverdale',href:'/',zips:['10463','10471']},
 {name:'Fieldston',slug:'fieldston',href:'/party-rentals-fieldston-ny',zips:['10471']},
 {name:'Kingsbridge',slug:'kingsbridge',href:'/party-rentals-kingsbridge-ny',zips:['10463']},
 {name:'Northwest Bronx',slug:'northwest-bronx',href:'/party-rentals-northwest-bronx-ny',zips:['10463','10467','10468','10470','10471']},
 {name:'Yonkers',slug:'yonkers',href:'/party-rentals-yonkers-ny',zips:['10701','10703','10704','10705','10708','10710']},
 {name:'Mount Vernon',slug:'mount-vernon',href:'/party-rentals-mount-vernon-ny',zips:['10550','10552','10553']},
 {name:'New Rochelle',slug:'new-rochelle',href:'/party-rentals-new-rochelle-ny',zips:['10801','10804','10805']},
 {name:'Bronxville',slug:'bronxville',href:'/party-rentals-bronxville-ny',zips:['10708']},
 {name:'Eastchester',slug:'eastchester',href:'/party-rentals-eastchester-ny',zips:['10709']},
 {name:'Tuckahoe',slug:'tuckahoe',href:'/party-rentals-tuckahoe-ny',zips:['10707']},
 {name:'Pelham',slug:'pelham',href:'/party-rentals-pelham-ny',zips:['10803']},
]
export const NYC_PRIORITY_AREAS=['riverdale','fieldston','kingsbridge','yonkers','mount-vernon','new-rochelle']

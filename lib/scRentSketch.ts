// An SC tenant must be configured explicitly. Never reuse New York's tenant.
const configured=(process.env.NEXT_PUBLIC_RENTSKETCH_SC_TENANT||'').trim()
export const SC_RENTSKETCH_TENANT=/^[a-z0-9][a-z0-9-]{1,63}$/.test(configured)&&configured!=='friendly'?configured:null
export const scOrderAccessUrl=SC_RENTSKETCH_TENANT?'https://rentsketch.com/my-event/?tenant='+encodeURIComponent(SC_RENTSKETCH_TENANT)+'&mode=order':null

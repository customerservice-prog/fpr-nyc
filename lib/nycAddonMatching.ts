export function matchesTentLighting(tentName:string,addonName:string):boolean {
 if(!/\btent\b/i.test(tentName)||/(sidewall|side wall|package|light)/i.test(tentName)||!/^tent\s+lighting\b/i.test(addonName))return false
 const size=(name:string)=>name.match(/\b(\d+)\s*(?:x|×)\s*(\d+)\b/i)?.slice(1).join('x')
 const tentSize=size(tentName);return !!tentSize&&tentSize===size(addonName)
}

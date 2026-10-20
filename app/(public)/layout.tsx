import Header from '@/components/public/Header'
import Footer from '@/components/public/Footer'
import StickyBar from '@/components/public/StickyBar'; import MobileHeader from '@/components/public/MobileHeader'; import MobileBottomNav from '@/components/public/MobileBottomNav'
import ChatWidget from '@/components/public/ChatWidget'
import DesignYourEventLauncher from '@/components/public/DesignYourEventLauncher'
import ConfettiIntro from '@/components/public/ConfettiIntro'
import Nyc2027ArrivalNotice from '@/components/public/Nyc2027ArrivalNotice'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let navItems: { label: string; url: string }[] = []
  let theme: { headerStyle:number; footerStyle:string; btnPrimaryColor:string; btnPrimaryColorBg:string; globalCustomCode:string|null } | null = null
  try { navItems = await prisma.navigationItem.findMany({ where:{isActive:true}, orderBy:{sortOrder:'asc'} }) } catch { navItems=[] }
  try { theme = await prisma.themeSettings.findFirst() } catch { theme=null }
  const btnPrimaryColor=theme?.btnPrimaryColor||'#F5A31B', btnPrimaryColorBg=theme?.btnPrimaryColorBg||'#F5A31B'
  return <>
    <style dangerouslySetInnerHTML={{__html:`:root { --theme-btn-primary: ${btnPrimaryColor}; --theme-btn-primary-bg: ${btnPrimaryColorBg}; } .btn-primary { background-color: var(--theme-btn-primary-bg) !important; color: ${btnPrimaryColor===btnPrimaryColorBg?'#fff':btnPrimaryColor} !important; }`}}/>
    <ConfettiIntro />
    <Nyc2027ArrivalNotice />
    <div className="hidden md:block"><Header navItems={navItems} headerStyle={theme?.headerStyle??1}/></div><div className="md:hidden"><MobileHeader/></div>
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-sm font-semibold text-amber-950">
      New online reservations are open for <strong>2027 events only</strong>. New 2026 online reservations are closed. Existing customers can still use their order links or <a href="tel:7182834593" className="underline">call 718-283-4593</a>.
    </div>
    <main className="min-h-screen pb-20">{children}</main>
    <Footer footerStyle={theme?.footerStyle??'light-links'}/>
    <div className="hidden md:block"><StickyBar/></div><div className="md:hidden"><MobileBottomNav/><div style={{height:'calc(60px + env(safe-area-inset-bottom))'}}/></div>
    <ChatWidget />
    <DesignYourEventLauncher />
    {theme?.globalCustomCode?<div dangerouslySetInnerHTML={{__html:theme.globalCustomCode}}/>:null}
  </>
}

import Header from '@/components/public/Header'
import AnnouncementBanner from '@/components/public/AnnouncementBanner'
import Footer from '@/components/public/Footer'
import StickyBar from '@/components/public/StickyBar'; import MobileHeader from '@/components/public/MobileHeader'; import MobileBottomNav from '@/components/public/MobileBottomNav'
import ChatWidget from '@/components/public/ChatWidget'
import DesignYourEventLauncher from '@/components/public/DesignYourEventLauncher'
import ConfettiIntro from '@/components/public/ConfettiIntro'
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
    <div className="hidden md:block"><Header navItems={navItems} headerStyle={theme?.headerStyle??1}/></div><div className="md:hidden"><MobileHeader/></div>
    <AnnouncementBanner />
    <main className="min-h-screen pb-20">{children}</main>
    <Footer footerStyle={theme?.footerStyle??'dark'}/>
    <div className="hidden md:block"><StickyBar/></div><div className="md:hidden"><MobileBottomNav/><div style={{height:'calc(60px + env(safe-area-inset-bottom))'}}/></div>
    <ChatWidget />
    <DesignYourEventLauncher />
    {theme?.globalCustomCode?<div dangerouslySetInnerHTML={{__html:theme.globalCustomCode}}/>:null}
  </>
}

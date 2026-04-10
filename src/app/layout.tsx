import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import PWAInstallBanner from "@/components/ui/PWAInstallBanner";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#C9A84C",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Destiny Springs CRM",
  description: "Behavioral Health CRM for Destiny Springs Hospital, including admissions pipeline, referral tracking, and census management.",
  icons: { icon: "/Aegislogo.png", shortcut: "/Aegislogo.png", apple: "/Aegislogo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/Aegislogo.png" type="image/png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/Aegislogo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Destiny Springs" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#C9A84C" />
        {/* Apply saved theme immediately — prevents flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('destinysprings-theme')||'luxury';var h=document.documentElement;h.setAttribute('data-theme',t);var m={backgrounds:'--nyx-page-bg',sidebar:'--nyx-sidebar-tex',cards:'--nyx-card-texture'};Object.keys(m).forEach(function(k){var v=localStorage.getItem('destinysprings-bg-'+t+'-'+k);if(v)h.style.setProperty(m[k],"url('"+v+"')");});if(localStorage.getItem('destinysprings-bg-tile-'+t)==='1'){h.style.setProperty('--nyx-page-bg-size','400px 400px');h.style.setProperty('--nyx-page-bg-repeat','repeat');}var ct=localStorage.getItem('destinysprings-bg-'+t+'-cards');if(ct){var st=document.createElement('style');st.id='nyx-card-tex-style';st.textContent='[style*="var(--nyx-card)"]{position:relative!important;overflow:hidden}[style*="var(--nyx-card)"]::after{content:"";position:absolute;inset:0;border-radius:inherit;background-image:url(\''+ct+'\');background-size:cover;background-position:center;opacity:0.14;pointer-events:none;z-index:1}[style*="var(--nyx-card)"]>*{position:relative;z-index:2}';document.head.appendChild(st);}}catch(e){}})();` }} />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}` }} />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <PWAInstallBanner />
      </body>
    </html>
  );
}

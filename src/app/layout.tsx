import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#C9A84C",
};

export const metadata: Metadata = {
  title: "NyxAegis CRM",
  description: "Hospital Business Development Platform for healthcare BD teams",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#C9A84C" />
        {/* Apply saved theme immediately — prevents flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('nyxaegis-theme')||'luxury';var h=document.documentElement;h.setAttribute('data-theme',t);var m={backgrounds:'--nyx-page-bg',sidebar:'--nyx-sidebar-tex',cards:'--nyx-card-texture'};Object.keys(m).forEach(function(k){var v=localStorage.getItem('nyxaegis-bg-'+t+'-'+k);if(v)h.style.setProperty(m[k],"url('"+v+"')");});if(localStorage.getItem('nyxaegis-bg-tile-'+t)==='1'){h.style.setProperty('--nyx-page-bg-size','400px 400px');h.style.setProperty('--nyx-page-bg-repeat','repeat');}var ct=localStorage.getItem('nyxaegis-bg-'+t+'-cards');if(ct){var st=document.createElement('style');st.id='nyx-card-tex-style';st.textContent='[style*="var(--nyx-card)"]{position:relative!important;overflow:hidden}[style*="var(--nyx-card)"]::after{content:"";position:absolute;inset:0;border-radius:inherit;background-image:url(\''+ct+'\');background-size:cover;background-position:center;opacity:0.14;pointer-events:none;z-index:1}[style*="var(--nyx-card)"]>*{position:relative;z-index:2}';document.head.appendChild(st);}}catch(e){}})();` }} />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

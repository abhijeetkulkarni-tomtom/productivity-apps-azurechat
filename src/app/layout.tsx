import { AI_NAME } from "@/features/theme/theme-config";
import { ThemeProvider } from "@/features/theme/theme-provider";
import { Toaster } from "@/features/ui/toaster";
import { cn } from "@/ui/lib";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: AI_NAME,
  description: AI_NAME,
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) { 
  //const { themes } = useTheme();
  return (
    <html lang="en" className="h-full w-full overflow-hidden text-sm">
      <body
        className={cn(inter.className, "h-full w-full flex  bg-background")}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
         <div style={{position: "absolute",top: 0,right: 0}}>
          <img src="/TomTom-logo-RGB_lockup.png" style={{height: "45px"}}></img>
          {/* <img src="/TomTom-logo-RGB_lockup-diap.png" className="dark" style={{height: "45px"}}></img> */}
        </div> 
      </body>
    </html>
  );
}

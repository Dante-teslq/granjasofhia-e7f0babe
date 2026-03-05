import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import AppSidebar from "./AppSidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 border-b border-border bg-sidebar text-sidebar-foreground"
          style={{ height: 'calc(3.5rem + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent min-h-[44px] min-w-[44px]">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <AppSidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-sidebar-primary/40">
              <img src="/logo.jpg" alt="Granja Sofhia" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-sm font-bold font-serif tracking-tight text-sidebar-foreground">
              Granja Sofhia
            </h1>
          </div>
          <div className="w-10" />
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  // Desktop: sidebar fixed, content scrolls independently
  return (
    <div className="flex min-h-screen">
      <div className="fixed top-0 left-0 h-screen w-64 z-30">
        <AppSidebar />
      </div>
      <main className="flex-1 ml-64 overflow-auto min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;

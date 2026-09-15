import { Nav } from "@/components/Nav";
import { isSiteAuthEnabled } from "@/lib/auth/siteAuth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Nav authEnabled={isSiteAuthEnabled()} />
      <main className="min-h-screen flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}

import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import MobileHeader from './MobileHeader';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex bg-pastel-cream">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

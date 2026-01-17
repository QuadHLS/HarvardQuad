export function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <footer className="border-t border-neutral-200" style={{ backgroundColor: '#f7f7f5', paddingTop: '48px', paddingBottom: '48px' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12" style={{ marginBottom: '80px' }}>
          <div className="md:col-span-2">
            <img src="/QUAD.svg" alt="Quad" className="h-16 mb-4" />
          </div>

          <div>
            <h3 className="font-serif text-neutral-900 mb-4">Platform</h3>
            <ul className="space-y-3">
              <li><a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }} className="text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer">Features</a></li>
              <li><a href="#" className="text-neutral-600 hover:text-neutral-900 transition-colors">Support</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-neutral-900 mb-4">Company</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-neutral-600 hover:text-neutral-900 transition-colors">About</a></li>
              <li><a href="#" className="text-neutral-600 hover:text-neutral-900 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-neutral-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-neutral-600">
          <p>© {currentYear} Quad. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/QUADPRIVACYPOLICY.html" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 transition-colors">Privacy</a>
            <a href="/QUADTERMSOFSERVICE.html" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
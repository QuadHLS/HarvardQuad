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
    <footer className="border-t border-neutral-200 bg-[#faf6f1] pt-16 pb-16">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 justify-items-center md:justify-items-start mb-20">
          <div className="hidden md:block md:col-span-2">
            <img src="/QUAD.svg" alt="Quad" className="h-16 mb-4 rounded-none" />
          </div>

          <div>
            <h3 className="font-sans font-normal text-[#27251f] mb-4 leading-[1.1] tracking-[-0.01em]">Platform</h3>
            <ul className="space-y-3">
              <li><a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }} className="text-[#787771] hover:text-[#27251f] transition-colors cursor-pointer font-normal tracking-[-0.01em]">Features</a></li>
              <li><a href="#" className="text-[#787771] hover:text-[#27251f] transition-colors font-normal tracking-[-0.01em]">Support</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-sans font-normal text-[#27251f] mb-4 leading-[1.1] tracking-[-0.01em]">Company</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-[#787771] hover:text-[#27251f] transition-colors font-normal tracking-[-0.01em]">About</a></li>
              <li><a href="#" className="text-[#787771] hover:text-[#27251f] transition-colors font-normal tracking-[-0.01em]">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-neutral-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[#787771] font-normal tracking-[-0.01em]">
          <p>© {currentYear} Quad. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/QUADPRIVACYPOLICY.html" target="_blank" rel="noopener noreferrer" className="hover:text-[#27251f] transition-colors">Privacy</a>
            <a href="/QUADTERMSOFSERVICE.html" target="_blank" rel="noopener noreferrer" className="hover:text-[#27251f] transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
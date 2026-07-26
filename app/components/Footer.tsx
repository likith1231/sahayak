import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white/80 backdrop-blur-md border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          
          {/* Brand Column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-charcoal tracking-tight">Sahayak</span>
            </div>
            <p className="text-sm text-muted max-w-xs">
              Farm-fresh. Direct. Trusted. Connecting local farmers directly with consumers for fairer prices and fresher produce.
            </p>
          </div>

          {/* Quick Links Column */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-charcoal">Quick Links</h4>
            <Link href="/listings" className="text-sm text-muted hover:text-primary transition-colors w-fit">
              Browse Marketplace
            </Link>
            <Link href="/emergency" className="text-sm text-muted hover:text-emergency transition-colors w-fit">
              Emergency Requests
            </Link>
            <Link href="/#how-it-works" className="text-sm text-muted hover:text-primary transition-colors w-fit">
              How it Works
            </Link>
          </div>

          {/* Legal / Contact Column */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-charcoal">Support</h4>
            <a href="mailto:support@sahayak.in" className="text-sm text-muted hover:text-primary transition-colors w-fit">
              Contact Us
            </a>
            <Link href="/terms" className="text-sm text-muted hover:text-primary transition-colors w-fit">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-sm text-muted hover:text-primary transition-colors w-fit">
              Privacy Policy
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} Sahayak. Farmer-to-consumer marketplace.
          </p>
          <div className="flex items-center gap-4 text-muted">
            {/* Social Icons Placeholder */}
            <a href="#" className="hover:text-primary transition-colors" aria-label="Twitter">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
              </svg>
            </a>
            <a href="#" className="hover:text-primary transition-colors" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

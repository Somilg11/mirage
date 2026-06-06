export function ContactPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-20 text-left">
        {/* Header */}
        <div className="mb-16">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-orange-400 mb-4">
            Support
          </p>

          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-white mb-4 text-left">
            Contact Us
          </h1>

          <p className="text-lg text-gray-400">
            Get in touch with our team
          </p>
        </div>

        {/* Contact Information */}
        <div className="space-y-8 mb-16 text-left">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-6 text-left">
              Contact Information
            </h2>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pb-6 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">General Inquiries</h3>
                  <p className="text-gray-400">support@mirage.com</p>
                </div>
                <p className="text-sm text-gray-500">Response within 24 hours</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pb-6 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Technical Support</h3>
                  <p className="text-gray-400">tech@mirage.com</p>
                </div>
                <p className="text-sm text-gray-500">Response within 12 hours</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pb-6 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Business Inquiries</h3>
                  <p className="text-gray-400">business@mirage.com</p>
                </div>
                <p className="text-sm text-gray-500">Response within 48 hours</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Security Issues</h3>
                  <p className="text-gray-400">security@mirage.com</p>
                </div>
                <p className="text-sm text-orange-400">Immediate response</p>
              </div>
            </div>
          </section>
        </div>

        {/* Social Links */}
        <section className="pt-16 border-t border-white/10 text-left">
          <h2 className="text-lg font-semibold text-white mb-4 text-left">Other Ways to Connect</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="https://github.com/Somilg11"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span className="text-sm">GitHub</span>
            </a>
            <a
              href="https://www.buymeacoffee.com/gsomil"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.5 2H3.5C2.67 2 2 2.67 2 3.5v17c0 .83.67 1.5 1.5 1.5h17c.83 0 1.5-.67 1.5-1.5v-17c0-.83-.67-1.5-1.5-1.5zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
              </svg>
              <span className="text-sm">Buy Me a Coffee</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

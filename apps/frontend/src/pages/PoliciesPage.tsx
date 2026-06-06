export function PoliciesPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-20 text-left">
        {/* Header */}
        <div className="mb-16">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-orange-400 mb-4">
            Legal
          </p>

          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-white mb-4 text-left">
            Privacy Policy
          </h1>
        </div>

        {/* Content */}
        <div className="space-y-14 text-left">
          <section>
            <h2 className="text-3xl font-semibold text-white mb-5 text-left">
              1. Information Collection
            </h2>

            <p className="text-lg leading-8 text-gray-400 text-left">
              Mirage collects information you provide directly, including account information, trading activity,
              and communications with our support team. We may also collect certain technical data automatically.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold text-white mb-5 text-left">
              2. Use of Information
            </h2>

            <p className="text-lg leading-8 text-gray-400 text-left">
              We use your information to provide, maintain, and improve our services, process transactions,
              communicate with you, and comply with legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold text-white mb-5 text-left">
              3. Data Security
            </h2>

            <p className="text-lg leading-8 text-gray-400 text-left">
              We implement appropriate technical and organizational measures to protect your personal data
              against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold text-white mb-5 text-left">
              4. Data Retention
            </h2>

            <p className="text-lg leading-8 text-gray-400 text-left">
              We retain your personal data for as long as necessary to provide our services and comply with
              legal requirements. You may request deletion of your account and associated data.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold text-white mb-5 text-left">
              5. Third-Party Services
            </h2>

            <p className="text-lg leading-8 text-gray-400 text-left">
              We may use third-party services to help operate our platform. These services may have access
              to your personal data only to perform specific tasks on our behalf.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold text-white mb-5 text-left">
              6. Your Rights
            </h2>

            <p className="text-lg leading-8 text-gray-400 text-left">
              You have the right to access, correct, or delete your personal data. You may also opt out of
              certain communications or data collection practices where technically feasible.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold text-white mb-5 text-left">
              7. Updates to Policy
            </h2>

            <p className="text-lg leading-8 text-gray-400 text-left">
              We may update this privacy policy from time to time. We will notify users of significant changes
              through our platform or other communication channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

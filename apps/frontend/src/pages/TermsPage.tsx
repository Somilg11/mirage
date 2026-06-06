export function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 sm:px-10 py-20 text-left">
        {/* Header */}
        <div className="mb-16">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-orange-400 mb-4">
            Legal
          </p>

          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-white mb-4 text-left">
            Terms and Conditions
          </h1>
        </div>

        {/* Content */}
        <div className="space-y-14 text-left">
          <section>
            <h2 className="text-3xl font-semibold text-white mb-5 text-left">
              1. Acceptance of Terms
            </h2>

            <p className="text-lg leading-8 text-gray-400 text-left">
              By accessing and using Mirage, you agree to be bound by these
              Terms and Conditions. If you do not agree to these terms, please
              do not use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold text-white mb-5 text-left">
              2. Prediction Markets
            </h2>

            <p className="text-lg leading-8 text-gray-400 text-left">
              Mirage is a prediction market platform where users can buy and
              sell positions on various outcomes. All trades are executed based
              on current market prices and available liquidity.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold text-white mb-5 text-left">
              3. User Responsibilities
            </h2>

            <p className="text-lg leading-8 text-gray-400 text-left">
              Users are responsible for maintaining the security of their
              accounts and all activities that occur under their account. You
              must notify us immediately of any unauthorized use of your
              account.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold text-white mb-5 text-left">
              4. Risk Disclaimer
            </h2>

            <p className="text-lg leading-8 text-gray-400 text-left">
              Trading in prediction markets involves significant risk. You
              should carefully consider your financial situation and risk
              tolerance before participating. Past performance does not
              guarantee future results.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold text-white mb-5 text-left">
              5. Privacy
            </h2>

            <p className="text-lg leading-8 text-gray-400 text-left">
              Your privacy is important to us. Please review our Privacy Policy
              to understand how we collect, use, and protect your personal
              information.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold text-white mb-5 text-left">
              6. Modifications
            </h2>

            <p className="text-lg leading-8 text-gray-400 text-left">
              We reserve the right to modify these terms at any time. Continued
              use of the platform after changes constitutes acceptance of the
              modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold text-white mb-5 text-left">
              7. Contact
            </h2>

            <p className="text-lg leading-8 text-gray-400 text-left">
              If you have any questions about these Terms and Conditions, please
              contact us through our contact page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
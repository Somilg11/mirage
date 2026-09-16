import { Link } from 'react-router-dom';
import { LegalPage } from './LegalPage';

export function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms and Conditions"
      intro="Please read these terms carefully before using Mirage."
      sections={[
        {
          title: 'Acceptance of terms',
          body: 'By accessing and using Mirage, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our platform.',
        },
        {
          title: 'Prediction markets',
          body: 'Mirage is a prediction market platform where users can buy and sell positions on various outcomes. All trades are executed based on current market prices and available liquidity. Balances are simulated and carry no monetary value.',
        },
        {
          title: 'User responsibilities',
          body: 'Users are responsible for maintaining the security of their accounts and wallets and for all activities that occur under their account. You must notify us immediately of any unauthorized use of your account.',
        },
        {
          title: 'Risk disclaimer',
          body: 'Trading in prediction markets involves significant risk. You should carefully consider your financial situation and risk tolerance before participating. Past performance does not guarantee future results.',
        },
        {
          title: 'Privacy',
          body: (
            <>
              Your privacy is important to us. Please review our{' '}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>{' '}
              to understand how we collect, use, and protect your personal information.
            </>
          ),
        },
        {
          title: 'Modifications',
          body: 'We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the modified terms.',
        },
        {
          title: 'Contact',
          body: (
            <>
              If you have any questions about these Terms and Conditions, please reach out through our{' '}
              <Link to="/contact" className="text-primary hover:underline">
                contact page
              </Link>
              .
            </>
          ),
        },
      ]}
    />
  );
}

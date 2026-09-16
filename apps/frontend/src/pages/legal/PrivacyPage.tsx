import { LegalPage } from './LegalPage';

export function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="How Mirage collects, uses and protects your information."
      sections={[
        {
          title: 'Information collection',
          body: 'Mirage collects information you provide directly, including your wallet address, trading activity, and communications with our support team. We may also collect certain technical data automatically.',
        },
        {
          title: 'Use of information',
          body: 'We use your information to provide, maintain, and improve our services, process transactions, communicate with you, and comply with legal obligations.',
        },
        {
          title: 'Data security',
          body: 'We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.',
        },
        {
          title: 'Data retention',
          body: 'We retain your personal data for as long as necessary to provide our services and comply with legal requirements. You may request deletion of your account and associated data.',
        },
        {
          title: 'Third-party services',
          body: 'We use third-party services such as authentication and hosting providers to operate the platform. These services may access your personal data only to perform specific tasks on our behalf.',
        },
        {
          title: 'Your rights',
          body: 'You have the right to access, correct, or delete your personal data. You may also opt out of certain communications or data collection practices where technically feasible.',
        },
        {
          title: 'Updates to this policy',
          body: 'We may update this privacy policy from time to time. We will notify users of significant changes through our platform or other communication channels.',
        },
      ]}
    />
  );
}

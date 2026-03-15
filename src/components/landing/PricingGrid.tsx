import { PricingCard } from './PricingCard';

export function PricingGrid() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '32px',
        marginBottom: '80px',
      }}
    >
      <PricingCard
        name="Free"
        price="0"
        period=" / forever"
        features={['2 books per month', 'Standard translation engine', 'Web reader access', 'Community support']}
        buttonText="Current Plan"
        buttonType="outline"
        featured={false}
      />

      <PricingCard
        name="Scholar"
        price="12"
        period=" / month"
        features={['15 books per month', 'Advanced Nuance™ engine', 'Export to Kindle/ePub', 'Priority processing']}
        buttonText="Start 14-day Trial"
        buttonType="primary"
        featured={true}
      />

      <PricingCard
        name="Unlimited"
        price="29"
        period=" / month"
        features={['Unlimited library', 'Literary Voice Analysis', 'Offline mobile access', 'Personal Librarian AI']}
        buttonText="Go Unlimited"
        buttonType="outline"
        featured={false}
      />
    </div>
  );
}

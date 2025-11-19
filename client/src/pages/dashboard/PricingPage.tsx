import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { HeroSection } from '@/components/sections/HeroSection';
import { Button } from '@/components/ui/ButtonA';
import { Card } from '@/components/ui/Card';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock, Shield, Users, Zap } from 'lucide-react';
import { useState } from 'react';

// Define the type for a pricing plan
interface PricingPlan {
  name: string;
  description: string;
  monthlyPrice: number | string;
  annualPrice: number | string;
  cta: string;
  uniqueFeatures: string[];
  inheritedFrom?: number;
  popular?: boolean;
}

const addOnBundles = [
  {
    name: 'Starter',
    price: 25,
    minutes: 2000,
    tagline: 'Great for seasonal bursts'
  },
  {
    name: 'Growth',
    price: 60,
    minutes: 5000,
    tagline: 'Built for onboarding waves'
  },
  {
    name: 'Scale',
    price: 180,
    minutes: 15000,
    tagline: 'Designed for power users'
  }
];

const trustFeatures = [
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 Type II certified infrastructure'
  },
  {
    icon: Zap,
    title: 'Rapid Deployment',
    description: 'Go live in days, not months'
  },
  {
    icon: Users,
    title: 'Dedicated Support',
    description: 'Your success team from day one'
  },
  {
    icon: Clock,
    title: 'Flexible Scaling',
    description: 'Grow at your own pace'
  }
];

// Helper to recursively collect inherited features
type GetInheritedFeatures = (plan: PricingPlan, plans: PricingPlan[]) => string[];
const getInheritedFeatures: GetInheritedFeatures = (plan, plans) => {
  if (plan.inheritedFrom === undefined) {return [];}
  const parent = plans[plan.inheritedFrom];
  return [
    ...getInheritedFeatures(parent, plans),
    ...parent.uniqueFeatures
  ];
};

// --- Feature Matrix from CSV ---
const featureMatrix = [
  {
    key: 'Users Included',
    label: 'Users',
    values: ['1 Seat', '5 Seats', '25 Seats', '25 Seats']
  },
  {
    key: 'Meeting Types (Departments)',
    label: 'Meeting Types',
    values: ['3 Meeting Types', '5 Meeting Types', '5 Meeting Types', 'Unlimited Meeting Types']
  },
  {
    key: 'Monthly Reports Included',
    label: 'Monthly Reports',
    values: ['1 Monthly Report', '5 Monthly Reports', '5 Monthly Reports', 'Custom Monthly Reports']
  },
  {
    key: 'Monthly Query Limit',
    label: 'Monthly Queries',
    values: ['200 Queries', '1,000 Queries', '5,000 Queries', 'Unlimited Queries']
  },
  {
    key: 'Call Minutes Included',
    label: 'Call Minutes',
    values: ['1,500 Call Minutes', '5,000 Call Minutes', '10,000 Call Minutes', 'Unlimited Call Minutes']
  },
  {
    key: 'Maximum Meeting Length',
    label: 'Max Meeting Length',
    values: ['90 mins Meeting Length', '120 mins Meeting Length', '120 mins Meeting Length', 'Unlimited Meeting Length']
  },
  {
    key: 'AI Memory Retention',
    label: 'Memory Retention',
    values: ['2 Years AI Memory Retention', '3 Years AI Memory Retention', '5 Years AI Memory Retention', '10 Years AI Memory Retention']
  },
  {
    key: 'Real-Time Coaching (Knowty)',
    label: 'Real-Time Coaching',
    values: [false, true, true, 'Custom playbooks']
  },
  {
    key: 'Department - Level Reports',
    label: 'Department Reports',
    values: [false, true, true, 'Fully Custom']
  },
  {
    key: 'Data Export',
    label: 'Data Export',
    values: [true, true, true, 'Bulk Export & API']
  },
  {
    key: 'Custom Integrations',
    label: 'Custom Integrations',
    values: [false, false, false, 'Scoped']
  },
  {
    key: 'Priority Support',
    label: 'Support Level',
    values: ['Standard', 'Standard', 'Priority', '24/7 + Escalation']
  },
  {
    key: 'Custom Meeting Summaries',
    label: 'Custom Summaries',
    values: [true, true, true, true]
  },
  {
    key: 'Data Storage',
    label: 'Storage',
    values: ['5 GB Storage', '15 GB Storage', '50 GB Storage', '100 GB Storage']
  },
  {
    key: 'Video Recording',
    label: 'Video Recording',
    values: [false, false, true, true]
  },
  {
    key: 'Automatic Speaker Recognition',
    label: 'Speaker Recognition',
    values: [true, true, true, true]
  },
  {
    key: 'Brand Voice',
    label: 'Brand Voice',
    values: [false, false, true, true]
  },
  {
    key: 'Multi Language Transcripts',
    label: 'Multi-Language',
    values: [false, false, false, true]
  },
  {
    key: 'CRM Integration',
    label: 'CRM Integration',
    values: [false, false, true, true]
  },
  {
    key: 'API Webhooks',
    label: 'API Webhooks',
    values: [false, true, true, true]
  },
  {
    key: 'Security Compliance',
    label: 'Security',
    values: ['Basic Security', 'Basic Security', 'SSO/HIPAA Security', 'SSO/HIPAA Security, Custom Data Retention, Advanced Admin Controls']
  }
];

const planNames = ['Personal', 'Business', 'Company', 'Custom'];
const planDescriptions = [
  'Solopreneurs, freelancers, small teams.',
  'Suits Small to medium Businesses or growing teams.',
  'Suits Corporations or Large Companies',
  "Cstom package to suit your company's needs"
];
const planMonthly = [20, 35, 60, 'Contact'];
const planAnnual = [15, 29, 55, 'Contact'];
const planCtas = [
  'Get Started Personal',
  'Get Started Business',
  'Get Started Company',
  'Contact Sales'
];

export const PricingPage = () => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [selectedSeats, setSelectedSeats] = useState<number | '15+'>(1);

  // Seat options for dropdown
  const seatOptions = [
    { value: 1, label: '1 seat' },
    { value: 3, label: '3 seats' },
    { value: 5, label: '5 seats' },
    { value: 10, label: '10 seats' },
    { value: 15, label: '15 seats' },
    { value: '15+', label: '15+ seats', custom: true }
  ];

  // Plan seat limits (Personal: 1, Business: 5, Company: 25, Custom: 15+)
  const planSeatLimits = [1, 5, 25, Infinity];

  return (
    <>
      <HeroSection
        headline="Transparent Pricing. Scalable Value."
        subheadline="Built for growing teams—from startup to enterprise. Pay for what you use, never for what you don't."
        primaryCta={{ text: 'Explore Features', href: '/features' }}
        secondaryCta={{ text: 'Talk to Sales', href: '/contact' }}
      />

      <Section>
        <Container>
          {/* Seat Selection Dropdown */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
            <label htmlFor="seat-select" className="text-gray-700 font-medium mr-2">Choose team size:</label>
            <div className="relative">
              <select
                id="seat-select"
                value={selectedSeats}
                onChange={(e) => setSelectedSeats(e.target.value === '15+' ? '15+' : Number(e.target.value))}
                className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-mint-500 text-sm font-medium bg-white"
              >
                {seatOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {/* Badges in dropdown (visual only, not in native select) would require a custom dropdown */}
            </div>
            {selectedSeats === '15+' && (
              <span className="ml-2 px-2 py-1 rounded bg-gray-200 text-xs font-semibold text-gray-700">Custom Pricing</span>
            )}

          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center items-center gap-4 mb-12">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billingPeriod === 'annual'
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Annual <span className="text-mint-500">(Save 20%)</span>
            </button>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-4 gap-8 mb-16 items-stretch">
            {planNames.map((planName, idx) => {
              const price = billingPeriod === 'monthly' ? planMonthly[idx] : planAnnual[idx];
              // Determine if this plan is enabled for the selected seat count
              let enabled = true;
              if (typeof selectedSeats === 'number') {
                enabled = selectedSeats <= planSeatLimits[idx];
              } else {
                enabled = idx === 3; // Only Custom plan is enabled for 15+
              }
              // Always recommend Business plan if enabled, otherwise next enabled plan
              let recommendedIdx = 1;
              if (typeof selectedSeats === 'number' && selectedSeats > planSeatLimits[1]) {
                recommendedIdx = planNames.findIndex((_, i) => {
                  if (typeof selectedSeats === 'number') {
                    return selectedSeats <= planSeatLimits[i];
                  } else {
                    return i === 3;
                  }
                });
              }
              // Split features into non-boolean and boolean
              const nonBooleanFeatures = featureMatrix.filter((f) => {
                const val = f.values[idx];
                return val !== false && val !== true;
              });
              const booleanFeatures = featureMatrix.filter((f) => {
                const val = f.values[idx];
                return val === true;
              });

              return (
                <motion.div
                  key={planName}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <Card className={`p-6 h-full relative ${idx === recommendedIdx ? 'ring-2 ring-mint-500' : ''} ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    {idx === recommendedIdx && enabled && (
                      <div className="absolute top-0 right-0 bg-mint-500 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg rounded-tr-lg">
                        Recommended
                      </div>
                    )}
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-green-700">{planName}</h3>
                      <p className="text-gray-600 text-sm mt-1">{planDescriptions[idx]}</p>
                    </div>
                    <div className="mb-4">
                      <div className="flex items-baseline">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={billingPeriod}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="text-3xl font-bold text-green-700"
                          >
                            {typeof price === 'number' ? `$${price}` : price}
                          </motion.span>
                        </AnimatePresence>
                        {typeof price === 'number' && (
                          <span className="text-gray-600 ml-2">/seat</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">billed {billingPeriod === 'monthly' ? 'monthly' : 'annually'}</p>
                    </div>
                    <Button
                      variant={idx === recommendedIdx ? 'default' : 'outline'}
                      className="w-full mb-6"
                    >
                      {planCtas[idx]}
                    </Button>

                    {/* Non-boolean features (always shown if present) */}
                    <ul className="mb-4 space-y-1">
                      {nonBooleanFeatures.map((f, i) => (
                        <li key={i} className="flex items-center text-sm text-gray-700">
                          <Check className="h-4 w-4 text-mint-500 mr-2" />
                          {f.values[idx]}
                        </li>
                      ))}
                    </ul>
                    {/* Section heading for boolean features */}
                    {idx > 0 ? (
                      <div className="mb-2 text-xs font-bold text-gray-900">
                        Everything in {planNames[idx - 1]}, plus:
                      </div>
                    ) : (
                      <div className="mb-2 text-xs font-bold text-gray-900">
                        Key Features
                      </div>
                    )}
                    {/* Boolean features (inherited logic) */}
                    <ul className="mb-8 space-y-1">
                      {booleanFeatures.map((f, i) => {
                        // Only show if not present as true in any lower plan
                        let show = true;
                        for (let j = 0; j < idx; ++j) {
                          if (f.values[j] === true) {
                            show = false;
                            break;
                          }
                        }
                        if (!show) {return null;}
                        return (
                          <li key={i} className="flex items-center text-sm text-gray-700">
                            <Check className="h-4 w-4 text-mint-500 mr-2" />
                            {f.label}
                          </li>
                        );
                      })}
                    </ul>

                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Add-On Credits Section */}
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-green-700 mb-4">Need more calls? Just top up.</h2>
              <p className="text-gray-600">
                Every plan comes with monthly included minutes. Run over? Add usage anytime—no penalties.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {addOnBundles.map((bundle) => (
                <Card key={bundle.name} className="p-6">
                  <h3 className="text-xl font-bold text-green-700 mb-2">{bundle.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{bundle.tagline}</p>
                  <div className="flex items-baseline mb-4">
                    <span className="text-3xl font-bold text-green-700">${bundle.price}</span>
                    <span className="text-gray-600 ml-2">/ bundle</span>
                  </div>
                  <p className="text-gray-600">
                    Includes {bundle.minutes.toLocaleString()} minutes
                  </p>
                </Card>
              ))}
            </div>
          </div>

        </Container>
      </Section>
    </>
  );
};

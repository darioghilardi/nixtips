export const setupFaqs = (Alpine) =>
  Alpine.data('faqs', () => ({
    faqs: [
      {
        question: 'Can I change my plan?',
        answer:
          'Change or cancellation of a plan can be done anytime. You can read in our documentation how a change to your plan affects your billing, when you are on a yearly prepaid subscription or on a monthly subscription.',
        isOpen: false,
      },
      {
        question: 'What is a credit?',
        answer:
          'A credit is the currency you use to run simulations. Each subscription plan comes with a number of credits that you can use within a month.',
        isOpen: false,
      },
      {
        question: 'How many simulations can I run with a credit?',
        answer:
          'A simulation with 8 wind directions costs 1 credit, a simulation with 16 wind directions costs 2 credits and a simulation with 32 wind directions costs 4 credits.',
        isOpen: false,
      },
    ],
  }))

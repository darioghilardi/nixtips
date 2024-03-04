export const setupPricing = (Alpine) =>
  Alpine.data('plan', (plan) => ({
    plan: plan,
    type: 'annualy',
    credits: 2,
    packs: {
      2: 900,
      6: 2450,
      12: 4400,
      24: 7900,
    },
    subscription: {
      monthly: {
        2: 550,
        6: 1320,
        12: 2420,
        24: 4400,
        48: 7920,
      },
      annualy: {
        2: 500,
        6: 1200,
        12: 2200,
        24: 4000,
        48: 7200,
      },
    },

    togglePlan() {
      this.plan = this.plan == 'subscription' ? 'packs' : 'subscription'
      this.credits = 2
      this.type = 'annualy'
    },

    toggleType() {
      this.type = this.type == 'annualy' ? 'monthly' : 'annualy'
    },

    changeCreditsAmount(credits) {
      this.credits = credits
    },
  }))

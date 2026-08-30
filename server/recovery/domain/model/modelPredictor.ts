import type { NormalizedPayment } from "../../data/supabaseData";

type NumericFeature = {
  name: string;
  median: number;
  mean: number;
  scale: number;
};

type CategoricalFeature = {
  name: string;
  fillValue: string;
  categories: string[];
};

type FeatureInput = Record<string, string | number | boolean | null | undefined>;

const portableLogisticPredictor = {
  categoricalFeatures: [
    { categories: ["card", "netbanking", "upi", "wallet"], fillValue: "card", name: "payment_method" },
    { categories: ["cashfree", "ccavenue", "instamojo", "paytm", "payu", "razorpay"], fillValue: "instamojo", name: "gateway" },
    {
      categories: [
        "bank_decline",
        "blocked_card",
        "duplicate_payment",
        "expired_card",
        "gateway_timeout",
        "insufficient_balance",
        "invalid_card",
        "network_error",
        "otp_failed",
        "payment_timeout",
        "risk_blocked",
      ],
      fillValue: "gateway_timeout",
      name: "failure_reason",
    },
    {
      categories: [
        "electronics",
        "entertainment",
        "fashion",
        "food",
        "groceries",
        "health",
        "retail",
        "subscription",
        "travel",
        "utilities",
      ],
      fillValue: "utilities",
      name: "merchant_category",
    },
    { categories: ["desktop", "mobile", "tablet"], fillValue: "mobile", name: "device_type" },
    { categories: ["IN"], fillValue: "IN", name: "country" },
  ] satisfies CategoricalFeature[],
  coefficients: [
    -0.009605400259961743, -0.11731261197739974, -0.11731261197739974, -0.013744879316945222, 0.08257885961677144,
    0.004989329856671889, -0.6801205362100746, 0.025139224515339263, 0.10952572804142963, -0.1448144483467367,
    0.25005051762874553, -0.21220601741303524, -0.006562901940638964, 0.2855571984553726, 0.026649333554567632,
    -0.1238104499241536, -0.05844379631133402, -0.12083360392339931, 0.3957990068724674, -1.699719310421462,
    -1.2677293158060283, -1.402579926376304, 2.5024814300950293, 0.8451147699222108, -1.9164955695731969,
    2.0308370364835953, 0.029686541795229622, 1.5277927522813615, -1.0426316353624723, -0.055449460758422754,
    0.07877504765593624, -0.05843376112657424, -0.08546985066412106, -0.17128665733836274, 0.10209228317830767,
    0.1672445243049919, -0.05778336785653754, 0.05720880345017565, 0.025658219065011725, 0.17390851147824704,
    -0.03746351216765842, -0.1338892194001815, 0.002555779910395253,
  ],
  intercept: -1.3600695887973246,
  numericFeatures: [
    { mean: 10304.937649880096, median: 3460, name: "amount", scale: 17133.852144603643 },
    { mean: 1.460431654676259, median: 1, name: "attempt_number", scale: 0.7256802354218519 },
    { mean: 0.460431654676259, median: 0, name: "previous_failures", scale: 0.7256802354218519 },
    { mean: 0.8346345323741008, median: 0.843, name: "customer_success_history", scale: 0.10660919805379558 },
    { mean: 943.4148681055156, median: 956, name: "customer_tenure", scale: 522.3358338541403 },
    { mean: 13.713189448441247, median: 13, name: "hour_of_day", scale: 5.881258584457138 },
    { mean: 40.55251798561151, median: 23, name: "days_since_last_success", scale: 49.16596227246787 },
    { mean: 0.14532374100719425, median: 0, name: "is_recurring_payment", scale: 0.352426944637989 },
  ] satisfies NumericFeature[],
};

function asFiniteNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function predictRecoveryProbability(input: FeatureInput) {
  let logit = portableLogisticPredictor.intercept;
  let coefficientIndex = 0;
  for (const feature of portableLogisticPredictor.numericFeatures) {
    const value = asFiniteNumber(input[feature.name], feature.median);
    logit += ((value - feature.mean) / feature.scale) * portableLogisticPredictor.coefficients[coefficientIndex++];
  }
  for (const feature of portableLogisticPredictor.categoricalFeatures) {
    const value = String(input[feature.name] ?? feature.fillValue);
    for (const category of feature.categories) {
      if (category === value) logit += portableLogisticPredictor.coefficients[coefficientIndex];
      coefficientIndex += 1;
    }
  }
  return 1 / (1 + Math.exp(-logit));
}

export function predictPaymentRecoveryProbability(payment: NormalizedPayment) {
  return predictRecoveryProbability({
    amount: payment.amount,
    attempt_number: payment.attemptNumber,
    previous_failures: payment.previousFailures,
    customer_success_history: payment.customerSuccessHistory,
    customer_tenure: payment.customerTenure,
    hour_of_day: Number(new Date(payment.timestamp).getUTCHours()),
    is_recurring_payment: payment.isRecurring ? 1 : 0,
    days_since_last_success: payment.daysSinceLastSuccess,
    payment_method: payment.paymentMethod,
    gateway: payment.gateway,
    failure_reason: payment.failureReason,
    merchant_category: payment.merchantCategory,
    device_type: payment.deviceType,
    country: payment.country,
  });
}

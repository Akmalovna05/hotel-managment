const STEPS = [
  { label: 'Validating card details', ms: 700 },
  { label: 'Connecting to payment network', ms: 800 },
  { label: 'Authorizing transaction', ms: 750 },
  { label: 'Confirming reservation', ms: 750 },
]

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Simulates 2–3s hotel PMS payment processing before API completes. */
export async function simulatePaymentProcessing(onStep) {
  for (const step of STEPS) {
    onStep?.(step.label)
    await delay(step.ms)
  }
}

export const PAYMENT_STEPS = STEPS.map((s) => s.label)

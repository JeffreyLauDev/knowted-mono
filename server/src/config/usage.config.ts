import { registerAs } from "@nestjs/config";

export const usageConfig = registerAs("usage", () => ({
  // Free trial limits
  freeTrial: {
    monthlyMinutes: parseInt(process.env.FREE_TRIAL_MONTHLY_MINUTES, 10) || 300,
    seatCount: parseInt(process.env.FREE_TRIAL_SEAT_COUNT, 10) || 1,
  },

  // Paid plan limits (minutes per seat)
  paidPlans: {
    personal: {
      minutesPerSeat:
        parseInt(process.env.PERSONAL_MINUTES_PER_SEAT, 10) || 1500,
    },
    business: {
      minutesPerSeat:
        parseInt(process.env.BUSINESS_MINUTES_PER_SEAT, 10) || 3000,
    },
    company: {
      minutesPerSeat:
        parseInt(process.env.COMPANY_MINUTES_PER_SEAT, 10) || 6000,
    },
    custom: {
      minutesPerSeat:
        parseInt(process.env.CUSTOM_MINUTES_PER_SEAT, 10) || 10000,
    },
  },

  // Default fallback values
  defaults: {
    monthlyMinutes: parseInt(process.env.DEFAULT_MONTHLY_MINUTES, 10) || 300,
    seatCount: parseInt(process.env.DEFAULT_SEAT_COUNT, 10) || 1,
  },
}));

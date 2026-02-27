import { z } from 'zod';

export const conversionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  direction: z.enum(['GBP_TO_JPY', 'JPY_TO_GBP']),
  gbpPence: z.number().int().positive('GBP amount must be positive'),
  jpyAmount: z.number().int().positive('JPY amount must be positive'),
  rate: z.number().positive('Exchange rate must be positive'),
  spotRate: z.number().positive('Spot rate must be positive').optional(),
  feePct: z.number().min(0).max(100).optional(),
  provider: z.enum(['WISE', 'REVOLUT', 'OTHER']).optional(),
  notes: z.string().max(500).optional(),
  bandAtTime: z.enum(['AGGRESSIVE_BUY', 'NORMAL_BUY', 'HOLD', 'REVERSE']).nullable().optional(),
});

export const settingsSchema = z
  .object({
    aggressive_above: z.number().positive('Aggressive threshold must be positive'),
    normal_above: z.number().positive('Normal threshold must be positive'),
    hold_above: z.number().positive('Hold threshold must be positive'),
    cap_aggressive_gbp: z.number().int().positive('Aggressive cap must be positive'),
    cap_normal_gbp: z.number().int().positive('Normal cap must be positive'),
    total_gbp_savings_pence: z.number().int().positive('Total savings must be positive'),
    max_fx_exposure_pct: z.number().int().min(0).max(100),
    monthly_jpy_expenses: z.number().int().min(0),
    monthly_jpy_salary_net: z.number().int().min(0),
    nisa_monthly_jpy: z.number().int().min(0),
    nisa_return_pct: z.number().min(0).max(100),
    circuit_breaker_loss_pence: z.number().int().positive('Circuit breaker must be positive'),
    gbp_safety_net_months: z.number().int().min(1),
    scenario_best_rate: z.number().positive(),
    scenario_base_rate: z.number().positive(),
    scenario_worst_rate: z.number().positive(),
    review_interval_days: z.number().int().min(1),
    last_band_review: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').nullable().optional(),
  })
  .refine(
    (data) => data.hold_above < data.normal_above,
    { message: 'hold_above must be less than normal_above', path: ['hold_above'] }
  )
  .refine(
    (data) => data.normal_above <= data.aggressive_above,
    { message: 'normal_above must be less than or equal to aggressive_above', path: ['normal_above'] }
  );

export type ConversionInput = z.infer<typeof conversionSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;


"use server";

import { generateMonthlyFeeReport, type GenerateMonthlyFeeReportInput } from "@/ai/flows/generate-monthly-fee-report";
import { z } from "zod";

const GenerateReportSchema = z.object({
  month: z.string().min(1, "Month is required."),
  year: z.string().length(4, "Year must be 4 digits.").regex(/^\d{4}$/, "Invalid year format."),
  expectedTotalFees: z.coerce.number().min(0, "Expected fees cannot be negative."),
  receivedTotalFees: z.coerce.number().min(0, "Received fees cannot be negative."),
  currency: z.string().default("INR"),
});

export async function generateReportAction(input: GenerateMonthlyFeeReportInput) {
  const validatedInput = GenerateReportSchema.safeParse(input);

  if (!validatedInput.success) {
    // Concatenate all error messages
    const errorMessages = validatedInput.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
    return { success: false, error: errorMessages, report: null };
  }

  try {
    const result = await generateMonthlyFeeReport(validatedInput.data);
    return { success: true, report: result.report, error: null };
  } catch (error) {
    console.error("Error generating statement:", error);
    return { success: false, error: "Failed to generate statement due to an internal error.", report: null };
  }
}

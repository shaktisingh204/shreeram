// The 'use server' directive is critical here.
'use server';

/**
 * @fileOverview Generates a monthly fee report indicating the expected versus received amounts.
 *
 * - generateMonthlyFeeReport - A function that generates the monthly fee report.
 * - GenerateMonthlyFeeReportInput - The input type for the generateMonthlyFeeReport function.
 * - GenerateMonthlyFeeReportOutput - The return type for the generateMonthlyFeeReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMonthlyFeeReportInputSchema = z.object({
  month: z.string().describe('The month for which to generate the report (e.g., January, February).'),
  year: z.string().describe('The year for which to generate the report (e.g., 2024).'),
  expectedTotalFees: z.number().describe('The total expected fees for the specified month.'),
  receivedTotalFees: z.number().describe('The total received fees for the specified month.'),
  currency: z.string().describe('Currency used in the report.').default('USD'),
});
export type GenerateMonthlyFeeReportInput = z.infer<typeof GenerateMonthlyFeeReportInputSchema>;

const GenerateMonthlyFeeReportOutputSchema = z.object({
  report: z.string().describe('A detailed report of expected versus received fees for the month.'),
});
export type GenerateMonthlyFeeReportOutput = z.infer<typeof GenerateMonthlyFeeReportOutputSchema>;

export async function generateMonthlyFeeReport(input: GenerateMonthlyFeeReportInput): Promise<GenerateMonthlyFeeReportOutput> {
  return generateMonthlyFeeReportFlow(input);
}

const generateMonthlyFeeReportPrompt = ai.definePrompt({
  name: 'generateMonthlyFeeReportPrompt',
  input: {
    schema: GenerateMonthlyFeeReportInputSchema,
  },
  output: {
    schema: GenerateMonthlyFeeReportOutputSchema,
  },
  prompt: `You are an accounting assistant responsible for generating a detailed monthly fee report.

  Based on the provided information, create a comprehensive report that includes:
  - The total expected fees for the month: {{expectedTotalFees}} {{currency}}
  - The total received fees for the month: {{receivedTotalFees}} {{currency}}
  - The month and year the report covers: {{month}} {{year}}
  - A clear comparison of expected versus received amounts, highlighting any discrepancies.
  - Any additional notes or observations regarding the fee collection for the month.

  Ensure the report is well-structured, easy to understand, and suitable for presentation to the management team.
  `,
});

const generateMonthlyFeeReportFlow = ai.defineFlow(
  {
    name: 'generateMonthlyFeeReportFlow',
    inputSchema: GenerateMonthlyFeeReportInputSchema,
    outputSchema: GenerateMonthlyFeeReportOutputSchema,
  },
  async input => {
    const {output} = await generateMonthlyFeeReportPrompt(input);
    return output!;
  }
);

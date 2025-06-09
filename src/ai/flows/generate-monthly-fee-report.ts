
// The 'use server' directive is critical here.
'use server';

/**
 * @fileOverview Generates a monthly fee statement indicating the expected versus received amounts.
 *
 * - generateMonthlyFeeReport - A function that generates the monthly fee statement.
 * - GenerateMonthlyFeeReportInput - The input type for the generateMonthlyFeeReport function.
 * - GenerateMonthlyFeeReportOutput - The return type for the generateMonthlyFeeReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMonthlyFeeReportInputSchema = z.object({
  month: z.string().describe('Month for the statement (e.g., January, February).'),
  year: z.string().describe('Year for the statement (e.g., 2024).'),
  expectedTotalFees: z.number().describe('The total expected fees for the specified month.'),
  receivedTotalFees: z.number().describe('The total received fees for the specified month.'),
  currency: z.string().describe('Currency used in the statement.').default('INR'),
});
export type GenerateMonthlyFeeReportInput = z.infer<typeof GenerateMonthlyFeeReportInputSchema>;

const GenerateMonthlyFeeReportOutputSchema = z.object({
  report: z.string().describe('A detailed statement of expected vs. received fees for the month.'),
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
  prompt: `You are an assistant who creates detailed monthly fee statements.

  Using the information below, create a detailed statement that includes:
  - The total expected fees for the month: {{expectedTotalFees}} {{currency}}
  - The total received fees for the month: {{receivedTotalFees}} {{currency}}
  - The month and year the statement covers: {{month}} {{year}}
  - A clear comparison of expected versus received amounts, showing any differences.
  - Any additional notes or observations regarding the fee collection for the month.

  Make sure the statement is clear and easy to read.
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

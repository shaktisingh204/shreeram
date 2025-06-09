export interface Student {
  id: string;
  fullName: string;
  photoUrl?: string;
  contactDetails: string;
  idProofUrl?: string;
  notes?: string;
  seatId?: string; // Changed from seatNumber
  status: 'enrolled' | 'owing' | 'inactive';
  feesDue: number;
  lastPaymentDate?: string;
  enrollmentDate: string;
  feePlanId?: string;
}

export interface Seat {
  id: string;
  seatNumber: string;
  floor: string; // Added floor
  isOccupied: boolean;
  studentId?: string;
  studentName?: string; // Kept for convenience, can be derived
}

export interface FeePayment {
  id: string;
  studentId: string;
  studentName?: string;
  amount: number;
  paymentDate: string;
  notes?: string;
}

export interface FeePlan {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'annually';
}

// For dashboard summary
export interface DashboardSummary {
  totalStudents: number;
  totalSeats: number;
  availableSeats: number;
  monthlyIncome: number;
  feesDueToday: number;
}

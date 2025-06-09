
export interface Student {
  id: string;
  fullName: string;
  photoUrl?: string;
  contactDetails: string; // Email
  mobileNumber?: string;
  address?: string;
  fatherName?: string;
  idProofUrl?: string;
  notes?: string;
  seatId?: string;
  status: 'enrolled' | 'owing' | 'inactive'; // 'enrolled' can mean 'active'
  feesDue: number; // Amount to pay
  lastPaymentDate?: string;
  enrollmentDate: string; // Joined On
  paymentTypeId?: string;
  libraryName?: string; // Optional: for superadmin all-libraries view context
}

export interface Seat {
  id: string;
  seatNumber: string;
  floor: string;
  isOccupied: boolean;
  studentId?: string;
  studentName?: string;
  libraryName?: string; // Optional: for superadmin all-libraries view context
}

export interface FeePayment {
  id: string;
  studentId: string;
  studentName?: string; // This should ideally reflect student.fullName which might have library context
  amount: number;
  paymentDate: string;
  notes?: string;
  libraryName?: string; // Optional: for superadmin all-libraries view context
}

export interface PaymentType { // Renamed from FeePlan
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'annually'; // Payment Cycle
  libraryName?: string; // Optional: for superadmin all-libraries view context
}

export interface DashboardSummary {
  totalStudents: number;
  totalSeats: number;
  availableSeats: number;
  monthlyIncome: number; // Monthly Earnings
  studentsWithDues: number; // Renamed from feesDueToday
  libraryName?: string; // Added for context
}

export interface LibraryMetadata {
  id: string;
  name: string;
  createdAt: string; // ISO date string
}

export interface UserMetadata {
  id: string; // Firebase UID
  email: string;
  role: 'superadmin' | 'manager';
  displayName?: string;
  mobileNumber?: string;
  assignedLibraryId?: string; 
  assignedLibraryName?: string; 
}


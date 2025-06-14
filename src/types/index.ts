
export interface Student {
  id: string;
  fullName: string;
  photoUrl?: string;
  aadhaarNumber?: string; // Changed from contactDetails (email)
  mobileNumber?: string;
  address?: string;
  fatherName?: string;
  idProofUrl?: string;
  notes?: string;
  seatId?: string;
  status: 'enrolled' | 'owing' | 'inactive';
  feesDue: number; 
  lastPaymentDate?: string;
  enrollmentDate: string; 
  paymentTypeId?: string;
  libraryName?: string; 
}

export interface Seat {
  id: string;
  seatNumber: string;
  floor: string;
  isOccupied: boolean;
  studentId?: string;
  studentName?: string;
  libraryName?: string; 
}

export interface FeePayment {
  id: string;
  studentId: string;
  studentName?: string; 
  amount: number;
  paymentDate: string;
  notes?: string;
  libraryName?: string; 
}

export interface PaymentType { 
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'annually'; 
  libraryName?: string; 
}

export interface DashboardSummary {
  totalStudents: number;
  totalSeats: number;
  availableSeats: number;
  monthlyIncome: number; 
  studentsWithDues: number; 
  libraryName?: string; 
}

export interface LibraryMetadata {
  id: string;
  name: string;
  createdAt: string; 
}

export interface UserMetadata {
  id: string; 
  email: string;
  role: 'superadmin' | 'manager';
  displayName?: string;
  mobileNumber?: string;
  assignedLibraryId?: string; 
  assignedLibraryName?: string; 
}

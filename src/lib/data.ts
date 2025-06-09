import type { Student, Seat, FeePlan, FeePayment, DashboardSummary } from '@/types';

export const mockStudents: Student[] = [
  { id: '1', fullName: 'Alice Wonderland', contactDetails: 'alice@example.com', seatNumber: 'A1', status: 'enrolled', feesDue: 0, enrollmentDate: '2023-01-15', feePlanId: 'fp1', photoUrl: 'https://placehold.co/100x100', idProofUrl: 'https://placehold.co/200x150' },
  { id: '2', fullName: 'Bob The Builder', contactDetails: 'bob@example.com', seatNumber: 'B3', status: 'owing', feesDue: 50, enrollmentDate: '2023-02-01', feePlanId: 'fp2', lastPaymentDate: '2024-06-01' },
  { id: '3', fullName: 'Charlie Brown', contactDetails: 'charlie@example.com', status: 'inactive', feesDue: 0, enrollmentDate: '2022-11-10' },
  { id: '4', fullName: 'Diana Prince', contactDetails: 'diana@example.com', seatNumber: 'C2', status: 'enrolled', feesDue: 0, enrollmentDate: '2023-03-20', feePlanId: 'fp1' },
];

export const mockSeats: Seat[] = Array.from({ length: 20 }, (_, i) => {
  const row = String.fromCharCode(65 + Math.floor(i / 5)); // A, B, C, D
  const col = (i % 5) + 1;
  const seatNumber = `${row}${col}`;
  const student = mockStudents.find(s => s.seatNumber === seatNumber);
  return {
    id: `seat-${seatNumber}`,
    seatNumber,
    isOccupied: !!student,
    studentId: student?.id,
    studentName: student?.fullName,
  };
});

export const mockFeePlans: FeePlan[] = [
  { id: 'fp1', name: 'Standard Monthly', amount: 100, frequency: 'monthly' },
  { id: 'fp2', name: 'Premium Monthly', amount: 150, frequency: 'monthly' },
  { id: 'fp3', name: 'Basic Quarterly', amount: 280, frequency: 'quarterly' },
];

export const mockPayments: FeePayment[] = [
  { id: 'payment1', studentId: '1', studentName: 'Alice Wonderland', amount: 100, paymentDate: '2024-07-01', notes: 'July payment' },
  { id: 'payment2', studentId: '2', studentName: 'Bob The Builder', amount: 100, paymentDate: '2024-06-01', notes: 'June partial payment' },
  { id: 'payment3', studentId: '4', studentName: 'Diana Prince', amount: 100, paymentDate: '2024-07-05', notes: 'July payment' },
];

export const mockDashboardSummary: DashboardSummary = {
  totalStudents: mockStudents.filter(s => s.status !== 'inactive').length,
  totalSeats: mockSeats.length,
  availableSeats: mockSeats.filter(s => !s.isOccupied).length,
  monthlyIncome: mockPayments.reduce((sum, p) => {
    const paymentMonth = new Date(p.paymentDate).getMonth();
    const currentMonth = new Date().getMonth();
    return paymentMonth === currentMonth ? sum + p.amount : sum;
  }, 0),
  feesDueToday: mockStudents.filter(s => s.status === 'owing' && s.feesDue > 0).length,
};

// Simulate database operations (in a real app, these would be API calls or server actions)
export const getStudents = async (): Promise<Student[]> => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return mockStudents;
};

export const getStudentById = async (id: string): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockStudents.find(s => s.id === id);
};

export const addStudent = async (student: Omit<Student, 'id'>): Promise<Student> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const newStudent: Student = { ...student, id: String(Date.now()) };
  mockStudents.push(newStudent);
  // If seatNumber is provided, update the seat
  if (newStudent.seatNumber) {
    const seat = mockSeats.find(s => s.seatNumber === newStudent.seatNumber);
    if (seat) {
      seat.isOccupied = true;
      seat.studentId = newStudent.id;
      seat.studentName = newStudent.fullName;
    }
  }
  return newStudent;
};

export const updateStudent = async (id: string, updates: Partial<Student>): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const studentIndex = mockStudents.findIndex(s => s.id === id);
  if (studentIndex === -1) return undefined;

  const originalStudent = mockStudents[studentIndex];
  
  // Handle seat change
  if (updates.seatNumber !== undefined && updates.seatNumber !== originalStudent.seatNumber) {
    // Vacate old seat
    if (originalStudent.seatNumber) {
      const oldSeat = mockSeats.find(s => s.seatNumber === originalStudent.seatNumber);
      if (oldSeat) {
        oldSeat.isOccupied = false;
        oldSeat.studentId = undefined;
        oldSeat.studentName = undefined;
      }
    }
    // Occupy new seat
    if (updates.seatNumber) {
      const newSeat = mockSeats.find(s => s.seatNumber === updates.seatNumber);
      if (newSeat) {
        newSeat.isOccupied = true;
        newSeat.studentId = id;
        newSeat.studentName = updates.fullName || originalStudent.fullName;
      }
    }
  }

  mockStudents[studentIndex] = { ...originalStudent, ...updates };
  return mockStudents[studentIndex];
};

export const getSeats = async (): Promise<Seat[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockSeats;
};

export const assignSeat = async (studentId: string, seatNumber: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const student = mockStudents.find(s => s.id === studentId);
  const seat = mockSeats.find(s => s.seatNumber === seatNumber);

  if (!student || !seat || seat.isOccupied) return false;

  // Vacate previous seat if any
  if (student.seatNumber) {
    const oldSeat = mockSeats.find(s => s.seatNumber === student.seatNumber);
    if (oldSeat) {
      oldSeat.isOccupied = false;
      oldSeat.studentId = undefined;
      oldSeat.studentName = undefined;
    }
  }
  
  seat.isOccupied = true;
  seat.studentId = studentId;
  seat.studentName = student.fullName;
  student.seatNumber = seatNumber;
  return true;
};

export const getFeePlans = async (): Promise<FeePlan[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockFeePlans;
}

export const addFeePlan = async (plan: Omit<FeePlan, 'id'>): Promise<FeePlan> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const newPlan : FeePlan = {...plan, id: String(Date.now())};
  mockFeePlans.push(newPlan);
  return newPlan;
}

export const updateFeePlan = async (id: string, updates: Partial<FeePlan>): Promise<FeePlan | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const planIndex = mockFeePlans.findIndex(p => p.id === id);
  if (planIndex === -1) return undefined;
  mockFeePlans[planIndex] = {...mockFeePlans[planIndex], ...updates};
  return mockFeePlans[planIndex];
}

export const getPayments = async (): Promise<FeePayment[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockPayments;
}

export const addPayment = async (payment: Omit<FeePayment, 'id' | 'studentName'>): Promise<FeePayment> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const student = mockStudents.find(s => s.id === payment.studentId);
  if (!student) throw new Error("Student not found");

  const newPayment: FeePayment = { ...payment, id: String(Date.now()), studentName: student.fullName };
  mockPayments.push(newPayment);
  
  student.feesDue = Math.max(0, student.feesDue - payment.amount);
  if (student.feesDue === 0) {
    student.status = 'enrolled';
  }
  student.lastPaymentDate = newPayment.paymentDate;
  return newPayment;
}

export const markFeesAsPaid = async (studentId: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const student = mockStudents.find(s => s.id === studentId);
  if (!student) return false;
  student.feesDue = 0;
  student.status = 'enrolled';
  student.lastPaymentDate = new Date().toISOString().split('T')[0]; // Today's date
  return true;
}


export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  // Recalculate summary based on current mock data state
  return {
    totalStudents: mockStudents.filter(s => s.status !== 'inactive').length,
    totalSeats: mockSeats.length,
    availableSeats: mockSeats.filter(s => !s.isOccupied).length,
    monthlyIncome: mockPayments.reduce((sum, p) => {
      const paymentDate = new Date(p.paymentDate);
      const currentDate = new Date();
      // Check if payment is in the current month and year
      if (paymentDate.getFullYear() === currentDate.getFullYear() && paymentDate.getMonth() === currentDate.getMonth()) {
        return sum + p.amount;
      }
      return sum;
    }, 0),
    feesDueToday: mockStudents.filter(s => s.status === 'owing' && s.feesDue > 0).length, // Simplified, real logic might be complex
  };
}

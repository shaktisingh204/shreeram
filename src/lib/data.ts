
import type { Student, Seat, FeePlan, FeePayment, DashboardSummary } from '@/types';

// Initial mock students - seatId will be populated after seats are defined
export const mockStudentsInitial: Omit<Student, 'id' | 'seatId'> & { tempSeatNumber?: string, id: string}[] = [
  { id: '1', fullName: 'Alice Wonderland', contactDetails: 'alice@example.com', tempSeatNumber: 'F1-S1', status: 'enrolled', feesDue: 0, enrollmentDate: '2023-01-15', feePlanId: 'fp1', photoUrl: 'https://placehold.co/100x100', idProofUrl: 'https://placehold.co/200x150' },
  { id: '2', fullName: 'Bob The Builder', contactDetails: 'bob@example.com', tempSeatNumber: 'F1-S2', status: 'owing', feesDue: 50, enrollmentDate: '2023-02-01', feePlanId: 'fp2', lastPaymentDate: '2024-06-01' },
  { id: '3', fullName: 'Charlie Brown', contactDetails: 'charlie@example.com', status: 'inactive', feesDue: 0, enrollmentDate: '2022-11-10' },
  { id: '4', fullName: 'Diana Prince', contactDetails: 'diana@example.com', tempSeatNumber: 'F2-S1', status: 'enrolled', feesDue: 0, enrollmentDate: '2023-03-20', feePlanId: 'fp1' },
];

export const mockSeats: Seat[] = Array.from({ length: 12 }, (_, i) => { // Reduced initial seats, can be added via UI
  const floorNumber = Math.floor(i / 6) + 1; // Example: 2 floors, 6 seats each
  const seatInFloor = (i % 6) + 1;
  const seatNumber = `S${seatInFloor}`; // Seat number within floor e.g., S1, S2
  const studentAssigned = mockStudentsInitial.find(s => s.tempSeatNumber === `F${floorNumber}-${seatNumber}`);
  return {
    id: `seat-f${floorNumber}-s${seatInFloor}`, // Globally unique seat ID
    seatNumber, // Number like "S1", "S2"
    floor: `Floor ${floorNumber}`, // Floor identifier
    isOccupied: !!studentAssigned,
    studentId: studentAssigned?.id,
    studentName: studentAssigned?.fullName,
  };
});

// Populate student seatIds from mockSeats
export const mockStudents: Student[] = mockStudentsInitial.map(sInit => {
    const assignedSeat = mockSeats.find(seat => seat.studentId === sInit.id);
    const { tempSeatNumber, ...studentData } = sInit;
    return {
        ...studentData,
        seatId: assignedSeat?.id,
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


// Simulate database operations
export const getStudents = async (): Promise<Student[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockStudents.map(s => ({...s})); // Return copies
};

export const getStudentById = async (id: string): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const student = mockStudents.find(s => s.id === id);
  return student ? {...student} : undefined;
};

export const addStudent = async (studentData: Omit<Student, 'id'>): Promise<Student> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const newStudent: Student = { ...studentData, id: String(Date.now()) };
  mockStudents.push(newStudent);
  
  if (newStudent.seatId) {
    const seat = mockSeats.find(s => s.id === newStudent.seatId);
    if (seat) {
      if (seat.isOccupied) throw new Error("Seat already occupied");
      seat.isOccupied = true;
      seat.studentId = newStudent.id;
      seat.studentName = newStudent.fullName;
    } else {
      // seatId provided but seat not found, invalidate assignment
      newStudent.seatId = undefined; 
    }
  }
  return {...newStudent};
};

export const updateStudent = async (id: string, updates: Partial<Omit<Student, 'id'>>): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const studentIndex = mockStudents.findIndex(s => s.id === id);
  if (studentIndex === -1) return undefined;

  const originalStudentData = { ...mockStudents[studentIndex] };
  
  // Determine the new seatId; if seatId is not in updates, it means no change to seat assignment was intended through this update.
  // updates.seatId will be a string ID if a seat is chosen, or undefined if "No Seat" was chosen in the form.
  const newSeatId = updates.hasOwnProperty('seatId') ? updates.seatId : originalStudentData.seatId;
  const oldSeatId = originalStudentData.seatId;

  if (newSeatId !== oldSeatId) {
    // Vacate old seat if there was one
    if (oldSeatId) {
      const oldSeat = mockSeats.find(s => s.id === oldSeatId);
      if (oldSeat) {
        oldSeat.isOccupied = false;
        oldSeat.studentId = undefined;
        oldSeat.studentName = undefined;
      }
    }
    // Occupy new seat if newSeatId is a valid ID (i.e., not undefined)
    if (newSeatId) {
      const newSeat = mockSeats.find(s => s.id === newSeatId);
      if (!newSeat) {
        // This case should ideally be prevented by form validation if newSeatId is from user input.
        // If it still happens, it indicates a data inconsistency or a non-existent seatId was provided.
        // Revert student's seatId to oldSeatId or handle as an error. For now, log and prevent assignment.
        console.error(`Seat with ID ${newSeatId} not found during student update. Student ${id} will not be assigned to this seat.`);
        // Ensure the student's seatId in `updates` reflects this problem, or remove it to keep old seat.
        // For simplicity, we'll proceed with other updates but the student's seatId won't change to the new, invalid one.
        if (updates.hasOwnProperty('seatId')) {
             updates.seatId = oldSeatId; // Or undefined if the intent was to unassign from a non-existent new seat
        }
      } else if (newSeat.isOccupied && newSeat.studentId !== id) {
        throw new Error(`Seat ${newSeat.seatNumber} on ${newSeat.floor} is already occupied by ${newSeat.studentName}.`);
      } else {
        newSeat.isOccupied = true;
        newSeat.studentId = id;
        newSeat.studentName = updates.fullName || originalStudentData.fullName; // Use updated name if provided
      }
    }
  }

  // Apply all updates to the student record.
  // The `updates` object will have `seatId` as either a valid ID or `undefined`.
  mockStudents[studentIndex] = { ...originalStudentData, ...updates };

  return { ...mockStudents[studentIndex] };
};


export const getSeats = async (): Promise<Seat[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  mockSeats.sort((a, b) => {
    if (a.floor < b.floor) return -1;
    if (a.floor > b.floor) return 1;
    // Attempt to sort seat numbers numerically if possible, then alphabetically
    const aNum = parseInt(a.seatNumber.replace(/[^0-9]/g, ''), 10);
    const bNum = parseInt(b.seatNumber.replace(/[^0-9]/g, ''), 10);
    const aPrefix = a.seatNumber.replace(/[0-9]/g, '');
    const bPrefix = b.seatNumber.replace(/[0-9]/g, '');

    if (aPrefix === bPrefix && !isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
    }
    return a.seatNumber.localeCompare(b.seatNumber);
  });
  return mockSeats.map(s => ({...s}));
};

export const getSeatById = async (id: string): Promise<Seat | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const seat = mockSeats.find(s => s.id === id);
  return seat ? {...seat} : undefined;
};

export const addSeat = async (seatData: { seatNumber: string; floor: string }): Promise<Seat> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const existing = mockSeats.find(s => s.seatNumber === seatData.seatNumber && s.floor === seatData.floor);
  if (existing) {
    throw new Error(`Seat ${seatData.seatNumber} already exists on ${seatData.floor}.`);
  }
  const newSeat: Seat = {
    id: `seat-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
    seatNumber: seatData.seatNumber,
    floor: seatData.floor,
    isOccupied: false,
  };
  mockSeats.push(newSeat);
  return {...newSeat};
};

export const updateSeatDetails = async (id: string, updates: { seatNumber?: string; floor?: string }): Promise<Seat | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const seatIndex = mockSeats.findIndex(s => s.id === id);
  if (seatIndex === -1) return undefined;

  const currentSeat = mockSeats[seatIndex];
  const newSeatNumber = updates.seatNumber || currentSeat.seatNumber;
  const newFloor = updates.floor || currentSeat.floor;

  if (newSeatNumber !== currentSeat.seatNumber || newFloor !== currentSeat.floor) {
    const existing = mockSeats.find(s => s.id !== id && s.seatNumber === newSeatNumber && s.floor === newFloor);
    if (existing) {
      throw new Error(`Another seat with number ${newSeatNumber} already exists on ${newFloor}.`);
    }
  }
  
  mockSeats[seatIndex] = { ...currentSeat, ...updates };
  // If seat details change, and it's occupied, update studentName on seat (if student exists)
  if (mockSeats[seatIndex].isOccupied && mockSeats[seatIndex].studentId) {
      const student = mockStudents.find(s => s.id === mockSeats[seatIndex].studentId);
      if (student) {
          mockSeats[seatIndex].studentName = student.fullName;
      }
  }
  return {...mockSeats[seatIndex]};
};

export const deleteSeat = async (id: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const seatIndex = mockSeats.findIndex(s => s.id === id);
  if (seatIndex === -1) return false;
  
  const seatToDelete = mockSeats[seatIndex];
  if (seatToDelete.isOccupied && seatToDelete.studentId) {
    const student = mockStudents.find(s => s.id === seatToDelete.studentId);
    if (student) {
      student.seatId = undefined;
    }
  }
  mockSeats.splice(seatIndex, 1);
  return true;
};

export const assignSeat = async (studentId: string, newSeatId: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const student = mockStudents.find(s => s.id === studentId);
  const newSeat = mockSeats.find(s => s.id === newSeatId);

  if (!student || !newSeat) return false;
  if (newSeat.isOccupied && newSeat.studentId !== studentId) { // Seat is occupied by someone else
      throw new Error(`Seat ${newSeat.seatNumber} on ${newSeat.floor} is already assigned to ${newSeat.studentName}.`);
  }


  // Vacate student's current seat (if any and different from newSeat)
  if (student.seatId && student.seatId !== newSeatId) {
    const oldSeat = mockSeats.find(s => s.id === student.seatId);
    if (oldSeat) {
      oldSeat.isOccupied = false;
      oldSeat.studentId = undefined;
      oldSeat.studentName = undefined;
    }
  }
  
  // Assign new seat to student
  newSeat.isOccupied = true;
  newSeat.studentId = studentId;
  newSeat.studentName = student.fullName;
  student.seatId = newSeat.id;
  return true;
};

export const unassignSeat = async (seatId: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const seat = mockSeats.find(s => s.id === seatId);
  if (!seat || !seat.isOccupied || !seat.studentId) return false;

  const student = mockStudents.find(s => s.id === seat.studentId);
  if (student) {
    student.seatId = undefined;
  }

  seat.isOccupied = false;
  seat.studentId = undefined;
  seat.studentName = undefined;
  return true;
};


export const getFeePlans = async (): Promise<FeePlan[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockFeePlans.map(fp => ({...fp}));
}

export const getFeePlanById = async (id: string): Promise<FeePlan | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const plan = mockFeePlans.find(p => p.id === id);
    return plan ? {...plan} : undefined;
};

export const addFeePlan = async (plan: Omit<FeePlan, 'id'>): Promise<FeePlan> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const newPlan : FeePlan = {...plan, id: String(Date.now())};
  mockFeePlans.push(newPlan);
  return {...newPlan};
}

export const updateFeePlan = async (id: string, updates: Partial<FeePlan>): Promise<FeePlan | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const planIndex = mockFeePlans.findIndex(p => p.id === id);
  if (planIndex === -1) return undefined;
  mockFeePlans[planIndex] = {...mockFeePlans[planIndex], ...updates};
  return {...mockFeePlans[planIndex]};
}

export const getPayments = async (): Promise<FeePayment[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockPayments.map(p => ({...p}));
}

export const addPayment = async (payment: Omit<FeePayment, 'id' | 'studentName'>): Promise<FeePayment> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const student = mockStudents.find(s => s.id === payment.studentId);
  if (!student) throw new Error("Student not found");

  const newPayment: FeePayment = { ...payment, id: String(Date.now()), studentName: student.fullName };
  mockPayments.push(newPayment);
  
  student.feesDue = Math.max(0, student.feesDue - payment.amount);
  if (student.feesDue === 0 && student.status === 'owing') {
    student.status = 'enrolled';
  }
  student.lastPaymentDate = newPayment.paymentDate;
  return {...newPayment};
}

export const markFeesAsPaid = async (studentId: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const student = mockStudents.find(s => s.id === studentId);
  if (!student) return false;
  student.feesDue = 0;
  if (student.status === 'owing') {
    student.status = 'enrolled';
  }
  student.lastPaymentDate = new Date().toISOString().split('T')[0]; // Today's date
  return true;
}


export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    totalStudents: mockStudents.filter(s => s.status !== 'inactive').length,
    totalSeats: mockSeats.length,
    availableSeats: mockSeats.filter(s => !s.isOccupied).length,
    monthlyIncome: mockPayments.reduce((sum, p) => {
      const paymentDate = new Date(p.paymentDate);
      const currentDate = new Date();
      if (paymentDate.getFullYear() === currentDate.getFullYear() && paymentDate.getMonth() === currentDate.getMonth()) {
        return sum + p.amount;
      }
      return sum;
    }, 0),
    feesDueToday: mockStudents.filter(s => s.status === 'owing' && s.feesDue > 0).length,
  };
}


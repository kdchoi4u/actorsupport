export interface Worker {
  id: string;
  name: string;
  role: string; // "worker" | "admin"
  defaultRecipientName?: string;
  defaultRecipientBirth?: string;
}

export interface Recipient {
  id: string;
  name: string;
  birth: string;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface DaySchedule {
  slot1: TimeSlot;
  break: TimeSlot;
  slot2: TimeSlot;
  categories: {
    physical: number;
    social: number;
    household: number;
    other: number;
  };
  totalHours: number;
}

export interface MonthlySchedule {
  id?: string;
  workerName: string;
  recipientName: string;
  recipientBirth: string;
  year: number;
  month: number;
  days: { [day: string]: DaySchedule };
  totals: {
    totalHours: number;
    physical: number;
    social: number;
    household: number;
    other: number;
  };
  submittedDate?: string;
  recipientSignature?: string;
}

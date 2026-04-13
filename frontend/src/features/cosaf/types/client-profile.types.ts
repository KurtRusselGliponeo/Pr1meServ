export interface ClientProfile {
  id: string;
  agentId: string;
  
  // Taglish: Pangalan ng client na naka-attach sa policy
  firstName: string;
  lastName: string;
  
  policyNumber: string;
  
  // Taglish: Ang premium value na kailangan ipasok ng exact as decimal(19,4) galing sa insurance records
  // We represent it as string or number on frontend depending on the decimal library used (like decimal.js or native number)
  annualPremium: string | number;
  
  createdAt: string | Date;
  updatedAt: string | Date;
  // Taglish: Para sa soft deletes (hindi mawawala sa DB permanently)
  deletedAtUtc?: string | Date | null;
}

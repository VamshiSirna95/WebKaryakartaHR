import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const bankData: Record<string, { bankAccountNo: string; bankName: string; bankIfsc: string; bankBranch: string }> = {
  E001: { bankAccountNo: "234501001234", bankName: "ICICI Bank", bankIfsc: "ICIC0001234", bankBranch: "Ameerpet Branch" },
  E002: { bankAccountNo: "412301005678", bankName: "Kotak Mahindra Bank", bankIfsc: "KKBK0000456", bankBranch: "Kukatpally Branch" },
  E003: { bankAccountNo: "520101009012", bankName: "State Bank of India", bankIfsc: "SBIN0001234", bankBranch: "Secunderabad Branch" },
  E004: { bankAccountNo: "501001003456", bankName: "HDFC Bank", bankIfsc: "HDFC0001234", bankBranch: "Begumpet Branch" },
  E005: { bankAccountNo: "234501007890", bankName: "ICICI Bank", bankIfsc: "ICIC0001234", bankBranch: "Ameerpet Branch" },
  E006: { bankAccountNo: "412301001234", bankName: "Kotak Mahindra Bank", bankIfsc: "KKBK0000456", bankBranch: "Kukatpally Branch" },
  E007: { bankAccountNo: "890101005678", bankName: "Bank of Baroda", bankIfsc: "BARB0HYDERA", bankBranch: "Hyderabad Branch" },
  E008: { bankAccountNo: "234502001234", bankName: "ICICI Bank", bankIfsc: "ICIC0002345", bankBranch: "Dilsukhnagar Branch" },
  E009: { bankAccountNo: "412302005678", bankName: "Kotak Mahindra Bank", bankIfsc: "KKBK0000789", bankBranch: "Mehdipatnam Branch" },
  E010: { bankAccountNo: "501002003456", bankName: "HDFC Bank", bankIfsc: "HDFC0002345", bankBranch: "LB Nagar Branch" },
  E011: { bankAccountNo: "520102009012", bankName: "State Bank of India", bankIfsc: "SBIN0002345", bankBranch: "Koti Branch" },
  E012: { bankAccountNo: "234502007890", bankName: "ICICI Bank", bankIfsc: "ICIC0002345", bankBranch: "Dilsukhnagar Branch" },
  E013: { bankAccountNo: "520101003456", bankName: "State Bank of India", bankIfsc: "SBIN0001234", bankBranch: "Secunderabad Branch" },
  E014: { bankAccountNo: "678901001234", bankName: "Indian Bank", bankIfsc: "IDIB000H001", bankBranch: "Hyderabad Branch" },
  E015: { bankAccountNo: "345601001234", bankName: "Canara Bank", bankIfsc: "CNRB0001234", bankBranch: "Hyderabad Branch" },
};

async function main() {
  console.log("Seeding bank details for all employees...");

  for (const [code, bank] of Object.entries(bankData)) {
    const result = await db.employee.updateMany({
      where: { employeeCode: code },
      data: bank,
    });
    if (result.count > 0) {
      console.log(`  v ${code}: ${bank.bankName}`);
    } else {
      console.log(`  x ${code}: employee not found`);
    }
  }

  console.log("Bank details seeded successfully.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

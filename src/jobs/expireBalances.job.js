import cron from "node-cron";
import prisma from "../config/db.js";
import { getEmployeeBalance } from "../services/balance.service.js";
import { auditLog } from "../middleware/auditLogger.js";

const expireBalances = async () => {
  console.log("Running balance expiry job...");

  try {
    const employees = await prisma.users.findMany({
      where: {
        is_active: true,
        user_roles: {
          some: {
            roles: { name: "employee" },
          },
        },
      },
    });

    for (const employee of employees) {
      const balance = await getEmployeeBalance(employee.id);

      if (balance > 0) {
        await prisma.balance_transactions.create({
          data: {
            user_id: employee.id,
            amount: balance,
            transaction_type: "expiration",
            reference_note: `Balance expired at end of month`,
          },
        });

        await prisma.notifications.create({
          data: {
            user_id: employee.id,
            title: "Balance Expired",
            message: `Your unused meal balance of ${balance} ETB has expired.`,
          },
        });

        await auditLog({
          actorId: null,
          actorRole: "system",
          action: "BALANCE_EXPIRED",
          targetTable: "balance_transactions",
          targetId: employee.id,
          metadata: { expired_amount: balance },
        });

        console.log(
          `Expired ${balance} ETB for employee ${employee.employee_external_id}`,
        );
      }
    }

    console.log("Balance expiry job completed.");
  } catch (error) {
    console.error("Balance expiry job error:", error);
  }
};

// Runs at 23:59 on the last day of every month
export const startExpireBalancesJob = () => {
  cron.schedule("59 23 28-31 * *", async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (tomorrow.getMonth() !== today.getMonth()) {
      await expireBalances();
    }
  });

  console.log("Balance expiry cron job scheduled.");
};

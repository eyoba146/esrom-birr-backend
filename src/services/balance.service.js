import prisma from "../config/db.js";

export const getEmployeeBalance = async (userId) => {
  const transactions = await prisma.balance_transactions.findMany({
    where: { user_id: userId },
  });

  const balance = transactions.reduce((total, transaction) => {
    if (
      transaction.transaction_type === "allocation" ||
      transaction.transaction_type === "refund"
    ) {
      return total + Number(transaction.amount);
    } else {
      return total - Number(transaction.amount);
    }
  }, 0);

  return Math.max(0, balance);
};

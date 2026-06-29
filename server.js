import app from "./src/app.js";
import { startExpireBalancesJob } from "./src/jobs/expireBalances.job.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startExpireBalancesJob();
});

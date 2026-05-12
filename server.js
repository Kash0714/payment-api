require("dotenv").config();
const app = require("./src/app");


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🚀 LeadMax Payment API running on port ${PORT}`);
  console.log(`📋 Health: http://localhost:${PORT}/health`);
  console.log(`📌 Base URL: http://localhost:${PORT}/api/v1\n`);
});

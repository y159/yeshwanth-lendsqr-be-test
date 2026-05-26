import app from "./app";
import database from "./config/database";

const PORT = process.env.PORT || 5050;

const startServer = async () => {
  try {
    await database.migrate.latest();
    console.log("✅ Migrations ran successfully");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

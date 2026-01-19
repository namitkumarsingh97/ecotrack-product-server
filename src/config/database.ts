import mongoose from "mongoose";

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    // Validate MongoDB URI is set
    if (!mongoUri) {
      console.error("❌ MONGODB_URI is not set in environment variables!");
      console.error("\n💡 SOLUTION: Add MONGODB_URI to your .env file:");
      console.error("   MONGODB_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/ecotrack-india?retryWrites=true&w=majority\n");
      process.exit(1);
    }

    // Validate connection string format
    if (!mongoUri.includes('mongodb://') && !mongoUri.includes('mongodb+srv://')) {
      console.error("❌ Invalid MongoDB connection string format!");
      console.error("   Connection string should start with 'mongodb://' or 'mongodb+srv://'\n");
      process.exit(1);
    }

    // Connection options for better reliability (optimized for Atlas)
    const options: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 10000, // Increased timeout for Atlas
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
      retryWrites: true, // Enable retryable writes
    };

    console.log("🔄 Connecting to MongoDB Atlas...");
    // Hide credentials in logs - show only cluster info
    const maskedUri = mongoUri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");
    console.log(`📍 Cluster: ${maskedUri.split('@')[1]?.split('/')[0] || '***'}`);

    await mongoose.connect(mongoUri, options);

    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.name}`);
  } catch (error: any) {
    console.error("❌ MongoDB connection error:", error.message);

    // Provide helpful error messages for Atlas-specific issues
    if (error.message.includes("IP") || error.message.includes("whitelist") || error.message.includes("ReplicaSetNoPrimary")) {
      console.error("\n🔴 MONGODB ATLAS CONNECTION FAILED");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("\n💡 SOLUTION: Whitelist your IP address in MongoDB Atlas");
      console.error("\n📋 Step-by-step fix:");
      console.error("   1. Go to: https://cloud.mongodb.com/");
      console.error("   2. Select your cluster");
      console.error("   3. Click 'Network Access' in the left sidebar");
      console.error("   4. Click 'Add IP Address' button");
      console.error("   5. Click 'Add Current IP Address' (recommended)");
      console.error("      OR add '0.0.0.0/0' to allow all IPs (development only)");
      console.error("   6. Click 'Confirm'");
      console.error("   7. Wait 1-2 minutes for changes to propagate");
      console.error("\n🔄 Then run: npm run seed");
      console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    } else if (error.message.includes("authentication") || error.message.includes("bad auth")) {
      console.error("\n🔴 AUTHENTICATION FAILED");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("\n💡 SOLUTION: Check your MongoDB Atlas credentials");
      console.error("\n📋 Verify in your .env file:");
      console.error("   ✓ Username is correct (database user, not Atlas account email)");
      console.error("   ✓ Password is correct (URL-encoded if special characters)");
      console.error("   ✓ Connection string format is correct");
      console.error("\n📋 To fix:");
      console.error("   1. Go to Atlas → Database Access");
      console.error("   2. Verify your database user exists");
      console.error("   3. Reset password if needed");
      console.error("   4. Update MONGODB_URI in .env with correct credentials");
      console.error("\n📝 Connection string format:");
      console.error("   mongodb+srv://USERNAME:PASSWORD@cluster.xxxxx.mongodb.net/DATABASE?retryWrites=true&w=majority");
      console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    } else if (error.message.includes("ECONNREFUSED") || error.message.includes("ENOTFOUND")) {
      console.error("\n🔴 CONNECTION REFUSED");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("\n💡 SOLUTION: Check your connection string and network");
      console.error("\n📋 Verify:");
      console.error("   ✓ MONGODB_URI is set correctly in .env");
      console.error("   ✓ Cluster address is correct");
      console.error("   ✓ Internet connection is active");
      console.error("   ✓ Firewall is not blocking MongoDB ports");
      console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    } else {
      console.error("\n🔴 UNKNOWN ERROR");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("\n💡 Check:");
      console.error("   ✓ MONGODB_URI is set in .env file");
      console.error("   ✓ Connection string format is correct");
      console.error("   ✓ Atlas cluster is running (check Atlas dashboard)");
      console.error("   ✓ Network access is configured");
      console.error("\n📚 See: backend/MONGODB_SETUP.md for detailed help");
      console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    }

    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  console.log("⚠️  MongoDB disconnected");
});

mongoose.connection.on("error", (error) => {
  console.error("❌ MongoDB error:", error);
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected");
});

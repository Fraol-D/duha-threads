/**
 * Test script to verify MongoDB connection and Custom Order system
 * Run with: node test-db-connection.js
 */

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://fraolashebir84:67tfWBkn10QWP81t@nodetest.6founly.mongodb.net/tshirt_app?retryWrites=true&w=majority&appName=nodeTest";
if (!process.env.MONGODB_URI) {
  console.log(
    "ℹ️ Using hardcoded fallback connection string. Set MONGODB_URI in .env.local to override."
  );
}

async function testConnection() {
  console.log("🔌 Testing MongoDB connection...\n");

  const mongoose = (await import("mongoose")).default;

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("🌐 Host:", mongoose.connection.host);

    // List existing collections
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log("\n📚 Existing collections:");
    if (collections.length === 0) {
      console.log("   (none - this is normal for a new database)");
    } else {
      collections.forEach((col) => {
        console.log(`   - ${col.name}`);
      });
    }

    // Test a simple query
    const collectionNames = collections.map((c) => c.name);
    if (collectionNames.includes("customorders")) {
      const count = await mongoose.connection.db
        .collection("customorders")
        .countDocuments();
      console.log(`\n🎨 Custom Orders count: ${count}`);
    }

    if (collectionNames.includes("products")) {
      const count = await mongoose.connection.db
        .collection("products")
        .countDocuments();
      console.log(`👕 Products count: ${count}`);
    }

    if (collectionNames.includes("users")) {
      const count = await mongoose.connection.db
        .collection("users")
        .countDocuments();
      console.log(`👤 Users count: ${count}`);
    }

    console.log("\n✨ Database is ready for use!");
    console.log("\n📋 Next steps:");
    console.log(
      "   1. Visit http://localhost:3000/api/health to verify API connection"
    );
    console.log("   2. Create a user account at http://localhost:3000/signup");
    console.log("   3. Add some products (or seed sample data)");
    console.log(
      "   4. Test Custom Order flow at http://localhost:3000/custom-order"
    );
    console.log(
      "   5. Admin panel at http://localhost:3000/admin/custom-orders"
    );
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Connection closed.");
  }
}

testConnection();

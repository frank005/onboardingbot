import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  try {
    console.log("Testing Blobs functionality...");
    
    const store = getStore({ name: "auth" });
    console.log("Store created successfully");
    
    // Try to set a simple value
    await store.set("test-key", "test-value");
    console.log("Set operation successful");
    
    // Try to get the value back
    const value = await store.get("test-key");
    console.log("Get operation successful, value:", value);
    
    // Try to set JSON
    const testData = { users: [], codes: [], revokedAfter: {} };
    await store.setJSON("test-json", testData);
    console.log("SetJSON operation successful");
    
    // Try to get JSON back
    const jsonData = await store.get("test-json", { type: "json" });
    console.log("GetJSON operation successful, data:", jsonData);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "All Blobs operations successful",
        testValue: value,
        testJson: jsonData
      })
    };
    
  } catch (error) {
    console.error("Blobs test failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};

export const handler = async (event) => {
  console.log("Simple test function called");
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      message: "Simple test function working",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      netlify: !!process.env.NETLIFY
    })
  };
};

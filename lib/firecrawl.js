import FirecrawlApp from "@mendable/firecrawl-js";

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

export async function scrapeProduct(url) {
  try {
    const extract =
      typeof firecrawl.extract === "function"
        ? firecrawl.extract.bind(firecrawl)
        : null;

    if (typeof extract !== "function") {
      throw new Error("Firecrawl client does not expose an extract method");
    }

    const result = await extract({
      urls: [url],
      prompt:
        "Extract the product name as 'productName', current price as a number as 'currentPrice', currency code (USD, EUR, etc) as 'currencyCode', and product image URL as 'productImageUrl' if available",
      schema: {
        type: "object",
        properties: {
          productName: { type: "string" },
          currentPrice: { type: "number" },
          currencyCode: { type: "string" },
          productImageUrl: { type: "string" },
        },
        required: ["productName", "currentPrice"],
      },
    });

    const extractedData = result?.data?.[0] ?? result?.data;

    if (!extractedData || !extractedData.productName) {
      throw new Error("No data extracted from URL");
    }

    return extractedData;
  } catch (error) {
    console.error("Firecrawl scrape error:", error);
    throw new Error(`Failed to scrape product: ${error.message}`);
  }
}
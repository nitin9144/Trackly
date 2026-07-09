"use server";

import { createClient } from "@/utils/supabase/server";
import { scrapeProduct } from "@/lib/firecrawl";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addProduct(formData) {
  const url = formData.get("url");

  if (!url) {
    return { error: "URL is required" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // Scrape product data with Firecrawl
    const productData = await scrapeProduct(url);

    if (!productData.productName || !productData.currentPrice) {
      console.log(productData, "productData");
      return { error: "Could not extract product information from this URL" };
    }

    const newPrice = parseFloat(productData.currentPrice);
    const currency = productData.currencyCode || "USD";

    // Check if product exists to determine if it's an update
    const { data: existingProduct, error: existingError } = await supabase
      .from("products")
      .select("id, current_price")
      .eq("user_id", user.id)
      .eq("url", url)
      .maybeSingle();

    if (existingError) throw existingError;

    const isUpdate = !!existingProduct;
    const productPayload = {
      user_id: user.id,
      url,
      name: productData.productName,
      current_price: newPrice,
      currency,
      image_url: productData.productImageUrl,
      updated_at: new Date().toISOString(),
    };

    let product;
    let productError;

    if (isUpdate) {
      const result = await supabase
        .from("products")
        .update(productPayload)
        .eq("id", existingProduct.id)
        .select()
        .single();

      product = result.data;
      productError = result.error;
    } else {
      const result = await supabase
        .from("products")
        .insert(productPayload)
        .select()
        .single();

      product = result.data;
      productError = result.error;
    }

    if (productError) throw productError;

    // Add to price history if it's a new product OR price changed
    const shouldAddHistory =
      !isUpdate || existingProduct.current_price !== newPrice;

    if (shouldAddHistory) {
      await supabase.from("price_history").insert({
        product_id: product.id,
        price: newPrice,
        currency: currency,
      });
    }

    revalidatePath("/");
    return {
      success: true,
      product,
      message: isUpdate
        ? "Product updated with latest price!"
        : "Product added successfully!",
    };
  } catch (error) {
    console.error("Add product error:", error);
    return { error: error.message || "Failed to add product" };
  }
}

export async function deleteProduct(productId) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) throw error;

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

export async function getProducts() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Get products error:", error);
    return [];
  }
}

export async function getPriceHistory(productId) {
  try {
    const supabase = await createClient();

    // Try direct lookup first (productId should match the stored product_id)
    console.log("getPriceHistory called with productId:", productId);
    let { data, error } = await supabase
      .from("price_history")
      .select("*")
      .eq("product_id", productId)
      .order("checked_at", { ascending: true });

    if (error) throw error;

    // If no history found, it's possible the incoming `productId` is a different
    // representation (e.g. numeric vs uuid). Try resolving the product row and
    // re-querying using the canonical `id` from the `products` table.
    if ((!data || data.length === 0) && productId != null) {
      const { data: productRow } = await supabase
        .from("products")
        .select("id")
        .eq("id", productId)
        .maybeSingle();

      // If the direct id lookup didn't match, try matching by text form
      // (helps when types differ between client and DB)
      let resolvedId = productRow?.id;
      if (!resolvedId) {
        const { data: productByText } = await supabase
          .from("products")
          .select("id")
          .eq("id::text", String(productId))
          .maybeSingle();
        resolvedId = productByText?.id;
      }

      if (resolvedId) {
        console.log("Resolved product id to:", resolvedId);
        const retry = await supabase
          .from("price_history")
          .select("*")
          .eq("product_id", resolvedId)
          .order("checked_at", { ascending: true });

        if (retry.error) throw retry.error;
        data = retry.data || [];
      }
    }

    console.log("price_history rows found:", (data || []).length);
    return data || [];
  } catch (error) {
    console.error("Get price history error:", error);
    return [];
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}
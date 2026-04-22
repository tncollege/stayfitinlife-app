exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, message: "Method not allowed" }),
    };
  }

  try {
    const { barcode } = JSON.parse(event.body || "{}");
    if (!barcode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, message: "Missing barcode" }),
      };
    }

    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}`, {
      headers: {
        "User-Agent": "Stayfitinlife/6.3 (support@stayfitinlife.com)"
      }
    });
    const json = await response.json();

    if (!response.ok || !json || !json.product) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: false, message: "Product not found." }),
      };
    }

    const p = json.product;
    const n = p.nutriments || {};
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        product: {
          name: p.product_name || p.product_name_en || "Scanned product",
          brand: p.brands || "",
          kcal: Number(n["energy-kcal_100g"] || n["energy-kcal"] || 0),
          protein: Number(n["proteins_100g"] || 0),
          carbs: Number(n["carbohydrates_100g"] || 0),
          fats: Number(n["fat_100g"] || 0),
          unitLabel: "100 g",
          barcode
        }
      }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: false, message: "Barcode lookup failed." }),
    };
  }
};

// routes/adyen.js
const express = require("express");
const router = express.Router();

router.post("/sessions", async (req, res) => {
  const response = await fetch(
    "https://checkout-test.adyen.com/v71/sessions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.ADYEN_API_KEY,
      },
      body: JSON.stringify({
        merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
        amount: { currency: "GBP", value: 10000 },
        returnUrl: "http://localhost:3000/return",
        reference: `order_${Date.now()}`,
        countryCode: "GB",
        channel: "Web",
      }),
    }
  );

  const data = await response.json();
  res.status(response.status).json(data);
});

module.exports = router;
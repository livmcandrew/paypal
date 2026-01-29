// checkout.js - sever side 
const express = require("express");
const braintree = require("braintree");
const dotenv = require("dotenv").config();
const vaultStore = new Map(); // key: yourUserId/email, value: { customerId, paymentMethodToken }

const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BT_MERCHANT_ID,
  publicKey: process.env.BT_PUBLIC_KEY,
  privateKey: process.env.BT_PRIVATE_KEY,
});

const router = express.Router();

// GET Token API to reteive client token
router.get("/", (req, res) => {
  gateway.clientToken.generate({merchantAccountId: "liv_gbp" }, (err, response) => {
    if (err) {
      console.error("clientToken.generate error:", err);
      return res.status(500).send({ error: err.message || err });
    }
    return res.send(response.clientToken);
  });
});

// GET transcation.sale API to make sale
router.post("/", (req, res) => {
  const { paymentMethodNonce, deviceData, amount, storeInVault } = req.body;

  gateway.transaction.sale(
    {
      deviceData,
      paymentMethodNonce,
      amount,
      merchantAccountId: "liv_gbp",
      options: {
        submitForSettlement: true,
        storeInVaultOnSuccess: !!storeInVault, // vault only when asked
      },
    },
    (error, result) => {
      if (error || !result?.success) {
        return res.status(500).send({
          success: false,
          error: error?.message || result?.message || error,
          result,
        });
      }
      const vaultedCardToken = result.transaction?.creditCard?.token || result.transaction?.paypalAccount?.token || null;

      return res.send({
        success: true,
        transactionId: result.transaction.id,
        vaultedCardToken,
        cardType: result.transaction?.creditCard?.cardType || null,
        last4: result.transaction?.creditCard?.last4 || null,
        customerId: result.transaction?.customer?.id || result.transaction?.customerId || null,
        result, // optional, can remove if too big
      });
    }
  );
});


// Checkout with Vault Endpoint 
router.post("/vaultWithCheckout", express.json(), (req, res) => {
  const { paymentMethodNonce, amount, email} = req.body;

  gateway.transaction.sale({
    amount,
    paymentMethodNonce,
    merchantAccountId: "liv_gbp", 
    //lineItems: lineItems,
    customer: {
      firstName: "Checkout",
      lastName: "WithVault",
    }, 
    options:{
      submitForSettlement: true,
      storeInVaultOnSuccess: true //vaults the method
    }
  }, (err, result) => {
    if (err || !result.success){
      return res.status(500).send({error: err || result.message});
    }

    const paymentMethodToken = result.transaction?.creditCard?.token || result.transaction?.paypalAccount?.token;
    // BT will create a customer and associate it
    const customerId = result.transaction.customer?.id || result.transaction.customerId;
    if (email && paymentMethodToken && customerId) {
        vaultStore.set(email, { customerId, paymentMethodToken });
      }


    // Successful response which is seen in the network response for 'vault-and-checkout'
    res.send({
      success: true,
      transactionId: result.transaction.id,
      paymentMethodToken,
      customerId,
      result,
    })
  });
});

// Fetch Vaulted customer
router.get("/vaultedPaymentMethod/:token", (req, res) => {
  const { token } = req.params;

  gateway.paymentMethod.find(token, (err, paymentMethod) => {
    if (err) {
      return res.status(404).send({ error: err.message || err });
    }

    // This object shape depends on type: creditCard vs paypalAccount
    // We'll normalize a small display payload:
    const isCard = paymentMethod?.maskedNumber || paymentMethod?.last4;

    res.send({
      success: true,
      type: paymentMethod?.cardType ? "creditCard" : "paypal",
      last4: paymentMethod?.last4 || (paymentMethod?.maskedNumber ? paymentMethod.maskedNumber.slice(-4) : null),
      maskedNumber: paymentMethod?.maskedNumber || null,
      cardType: paymentMethod?.cardType || null,
      email: paymentMethod?.email || null, // PayPal may have email
    });
  });
});

// Charge using a vaulted paymentMethodToken
router.post("/chargeVaulted", express.json(), (req, res) => {
  const { paymentMethodToken, amount } = req.body;

  gateway.transaction.sale(
    {
      amount,
      paymentMethodToken, 
      merchantAccountId: "liv_gbp",
      options: { submitForSettlement: true },
    },
    (err, result) => {
      if (err || !result?.success) {
        return res.status(500).send({ success: false, error: err?.message || result?.message || err });
      }
      res.send({ success: true, transactionId: result.transaction.id, result });
    }
  );
});

module.exports = router;
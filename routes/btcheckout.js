// checkout.js - sever side 
const express = require("express");
const braintree = require("braintree");
const dotenv = require("dotenv").config();

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
  const { paymentMethodNonce, deviceData, amount, merchantAccountId } =
    req.body;
  gateway.transaction.sale(
    {
      deviceData: deviceData,
      paymentMethodNonce: paymentMethodNonce,
      amount: amount,
      merchantAccountId: "liv_gbp",
      options: {
        submitForSettlement: true,
      },
    },
    (error, result) => {
      if (result) {
        res.send(result);
      } else {
        res.status(500).send(error);
        console.log(error);
      }
    }
  );
});

// Checkout with Vault Endpoint 
router.post("/vaultWithCheckout", express.json(), (req, res) => {
  const { paymentMethodNonce, amount, lineItems} = req.body;

  gateway.transaction.sale({
    amount,
    paymentMethodNonce,
    merchantAccountId: "liv_gbp", 
    //lineItems: lineItems,
    customer: {
      firstName: "Checkout",
      lastName: "WithVault",
      id: ""
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

    // Successful response which is seen in the network response for 'vault-and-checkout'
    res.send({
      success: true,
      transactionId: result.transaction.id,
      paymentMethodToken,
      customerID: result.transaction.id || null,
      result,
    })
  });
});

module.exports = router;
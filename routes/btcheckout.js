// checkout.js - sever side 
const express = require("express");
const braintree = require("braintree");
const { resolve } = require("path");
const { rejects } = require("assert");
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
router.post("/",  express.json(), (req, res) => {
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

      // For vaulted payments - stores values in storage
      const paymentMethodToken =
        result.transaction?.creditCard?.token ||
        result.transaction?.paypalAccount?.token ||
        null;

      const customerId =
        result.transaction?.customer?.id ||
        result.transaction?.customerId ||
        null;

      return res.send({
        success: true,
        transactionId: result.transaction.id,
        paymentMethodToken,
        customerId,
        result,
      });
    }
  );
});

// GET transcation.sale API with AFT params to make sale 
router.post("/AFTsale", (req, res) => {
  const { paymentMethodNonce, deviceData, amount } = req.body;

  gateway.transaction.sale(
    {
      deviceData,
      paymentMethodNonce,
      amount,
      merchantAccountId: "liv_gbp",
      options: {
        submitForSettlement: true
      },
      transfer: {
        type: "account_to_account",
        sender: {
          firstName: "Alice",
          middleName: "A",
          lastName: "Silva",
          accountReferenceNumber: "1000012345",
          address: {
            streetAddress: "1st Main Road",
            locality: "Los Angeles",
            region: "CA",
            countryCodeAlpha2: "GB",
          },
        },
        receiver: {
          firstName: "Merchant",
          middleName: "A",
          lastName: "Account",
          address: {
            streetAddress: "2nd Main Road",
            locality: "London",
            region: "Farringdon",
            countryCodeAlpha2: "GB",
          },
        },
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
        transactionType: result.transaction.type,
        vaultedCardToken,
        cardType: result.transaction?.creditCard?.cardType || null,
        last4: result.transaction?.creditCard?.last4 || null,
        customerId: result.transaction?.customer?.id || result.transaction?.customerId || null,
        result, // optional, can remove if too big
      });
    }
  );
});

// GET Token API to reteive client customer token {for vaulted PayPal payments}
router.post("/client_cust_token", express.json(), (req, res) => {
  const { customerId } = req.body;

  gateway.clientToken.generate(
    { customerId, 
      merchantAccountId: "liv_gbp"
     },
    (err, response) => {
      if (err) {
        console.error("client customer token error:", err);
        return res.status(500).send({ error: err.message || err });
      }

      res.send(response.clientToken); //returns Client Customer Token
      console.log("Inside Returning Customer flow");
      // console.log("customerId received:", customerId);
      // console.log("clientToken exists:", !!response?.clientToken);
    }
  );
});

// Checkout with Vault payment using created Customer ID 
router.post("/vaultWithCheckout", express.json(), (req, res) => {
  const { paymentMethodNonce, amount, customerId } = req.body;

  //call transaction.sale api
  function transactionSale(pmResult){
      const paymentMethodToken = pmResult.paymentMethod.token;

      // create the transaction using the token
      gateway.transaction.sale({
        amount,
        paymentMethodToken,
        merchantAccountId: "liv_gbp",
        customerId,
        options: {
          submitForSettlement: true,
        }
      }, (txErr, txResult) => {
        if (txErr || !txResult || !txResult.success) {
          console.error("transaction.sale error:", txErr || txResult);
          const message = (txResult && txResult.message) || (txErr && txErr.message) || "Transaction error";
          return res.status(500).json({ error: message });
        }

        // Success
        return res.json({
          success: true,
          transactionId: txResult.transaction.id,
          paymentMethodToken,
          customerId,
          result: txResult
        });
      });
  }

  // if the customer exist just create payment method inside the customer
  function createPaymentMethod() {
    gateway.paymentMethod.create({
      customerId,
      paymentMethodNonce,
      options: {
        verifyCard: true,
        makeDefault: true
      }
    }, (pmErr, pmResult) => {
      if (pmErr || !pmResult || !pmResult.success) {
        console.error("paymentMethod.create error:", pmErr || pmResult);
        const message = (pmResult && pmResult.message) || (pmErr && pmErr.message) || "Error creating payment method";
        return res.status(500).json({ error: message });
      }
      //make transaction.sale call
      transactionSale(pmResult);
    });
  }

  //Ensure customer exists (try find, if not found create)
  gateway.customer.find(customerId, (findErr, customer) => {

    //customer exists — go to create payment
    if (!findErr && customer) {
      //create payment method {inside function makes transaction}
      return createPaymentMethod(); 
    } else {

      // Customer Not found ->
      // create a customer with provided id
      gateway.customer.create({
        id: customerId,          // set a custom id
        firstName: "LIV",
        lastName: "WithVault"
      }, (createCustErr, createCustResult) => {
        if (createCustErr || !createCustResult || !createCustResult.success) {
          console.error("customer.create error:", createCustErr || createCustResult);
          const message = (createCustResult && createCustResult.message) || (createCustErr && createCustErr.message) || "Could not create customer";
          return res.status(500).json({ error: message });
        }

        //create payment method {inside function makes transaction}
        return createPaymentMethod(); 

      })
    }
  });
});

// Payment using a vaulted paymentMethodToken (instead of nonce)
router.post("/chargeVaulted", express.json(), (req, res) => {
  console.log("chargeVaulted body:", req.body);

  const { paymentMethodToken, amount, customerId } = req.body;

  gateway.transaction.sale(
    {
      amount,
      paymentMethodToken,
      customerId,
      merchantAccountId: "liv_gbp",
      options: { submitForSettlement: true },
    },
    (err, result) => {
      console.log("BT callback fired", { err: !!err, success: result?.success, message: result?.message });

      if (err) {
        return res.status(500).json({ success: false, err });
      }
      if (!result?.success) {
        return res.status(400).json({ success: false, result });
      }
      return res.json({ success: true, transactionId: result.transaction.id, result });
    }
  );
});

module.exports = router;
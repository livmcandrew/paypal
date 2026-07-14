let setAmount = "100";

fetch("/btcheckout")
    .then((response) => {
        return response.text();
    })
.then((client_token) => {
    braintree.client.create({
      authorization: client_token
    })
  .then(function (client) {
      return braintree.paypalCheckoutV6.create({ client: client });
  })
  .then(function (paypal) {
      return paypal.loadPayPalSDK().then(function () {
        return paypal;
    });
  })
  .then(function (paypal) {
    var session = paypal.createOneTimePaymentSession({
      amount: setAmount,
      currency: "GBP",
      intent: "capture",
      onApprove: function (data) {
        return paypal
            .tokenizePayment({
                payerID: data.payerId,
                orderID: data.orderId,
          })
          .then(async function (payload) {
              //console.log("Nonce:", payload.nonce);
            try {
                const response = await fetch("/btcheckout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    paymentMethodNonce: payload.nonce,
                    amount: setAmount,
                    })
                });

                const text = await response.text();
                let result;
                result = JSON.parse(text);
                console.log("Transaction response:", result);
            } 
            catch (error) {
                console.error("Error during transaction:", error);
                throw error;x
            }
          });
      },
    });
    document
      .getElementById("paypal-one-time-payment-button")
      .addEventListener("click", function () {
          session.start();
      });
  });
});
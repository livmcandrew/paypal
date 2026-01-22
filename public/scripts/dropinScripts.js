//Client Side implementation 
var submitButton = document.getElementById("submit-button");
var paypalButton = document.getElementById("paypal-button");
const setAmount = "150.00";
var threeDSecureParameters = {
    amount: setAmount,
    email: "test@example.com",
    billingAddress: {
        givenName: "Jill",
        surname: "Doe",
        phoneNumber: "8101234567",
        streetAddress: "555 Smith St.",
        extendedAddress: "#5",
        locality: "Oakland",
        region: "CA",
        postalCode: "12345",
        countryCodeAlpha2: "US",
    },
};
// Call 'payload.nonce' to your server
async function transactionPaymentNonce(payload, setAmount) {
  try {
    const response = await fetch("/btcheckout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethodNonce: payload.nonce,
        amount: setAmount,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    let result;
    result = JSON.parse(text);
    return result;
  } 
  catch (error) {
    console.error("Error during transaction:", error);
    // Handle network errors or JSON parsing errors
    throw error; // Re-throw to allow the caller to handle the error as needed
  }
};

fetch("/btcheckout")
    .then((response) => {
        return response.text();
    })
.then((client_token) => {
    //Drop in - CARDS 
    braintree.dropin.create(
    {
        // https://braintree.github.io/braintree-web-drop-in/docs/current/module-braintree-web-drop-in.html#.create
        authorization: client_token,
        container: "#dropin-container",
        dataCollector: true,
        amount: setAmount,
        merchantAccountId: "liv_gbp",
        // vault: { allowVaultCardOverride: true },
        threeDSecure: { authorization: client_token, version: 2 },
    },
    (componentError, instance) => {
        if (componentError) {
            console.log(componentError);
        }
        submitButton.addEventListener("click", (e) => {
        e.preventDefault();
        instance.requestPaymentMethod({
                threeDSecure: threeDSecureParameters },(
                    ReqPayMethodError, payload) => {
                        fetch("/btcheckout", {
                            method: "POST",
                            body: JSON.stringify({
                            paymentMethodNonce: payload.nonce,
                            //deviceData: deviceData,
                            amount: setAmount
                        }),
                        headers: {
                        "Content-Type": "application/json",
                        },
                    })
                    .then((response) => response.json())
                    .then((result) => {
                    instance.teardown((teardownErr) => {
                        if (teardownErr) {
                        console.error("Could not tear down Drop-in UI!");
                        } else {
                        console.info("Drop-in UI has been torn down!");
                        }
                    });
                    if (result.success) {
                        document.getElementById("divResponse").innerHTML = 
                        "<pre>Transaction successful\n\n" +
                        JSON.stringify(result, null, 4) +
                        "</pre>";
                    } else {
                        document.getElementById("divResponse").innerHTML = 
                        "<pre>Transaction failed\n\n" +
                        JSON.stringify(result, null, 4) +
                        "</pre>";
                    }
                });
            }
        );
        });
    }
    );

    // Create a client for PAYPAL Button
    braintree.client.create({
    authorization: client_token
    }, function (clientErr, clientInstance) {

    // Stop if there was a problem creating the client.
    // This could happen if there is a network error or if the authorization is invalid.
    if (clientErr) {
        console.error('Error creating client:', clientErr);
        return;
    }

    // Create a client.
    braintree.client.create({
        authorization: client_token
        }, function (clientErr, clientInstance) {

        // Stop if there was a problem creating the client.
        if (clientErr) {
            console.error('Error creating client:', clientErr);
            return;
        }

        // Create a PayPal Checkout component.
        braintree.paypalCheckout.create({
            client: clientInstance
            }, function (paypalCheckoutErr, paypalCheckoutInstance) {

                // Base PayPal SDK script options
                var loadPayPalSDKOptions = {
                    currency: 'GBP',  // Must match the currency passed in with createPayment
                    intent: 'capture', // Must match the intent passed in with createPayment
                    components: 'buttons,messages',
                    'enable-funding': 'paylater',
                    'buyer-country': 'GB',
                    dataAttributes: {
                        amount: setAmount,
                    },
                }

                //loadPayPalSDKOptions.commit = false
                
                // Stop if there was a problem creating PayPal Checkout.
                if (paypalCheckoutErr) {
                  console.error('Error creating PayPal Checkout:', paypalCheckoutErr);
                  return;
                }

                // Load the PayPal JS SDK
                paypalCheckoutInstance.loadPayPalSDK(loadPayPalSDKOptions, function () {
                
                    //ADD regular PAYPAL BUTTON
                    paypal.Buttons({
                        fundingSource: paypal.FUNDING.PAYPAL,

                        createOrder: function () {
                        var createPaymentRequestOptions = {
                            flow: 'checkout', // Required
                            intent: 'capture',
                            currency: 'GBP',
                            amount: setAmount,
                            //userAction: 'CONTINUE'
                        };

                        return paypalCheckoutInstance.createPayment(createPaymentRequestOptions);
                        },

                        onApprove: function (data, actions) {
                            // Return a promise that resolves/rejects when you're done
                            return new Promise((resolve, reject) => {
                                paypalCheckoutInstance.tokenizePayment(data, function (err, payload) {
                                if (err) {
                                    console.error("tokenizePayment error", err);
                                    document.getElementById("divResponse").innerHTML =
                                    "<pre>Tokenization failed\n\n" + JSON.stringify(err, null, 2) + "</pre>";
                                    return reject(err);
                                }
                                
                                // Call transcation API 
                                result = transactionPaymentNonce(payload, setAmount)

                                //SHOW RESPONSE
                                .then((result) => {
                                    document.getElementById("divResponse").innerHTML =
                                        "<pre>" +
                                        (result.success ? "Transaction successful" : "Transaction failed") +
                                        "\n\n" +
                                        JSON.stringify(result, null, 2) +
                                        "</pre>";
                                    resolve(result);
                                    })
                                    .catch((e) => {
                                        console.error("checkout error", e);
                                        document.getElementById("divResponse").innerHTML =
                                            "<pre>Checkout error\n\n" + (e && e.message ? e.message : String(e)) + "</pre>";
                                        reject(e);
                                    });
                                });
                            });
                        },

                        onCancel: function (data) {
                            console.log('PayPal payment cancelled', JSON.stringify(data, 0, 2));
                        },

                        onError: function (err) {
                            console.error('PayPal error', err);
                        }
                    }).render('#paypal-button').then(function () {
                            // The PayPal button will be rendered in an html element with the ID 'paypal-button'
                    });

                    //ADD the PAY LATER BUTTON
                    const payLater = paypal.Buttons({
                        fundingSource: paypal.FUNDING.PAYLATER,
                        createOrder: function () {
                            return paypalCheckoutInstance.createPayment({
                                flow: 'checkout',
                                intent: 'authorize',
                                currency: 'GBP',
                                amount: setAmount
                            });
                        },
                        onApprove: function (data, actions) {
                            return paypalCheckoutInstance.tokenizePayment(data, function (err, payload) {
                            // Submit 'payload.nonce' to your server
                            // Call transcation API 
                            result = transactionPaymentNonce(payload, setAmount)

                            //SHOW RESPONSE
                            
                            });
                        },
                        onError: function (err) {
                        console.error('PayPal error', err);
                        }
                    }).render('#pay-later-button');
                  
                });       
            });
        });
    });
});
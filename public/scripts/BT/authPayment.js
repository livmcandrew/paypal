//Client Side implementation 
var submitButton = document.getElementById("submit-button");
var paypalButton = document.getElementById("paypal-button");
var captureButton = document.getElementById("capture-button");
var payLaterButton = document.getElementById("pay-later-button");
var payLaterMessage = document.getElementById("pay-later-message");
const setAmount = "100.00";
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
// Call 'payload.nonce' to your Authorization API 
async function authTransactionPaymentNonce(payload, setAmount) {
  try {
    console.log("Initiating Auth transaction:");
    const response = await fetch("/btcheckout/auth", {
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
    return result;
  } 
  catch (error) {
    console.error("Error during transaction:", error);
    // Handle network errors or JSON parsing errors
    throw error; // Re-throw to allow the caller to handle the error as needed
  }
};

// Call submitForSettlement to Capture transaction API
async function transactionSubmitForSettlement(transactionId, setAmount) {
  try {
    const response = await fetch("/btcheckout/submitForSettlement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId,
        amount: setAmount,
      })
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
                        intent: 'authorize', // Must match the intent passed in with createPayment
                        components: 'buttons,messages',
                        commit: true,
                        'enable-funding': 'paylater',
                        'buyer-country': 'GB',
                        //commit: 'true',
                        dataAttributes: {
                            amount: setAmount,
                        },
                    }
                    
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
                            style: {
                                shape: "rect",
                                color: "gold",
                                label: "paypal"
                            },
                            createOrder: function () {
                            var createPaymentRequestOptions = {
                                flow: 'checkout', // Required
                                intent: 'authorize',
                                currency: 'GBP',
                                amount: setAmount,
                                //userAction: 'CONTINUE'
                            };

                            return paypalCheckoutInstance.createPayment(createPaymentRequestOptions);
                            },

                            onApprove: function (data, actions) {
                                return new Promise((resolve, reject) => {
                                    paypalCheckoutInstance.tokenizePayment(data, async function (err, payload) {
                                        if (err) {
                                            console.error("tokenizePayment error", err);
                                            document.getElementById("result-message").innerHTML =
                                                "<pre>Tokenization failed\n\n" + JSON.stringify(err, null, 2) + "</pre>";
                                            return reject(err);
                                        }

                                        // Authorize the transaction 
                                        try {
                                            const authResult = await authTransactionPaymentNonce(payload, setAmount);
                                            
                                            if (!authResult.success) {
                                                return reject(new Error("Authorization failed"));
                                            }

                                            // Store it for the capture button, don't capture yet
                                            pendingTransaction = { id: authResult.transactionId, amount: setAmount };
                                    
                                            console.log("Authorization successful, transaction ID:", pendingTransaction.id);
                                            captureButton.hidden = false;
                                            paypalButton.hidden = true;
                                            payLaterButton.hidden = true;
                                            payLaterMessage.hidden = true;

                                            resolve(authResult); 

                                        } catch (error) {
                                            console.error("Error during authorization:", error);
                                            reject(error);
                                        }

                                        //     // call capture API after 3 seconds delay
                                        //     setTimeout(async function () {
                                        //         console.log("Delaying for 3 seconds before calling capture API...");
                                        //         try {
                                        //             const captureResult = await transactionSubmitForSettlement(authResult.transactionId, setAmount);
                                        //             if (captureResult.success) {
                                        //                 console.log(captureResult);
                                        //                 resolve(captureResult);
                                        //             }
                                        //         } catch (error) {
                                        //             console.error("Error during transaction:", error);
                                        //             reject(error);
                                        //         }
                                        //     }, 3000);
                                        // })
                                        // .catch((e) => {
                                        //     console.error("checkout error", e);
                                        //     document.getElementById("result-message").innerHTML =
                                        //         "<pre>Checkout error\n\n" + (e && e.message ? e.message : String(e)) + "</pre>";
                                        //     reject(e);
                                        // });
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
                            style: {
                                shape: "rect",
                                color: "gold",
                                label: "paypal"
                            },
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


//for Capturing the payment after authorization
document.getElementById("capture-button").addEventListener("click", async function () {
    if (!pendingTransaction) {
        console.error("No authorized transaction to capture");
        return;
    }

    this.hidden = false;

    try {
        const captureResult = await transactionSubmitForSettlement(pendingTransaction.id, pendingTransaction.amount);

        if (captureResult.success) {
            console.log("Capture successful:", captureResult);
            console.log("Captured transaction ID:", captureResult.transactionId);
            pendingTransaction = null;   // done, prevent double-capture
            this.hidden = true;
            paypalButton.hidden = false; 
            payLaterButton.hidden = false;
            payLaterMessage.hidden = false;
        } else {
            this.hidden = false;   
        }
    } catch (error) {
        console.error("Error during capture:", error);
    }
});    
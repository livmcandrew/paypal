const submitButton = document.getElementById("submit-button");
var paypalButton = document.getElementById("paypal-button");
const setAmount = "100.00";
var threeDSecureParameters = {
    amount: setAmount,
}

submitButton.addEventListener("click", function(event){
    let firstName = document.getElementById("firstname").value;
    let surname = document.getElementById("surname").value;
    let email = document.getElementById("email").value;
    let phone = document.getElementById("phone").value;
    let street = document.getElementById("street").value;
    let region = document.getElementById("region").value;
    let postalCode = document.getElementById("postalCode").value;
    let country = document.getElementById("country").value;
    var billingAddress = {}

    threeDSecureParameters.firstName = firstName;
    threeDSecureParameters.email = email;
    billingAddress.givenName = firstName;
    billingAddress.surname = surname;
    billingAddress.phone = phone;
    billingAddress.street = street;
    billingAddress.region = region;
    billingAddress.postalCode = postalCode;
    billingAddress.country = country;
    threeDSecureParameters.billingAddress = billingAddress;
    console.log("threeDSecureParameters:", threeDSecureParameters);
});

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
                        intent: 'tokenize', // Must match the intent passed in with createPayment
                        vault: true,
                        components: 'buttons,messages',
                        'enable-funding': 'paylater',
                        'buyer-country': 'GB',
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
                    // const payPaypal = paypal.Buttons({
                    //     fundingSource: paypal.FUNDING.PAYPAL,

                    //     createOrder: function () {
                    //     // Base payment request options for one-time payments
                    //     var createPaymentRequestOptions = {
                    //         flow: 'checkout', // Required
                    //         intent: 'capture',
                    //         currency: 'GBP',
                    //         amount: setAmount
                    //     };

                    //     return paypalCheckoutInstance.createPayment(createPaymentRequestOptions);
                    //     },

                    //     onApprove: function (data, actions) {
                    //     // Return a promise that resolves/rejects when you're done
                    //     return new Promise((resolve, reject) => {
                    //         paypalCheckoutInstance.tokenizePayment(data, function (err, payload) {
                    //         if (err) {
                    //             console.error("tokenizePayment error", err);
                    //             document.getElementById("divResponse").innerHTML =
                    //             "<pre>Tokenization failed\n\n" + JSON.stringify(err, null, 2) + "</pre>";
                    //             return reject(err);
                    //         }
                            
                    //         // Call transcation API 
                    //         result = transactionPaymentNonce(payload, setAmount)

                    //         //SHOW RESPONSE
                    //         .then((result) => {
                    //         document.getElementById("divResponse").innerHTML =
                    //             "<pre>" +
                    //             (result.success ? "Transaction successful" : "Transaction failed") +
                    //             "\n\n" +
                    //             JSON.stringify(result, null, 2) +
                    //             "</pre>";
                    //         resolve(result);
                    //         })
                    //         .catch((e) => {
                    //         console.error("checkout error", e);
                    //         document.getElementById("divResponse").innerHTML =
                    //             "<pre>Checkout error\n\n" + (e && e.message ? e.message : String(e)) + "</pre>";
                    //         reject(e);
                    //         });
                    //     });
                    //     });
                    //     },

                    //     onCancel: function (data) {
                    //     console.log('PayPal payment cancelled', JSON.stringify(data, 0, 2));
                    //     },

                    //     onError: function (err) {
                    //     console.error('PayPal error', err);
                    //     }
                    //     }).render('#paypal-button').then(function () {
                    //         // The PayPal button will be rendered in an html element with the ID 'paypal-button'
                    //     });

                    //ADD the PAY LATER BUTTON
                    // const payLater = paypal.Buttons({
                    //     fundingSource: paypal.FUNDING.PAYLATER,
                    //     createOrder: function () {
                    //         return paypalCheckoutInstance.createPayment({
                    //             flow: 'checkout',
                    //             intent: 'authorize',
                    //             currency: 'GBP',
                    //             amount: setAmount
                    //         });
                    //     },
                    //     onApprove: function (data, actions) {
                    //         return paypalCheckoutInstance.tokenizePayment(data, function (err, payload) {
                    //         // Call transcation API 
                    //         result = transactionPaymentNonce(payload, setAmount)

                    //         //SHOW RESPONSE
                            
                    //         });
                    //     },
                    //     onError: function (err) {
                    //     console.error('PayPal error', err);
                    //     }
                    //     }).render('#pay-later-button');
                    
                        
                    //ADD Vaulting
                    const vault = paypal.Buttons({
                        fundingSource: paypal.FUNDING.PAYPAL,

                        createBillingAgreement: function () {
                        return paypalCheckoutInstance.createPayment({
                            flow: 'vault', // Required

                            // The following are optional params
                            billingAgreementDescription: 'Your agreement description',
                            enableShippingAddress: true,
                            shippingAddressEditable: false,
                            shippingAddressOverride: {
                            recipientName: 'Scruff McGruff',
                            line1: '1234 Main St.',
                            line2: 'Unit 1',
                            city: 'Chicago',
                            countryCode: 'US',
                            postalCode: '60652',
                            state: 'IL',
                            phone: '123.456.7890'
                            }
                        });
                        },
                        onApprove: function (data, actions) {
                            return new Promise((resolve, reject) => {
                                paypalCheckoutInstance.tokenizePayment(data, async (err, payload) => {
                                if (err) {
                                    document.getElementById("divResponse").innerHTML =
                                    "<pre>Tokenization failed\n\n" + JSON.stringify(err, null, 2) + "</pre>";
                                    return reject(err);
                                }

                                try {
                                    const resp = await fetch("/btcheckout/vaultWithCheckout", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        paymentMethodNonce: payload.nonce,
                                        amount: setAmount,
                                        }),
                                    });

                                    const result = await resp.json();

                                    if (!resp.ok || !result.success) {
                                    const msg = result.error || result.message || "Vault+checkout failed";
                                    document.getElementById("divResponse").innerHTML =
                                        "<pre>Transaction failed\n\n" + JSON.stringify(result, null, 2) + "</pre>";
                                    return reject(new Error(msg));
                                    }

                                    document.getElementById("divResponse").innerHTML =
                                    "<pre>Transaction successful\n\n" + JSON.stringify(result, null, 2) + "</pre>";

                                    console.log("Vault+checkout success:", result);
                                    resolve(result);
                                } catch (e) {
                                    document.getElementById("divResponse").innerHTML =
                                    "<pre>Checkout error\n\n" + (e?.message || String(e)) + "</pre>";
                                    reject(e);
                                }
                                });
                            });
                        },
                        onCancel: function (data) {
                        console.log('PayPal payment canceled', JSON.stringify(data, 0, 2));
                        },

                        onError: function (err) {
                        console.error('PayPal error', err);
                        }
                        }).render('#paypal-button').then(function () {
                            // The PayPal button will be rendered in an html element with the ID
                            // 'paypal-button'. This function will be called when the PayPal button
                            // is set up and ready to be used

                    });
                });       
            });
        });
    });
});
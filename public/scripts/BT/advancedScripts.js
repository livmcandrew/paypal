//Client Side implementation 
var submitButton = document.getElementById("submit-button");
var paypalButton = document.getElementById("paypal-button");
const setAmount = "150.00";
var billingAddress = {
    givenName: "Jill",
    surname: "Doe",
    phoneNumber: "07919123456",
    streetAddress: "555 Smith St.",
    extendedAddress: "#5",
    locality: "PR",
    postalCode: "12345",
    countryCodeAlpha2: "GBP",
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

function showMessage(text, success = true) { 
  const messageBox = document.getElementById('result-message'); 
  messageBox.textContent = text; 
  messageBox.style.color = success ? 'green' : 'red'; 
} 

// Apple Pay
if (window.ApplePaySession && ApplePaySession.supportsVersion(3) && ApplePaySession.canMakePayments()) { 
    // This device supports version 3 of Apple Pay. 
    console.log("ApplePay supported") 
} 
if (!window.ApplePaySession) { 
    console.error('This device does not support Apple Pay'); 
} 
if (!ApplePaySession.canMakePayments()) { 
    console.error('This device is not capable of making Apple Pay payments'); 
} 

// Google Pay   
var googleButton = document.getElementById('#google-pay-button');
var paymentsClient = new google.payments.api.PaymentsClient({
  environment: 'TEST' 
});

fetch("/btcheckout")
    .then((response) => {
        return response.text();
    })
    //This is for initialising the BT client using Client Token
  .then((client_token) => {
    braintree.client.create({
        authorization: client_token
        }, 
        function (clientErr, clientInstance) {
        if (clientErr) {
            console.error(clientErr);
            return;
        }

        // Create 3DS instance
        braintree.threeDSecure.create({
            authorization: client_token,   
            version: 2
        }, function (threeDSErr, threeDSInstance) {
        if (threeDSErr) {
            console.error(threeDSErr);
            return;
        }
        threeDS = threeDSInstance;   // store it in the module-level variable
        });

        // Add Hosted Fields Pay Checkout
        braintree.hostedFields.create({
            preventAutofill: false, //browser to prefill fields
            client: clientInstance,
            styles: {
                'input': {
                'font-size': '16px',
                'font-family': 'roboto, verdana, sans-serif',
                'font-weight': 'lighter',
                'color': 'black'
                },
                ':focus': {
                'color': 'black'
                },
                '.valid': {
                'color': 'black'
                },
                '.invalid': {
                'color': 'black'
                }
            },
            fields: {
                number: {
                selector: '#card-number',
                placeholder: '1111 1111 1111 1111'
                },
                cvv: {
                selector: '#cvv',
                placeholder: '111'
                },
                expirationDate: {
                selector: '#expiration-date',
                placeholder: 'MM/YY'
                },
                postalCode: {
                selector: '#postal-code',
                placeholder: '11111'
                }
            }
            }, 
            function(err, hostedFieldsInstance) {
                if (err) {
                console.error(err);
                return;
            }
            
            //Finds the class "hosted-field--label..."
            //UI changes for floating label pattern
            function findLabel(field) {
            return $('.hosted-field--label[for="' + field.container.id + '"]');
            }
            hostedFieldsInstance.on('focus', function (event) {
            var field = event.fields[event.emittedBy];
            
            findLabel(field).addClass('label-float').removeClass('filled');
            });
            // Emulates floating label pattern
            hostedFieldsInstance.on('blur', function (event) {
            var field = event.fields[event.emittedBy];
            var label = findLabel(field);
            
            if (field.isEmpty) {
                label.removeClass('label-float');
            } else if (field.isValid) {
                label.addClass('filled');
            } else {
                label.addClass('invalid');
            }
            });
            hostedFieldsInstance.on('empty', function (event) {
            var field = event.fields[event.emittedBy];
            findLabel(field).removeClass('filled').removeClass('invalid');
            });
            hostedFieldsInstance.on('validityChange', function (event) {
            var field = event.fields[event.emittedBy];
            var label = findLabel(field);

            if (field.isPotentiallyValid) {
                label.removeClass('invalid');
            } else {
                label.addClass('invalid');  
            }
            });

            //Listener for form submission payment with hosted fields
            $('#cardForm').submit(function (event) {
            event.preventDefault();

            hostedFieldsInstance.tokenize(async function (err, payload) {
                if (err) {
                    console.error(err);
                    return;
                }

                //Run 3DS verification on the nonce before checkout
                threeDS.verifyCard({
                    amount: setAmount,
                    nonce: payload.nonce,
                    bin: payload.details.bin,
                    onLookupComplete: function (data, next) {
                        next();
                }
                }, async function (threeDSErr, threeDSPayload) {
                if (threeDSErr) {
                    console.error(threeDSErr);
                    return;
                }

                if (!threeDSPayload.liabilityShifted) {
                    console.log('Liability did not shift', threeDSPayload);
                    // decide whether to still proceed or block the payment
                }

                try {
                    // Call transcation API 
                    result = await transactionPaymentNonce(threeDSPayload, setAmount)
                    //SHOW RESPONSE
                    if (result.success) {
                        alert("✅ Transaction successful!\nTransaction ID: " + result.transactionId);
                        console.log(result)
                }
                } catch (error){
                    console.error("Error during transaction:", error);
                }
            
                });
        
            });
        });
        });

        // Create a PayPal Checkout component.
        braintree.paypalCheckout.create({
            client: clientInstance
            }, function (paypalCheckoutErr, paypalCheckoutInstance) {

                // Base PayPal SDK script options
                var loadPayPalSDKOptions = {
                    currency: 'GBP',  // Must match the currency passed in with createPayment
                    intent: 'capture', // Must match the intent passed in with createPayment
                    components: 'buttons,messages',
                    commit: true,
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
                            intent: 'capture',
                            currency: 'GBP',
                            amount: setAmount,
                            userAction: 'PAY'
                        };
                        
                        //adding line items to the request options 
                        createPaymentRequestOptions.lineItems = [
                            {
                                name: 'Test Product',
                                quantity: '1',
                                unitAmount: "143.00",
                                kind: "debit",
                                unitTaxAmount: "7.00",
                                description: "Cashmere Knitted Jumper",
                                productCode: "Livs-test-123",
                            }
                        ];          

                        return paypalCheckoutInstance.createPayment(createPaymentRequestOptions);
                        },

                        onApprove: function (data, actions) {
                            // Return a promise that resolves/rejects when you're done
                            return new Promise((resolve, reject) => {
                                paypalCheckoutInstance.tokenizePayment(data, async function (err, payload) {
                                if (err) {
                                    console.error("tokenizePayment error", err);
                                    return reject(err);
                                }
                                
                                console.log("Buyer's PayPal email:", payload.details.email);

                                try {
                                    // Call transcation API 
                                    const result = await transactionPaymentNonce(payload, setAmount)
                                    //SHOW RESPONSE
                                    if (result.success) {
                                        console.log(result)
                                        resolve(result);
                                    }
                                    } catch (error){
                                        console.error("Error during transaction:", error);
                                        reject(error);
                                    }
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
                            try {
                                // Call transcation API 
                                const result = await transactionPaymentNonce(payload, setAmount)
                                //SHOW RESPONSE
                                if (result.success) {
                                    console.log(result)
                                    resolve(result);
                                }
                                } catch (error){
                                    console.error("Error during transaction:", error);
                                    reject(error);
                                }
                            });
                        },

                        onError: function (err) {
                            console.error('PayPal error', err);
                        }
                        
                    }).render('#pay-later-button');
                
                });       
        });

        // Add Apple Pay Checkout
        braintree.applePay.create({ 
                client: clientInstance 
            }, function (applePayErr, applePayInstance) {

                if (applePayErr) { 
                    console.error('Error creating applePayInstance:', applePayErr); 
                    return; 
                } 

                // Set up your Apple Pay button here 
                var paymentRequest = applePayInstance.createPaymentRequest({ 

                    total: { 
                        label: 'My Store', 
                        amount: setAmount 
                    }, 

                    countryCode: 'GB',           
                    currencyCode: 'GBP', 
                }); 

                //Show apple pay button 
                document.querySelector('#apple-pay-button').style.display = 'block' 
                document.querySelector('#apple-pay-button').addEventListener('click', async () => { 

                const session = new ApplePaySession(3, paymentRequest); 

                // Merchant validation 
                session.onvalidatemerchant = async (event) => { 

                try { 
                    const validationData = await applePayInstance.performValidation({ 
                        validationURL: event.validationURL, 
                        displayName: 'Your Store' 
                    }); 

                    session.completeMerchantValidation(validationData); 

                } catch (err) { 
                    console.error('Merchant validation failed:', err); 
                    console.log('Merchant validation failed:', err); 
                    session.abort(); 
                } 
                }; 

                // Payment authorized → tokenize with Braintree 
                session.onpaymentauthorized = async (event) => { 

                    try { 
                    const { nonce } = await applePayInstance.tokenize({ 
                        token: event.payment.token 
                    }); 

                    // → nonce (Apple Pay) → send to your server to create a transaction 
                    const body = { 
                        paymentMethodNonce: nonce, 
                        amount: paymentRequest.total.amount 
                    }; 

                    const resp = await fetch('/btcheckout', { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify(body) 
                    }); 
                    
                    if (!resp.ok) throw new Error(await resp.text());       
                    session.completePayment(ApplePaySession.STATUS_SUCCESS); 
                    const data = await resp.json(); // read the body ONCE
                    showMessage(`Payment Successful: ${JSON.stringify(data)}`, true);
                    console.log("Payment Successful:", data);
                    } catch (err) { 
                        console.error('Payment failed:', err); 
                        console.log('Merchant validation failed:', err); 
                    } 
                }; 

                session.begin(); 
            }) 
        }); 
        
        // Add Google Pay Checkout
        braintree.googlePayment.create({
            client: clientInstance,
            googlePayVersion: 2,
        }, function (googlePayErr, googlePaymentInstance) {
            if (googlePayErr) {
                console.error('Error creating googlePaymentInstance:', googlePayErr);
                return;
            }

            paymentsClient.isReadyToPay({
                apiVersion: 2,
                apiVersionMinor: 0,
                allowedPaymentMethods: googlePaymentInstance.createPaymentDataRequest().allowedPaymentMethods,
                existingPaymentMethodRequired: true,
            }).then(function (response) {
                if (response.result) {
                    console.log('Google Pay is ready to pay');

                    // Create the actual Google-branded button and render it
                    var button = paymentsClient.createButton({
                        onClick: onGooglePayClick,
                        allowedPaymentMethods: googlePaymentInstance.createPaymentDataRequest().allowedPaymentMethods
                    });
                    document.querySelector('#google-pay-button').appendChild(button);

                    function onGooglePayClick(event) {
                        event.preventDefault();

                        var paymentDataRequest = googlePaymentInstance.createPaymentDataRequest({
                            transactionInfo: {
                                currencyCode: 'GBP',
                                totalPriceStatus: 'FINAL',
                                totalPrice: setAmount   // use your existing variable, not hardcoded '100'
                            }
                        });

                        var cardPaymentMethod = paymentDataRequest.allowedPaymentMethods[0];
                        cardPaymentMethod.parameters.billingAddressRequired = true;
                        cardPaymentMethod.parameters.billingAddressParameters = {
                            format: 'FULL',
                            phoneNumberRequired: true
                        };
                        // Don't touch tokenizationSpecification — leave what Braintree set

                        paymentsClient.loadPaymentData(paymentDataRequest).then(function (paymentData) {
                            googlePaymentInstance.parseResponse(paymentData, async function (err, result) {
                                if (err) {
                                    console.error('Error parsing Google Pay response:', err);
                                    return;
                                }

                                try {
                                    const data = await transactionPaymentNonce(result, setAmount);
                                    if (data.success) {
                                        showMessage(`Payment Successful: Transaction ID ${data.transactionId}`, true);
                                        console.log('Google Pay payment successful:', data);
                                    }
                                } catch (error) {
                                    console.error('Error during transaction:', error);
                                }
                            });
                        }).catch(function (err) {
                            console.error('Error loading Google Pay payment data:', err);
                        });
                    }
                }
            }).catch(function (err) {
                console.error('Error checking Google Pay readiness:', err);
            });
        });

    }); 
});

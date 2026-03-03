const submitButton = document.getElementById("submit-button");
const setAmount = "100.00";
//generates random customerId (only used for card transactions), esnures format "11111livX"
const randomNumber = Math.floor(Math.random() * 100000)
  .toString()
  .padStart(5, "0");
const customerId = `${randomNumber}livX`;

// Get the status if the payment has already been vaulted 
function getVaultStatus() {
    // Card vault info 
    const cardToken = localStorage.getItem("vaultedPaymentMethodToken");
    const cardLast4 = localStorage.getItem("vaultedCardLast4");
    const cardBrand = localStorage.getItem("vaultedCardBrand");
    const cardCustomerId = localStorage.getItem("vaultedCustomerId");
    // PayPal vault info
    const ppBillingToken = localStorage.getItem("vaultedPaymentMethodToken"); // pick a name you store
    const ppCustomerId = localStorage.getItem("vaultedCustomerId"); // optional

    const hasCard = !!(cardToken && cardLast4);
    const hasPayPal = !!ppBillingToken;

    if (hasCard) {
        return {vaulted: true, type: "card", token: cardToken, customerId: cardCustomerId || null, brand: cardBrand || "Card", last4: cardLast4,
        };
    }

    if (hasPayPal) {
        return { vaulted: true,type: "paypal", token: ppBillingToken, customerId: ppCustomerId || null,
        };
    }
    return { vaulted: false, type: null, token: null, customerId: null };
}

// Save payment by BOTH flows 
function saveVaultResult({ type, token, customerId, brand, last4 }) {
    if (type === "card") {
        localStorage.setItem("paymentType", type)
        localStorage.setItem("vaultedPaymentMethodToken", token);
        if (customerId) localStorage.setItem("vaultedCustomerId", customerId);
        if (brand) localStorage.setItem("vaultedCardBrand", brand);
        if (last4) localStorage.setItem("vaultedCardLast4", last4);
        return;
    }

    if (type === "paypal") {
        localStorage.setItem("paymentType", type)
        localStorage.setItem("vaultedPaymentMethodToken", token);
        if (customerId) localStorage.setItem("vaultedCustomerId", customerId);
        return;
        }
}

// Main Code
window.onload = async () => { 

    // Checks if vaulted payment exists and redirects to returning customer page
    const vault = getVaultStatus();
    if (vault.vaulted) { //if vaulted status is true
        setTimeout(() => {
            window.location.href = '/btVaultingReturnCust.html';  // <-- returning customer
        }, 200); //
        return;
    }

    const client_token = await fetch("/btcheckout").then(r => r.text());

    // Create a client.
    braintree.client.create({
        authorization: client_token
        }, function (clientErr, clientInstance) {

            // Stop if there was a problem creating the client.
            if (clientErr) {
                console.error('Error creating client:', clientErr);
                return;
            }

            // Hosted Fields
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
            }, function(err, hostedFieldsInstance) {
                if (err) {
                    console.error(err);
                    return;
                }
                //Finds the class "hosted-field--label..."
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

                        $('#cardForm').submit(function (event) {
                            event.preventDefault();

                            hostedFieldsInstance.tokenize(async function (err, payload) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    try{
                        const response = await fetch("/btcheckout/vaultWithCheckout", {
                            method: "POST",
                            headers: {"Content-Type": "application/json"},
                            body: JSON.stringify({
                            paymentMethodNonce: payload.nonce,
                            customerId: customerId, //passes generated customerID
                            amount: setAmount
                            }),
                        });

                        const text = await response.text();
                        const result = JSON.parse(text);
                        
                        // Redirects user to Existing Customer page
                        if (result.success) {
                            // Save info for vaulted payments
                            saveVaultResult({
                                type: "card",
                                token: result.paymentMethodToken,
                                customerId: result.customerId,
                                brand: result.cardType,
                                last4: result.result.transaction.creditCard.last4,
                            });
                            console.log(result);
                            alert("✅ Transaction successful!\nCustomer ID: " + result.customerId);    
                            setTimeout(() => {
                                window.location.href = '/btVaultingReturnCust.html';  // <-- exisiting customer
                            }, 2000); 
                        }
                        } catch (error){
                            console.error("Error during transaction:", error);
                        }
                            
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
                        intent: 'tokenize', // Must match the intent passed in with createPayment
                        vault: true,
                        components: 'buttons,messages',
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
                                        
                    // ADDs PAYPAL Button
                    const vault = paypal.Buttons({
                        fundingSource: paypal.FUNDING.PAYPAL,

                        createBillingAgreement: function () {
                            return paypalCheckoutInstance.createPayment({
                                    flow: 'vault', // Required
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
                                        //displays error message on UI
                                        document.getElementById("divResponse").innerHTML =
                                        "<pre>Tokenization failed\n\n" + JSON.stringify(err, null, 2) + "</pre>";
                                        return reject(err);
                                    }

                                    try {
                                        const resp = await fetch("/btcheckout/", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            paymentMethodNonce: payload.nonce,
                                            amount: setAmount,
                                            storeInVault: 'true', // Pass the flag to the backend
                                            }),
                                        });

                                        const result = await resp.json();
                                        if (!resp.ok || !result.success) {
                                                const msg = result.error || result.message || "Vault+checkout failed";
                                                //Show ever message in UI if fails
                                                document.getElementById("divResponse").innerHTML =
                                                "<pre>Transaction failed\n\n" + JSON.stringify(result, null, 2) + "</pre>";
                                                return reject(new Error(msg));
                                            }
                    
                                        // Save info for vaulted payments
                                        saveVaultResult({
                                            type: "paypal",
                                            token: result.paymentMethodToken,
                                            customerId: result.customerId,
                                            brand: result.cardType
                                        });

                                        console.log("PayPal payment successfull ",result);
                                        console.log(result.customerId)
                                        
                                        // Redirects user to Existing Customer page
                                        setTimeout(() => {
                                                window.location.href = '/btVaultingReturnCust.html';  // <-- exisiting customer
                                            }, 2000); 
                                        return resolve(result);  
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

                    });
            }); 
        });
    });
};

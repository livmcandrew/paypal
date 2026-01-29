const submitButton = document.getElementById("submit-button");
var paypalButton = document.getElementById("paypal-button");
const setAmount = "100.00";
var threeDSecureParameters = {
    amount: setAmount,
}
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

// Get the status if the payment has already been vaulted 
function getVaultStatus() {
    // Card vault info 
    const cardToken = localStorage.getItem("vaultedPaymentMethodToken");
    const cardLast4 = localStorage.getItem("vaultedCardLast4");
    const cardBrand = localStorage.getItem("vaultedCardBrand");
    const cardCustomerId = localStorage.getItem("vaultedCustomerId");
    // PayPal vault info
    const ppBillingToken = localStorage.getItem("paypalBillingToken"); // pick a name you store
    const ppCustomerId = localStorage.getItem("paypalCustomerId"); // optional

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
        localStorage.setItem("vaultedPaymentMethodToken", token);
        if (customerId) localStorage.setItem("vaultedCustomerId", customerId);
        if (brand) localStorage.setItem("vaultedCardBrand", brand);
        if (last4) localStorage.setItem("vaultedCardLast4", last4);
        return;
    }

    if (type === "paypal") {
        localStorage.setItem("paypalBillingToken", token);
        if (customerId) localStorage.setItem("paypalCustomerId", customerId);
        return;
        }
}

// Clear vaulted state
function clearVault() {
    [
    "vaultedPaymentMethodToken",
    "vaultedCustomerId",
    "vaultedCardBrand",
    "vaultedCardLast4",
    "paypalBillingToken",
    "paypalCustomerId",
    ].forEach(k => localStorage.removeItem(k));
}

// Render correct button if payment has been vaulted already
function renderReturningButton(vault) {
    const container = document.getElementById("returning-card");
    if (!container) return;

    //if returning customer through Card
    if (vault.type === "card") {
        container.innerHTML = `
        <button id="returning-vault-btn" class="vaulted-pay-btn" type="button">
        <div class="vaulted-pay-left">
        <div class="vaulted-badge">💳</div>
        <div>
        <div class="vaulted-title">Pay with ${vault.brand || "Card"}</div>
        <div class="vaulted-subtitle">•••• ${vault.last4}</div>
        </div>
        </div>
        <div class="vaulted-arrow">›</div>
        </button>
        `;

        document.getElementById("returning-vault-btn")?.addEventListener("click", async () => {
        const resp = await fetch("/btcheckout/chargeVaulted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodToken: vault.token, amount: setAmount }),
        });

        const result = await resp.json();
        document.getElementById("divResponse").innerHTML =
        "<pre>" +
        (result.success ? "Vaulted transaction successful" : "Vaulted transaction failed") +
        "\n\n" +
        JSON.stringify(result, null, 2) +
        "</pre>";
        });
        return;
    }

    //if returning customer through PP 
    if (vault.type === "paypal") {
        container.innerHTML = `
        <button id="returning-vault-btn" class="vaulted-pay-btn" type="button">
        <div class="vaulted-pay-left">
        <div class="vaulted-badge">🅿️</div>
        <div>
        <div class="vaulted-title">Pay with saved PayPal</div>
        <div class="vaulted-subtitle">Vaulted agreement</div>
        </div>
        </div>
        <div class="vaulted-arrow">›</div>
        </button>
        `;


        document.getElementById("returning-vault-btn")?.addEventListener("click", async () => {
        const resp = await fetch("/btcheckout/chargeVaultedPayPal", { // your backend endpoint
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingToken: vault.token, amount: setAmount }),
        });


        const result = await resp.json();
        document.getElementById("divResponse").innerHTML =
        "<pre>" +
        (result.success ? "Vaulted PayPal transaction successful" : "Vaulted PayPal transaction failed") +
        "\n\n" +
        JSON.stringify(result, null, 2) +
        "</pre>";
        });
    }
}

// Main Code
window.onload = async () => {

    const vault = getVaultStatus();
    if (vault.vaulted) {
        renderReturningButton(vault);
        document.getElementById("dropin-container").style.display = "none";
        if (submitButton) submitButton.style.display = "none";
        return;
    }

    const client_token = await fetch("/btcheckout").then(r => r.text());

    // Drop-In UI
    braintree.dropin.create(
        {
            authorization: client_token,
            container: "#dropin-container",
            dataCollector: true,
            amount: setAmount,
            vault: { allowVaultCardOverride: true },
            threeDSecure: { authorization: client_token, version: 2 },
            vaultManager: true, // shows “Save card” UI (Drop-in v1.3x)
        },
        (componentError, instance) => {
            if (componentError) return console.error(componentError);

            submitButton.addEventListener("click", (e) => {
                e.preventDefault();
                instance.requestPaymentMethod(
                    { threeDSecure: { amount: setAmount } },
                    async (err, payload) => {
                        if (err) return console.error(err);

                        try {
                            const resp = await fetch("/btcheckout", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                paymentMethodNonce: payload.nonce,
                                amount: setAmount,
                                storeInVault: true,
                                deviceData: instance.deviceData,
                            }),
                        });

                        console.log("[dropin] status:", resp.status);
                        const result = await resp.json();

                        if (result.success && result.vaultedCardToken){
                            localStorage.setItem("vaultedPaymentMethodToken", result.vaultedCardToken);
                            localStorage.setItem("vaultedCardLast4", result.last4 || "Error");
                            localStorage.setItem("vaultedCardBrand", result.cardType || "Error");
                            localStorage.setItem("vaultedCustomerId", result.customerId || "Error");
                            //Save info for vaulted payments.
                            saveVaultResult({
                                type: "card",
                                token: result.vaultedCardToken,
                                customerId: result.customerId,
                                brand: result.cardType,
                                last4: result.last4,
                            });
                        
                            console.log("Drop-in result:", result);
                        }

                        } catch (e) {
                            console.error("[dropin] checkout error:", e);
                        }
                    }
                );
            });
        }
    );

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
                                    vaultedPaymentMade: 'true', // Pass the flag to the backend
                                    }),
                                });

                                const result = await resp.json();
                                
                                if (!resp.ok || !result.success) {
                                        const msg = result.error || result.message || "Vault+checkout failed";
                                        document.getElementById("divResponse").innerHTML =
                                        "<pre>Transaction failed\n\n" + JSON.stringify(result, null, 2) + "</pre>";
                                        return reject(new Error(msg));
                                    }
                                    // document.getElementById("divResponse").innerHTML =
                                    // "<pre>Transaction successful\n\n" + JSON.stringify(result, null, 2) + "</pre>"; 

                                    //Save info for vaulted payments.
                                    saveVaultResult({
                                        type: "paypal",
                                        token: result.vaultedCardToken,
                                        customerId: result.customerId,
                                        brand: result.cardType
                                    });
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

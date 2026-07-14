const submitButton = document.getElementById("submit-button");
var paypalButton = document.getElementById("paypal-button");
const setAmount = "120.00";
const params = new URLSearchParams(window.location.search);
const int = params.get('int');

// Get the status if the payment has already been vaulted 
function getVaultStatus() {
    // get vaulted info 
    const type = localStorage.getItem("paymentType");
    const paymentMethodToken = localStorage.getItem("vaultedPaymentMethodToken");
    const customerId = localStorage.getItem("vaultedCustomerId");
    //only for card
    const cardLast4 = localStorage.getItem("vaultedCardLast4");
    const cardBrand = localStorage.getItem("vaultedCardBrand");

    if (type == "card") {
        return {vaulted: true, type: "card", token: paymentMethodToken, customerId: customerId || null, brand: cardBrand || "Card", last4: cardLast4,
        };
    }
    if (type == "paypal") {
        return { vaulted: true,type: "paypal", token: paymentMethodToken, customerId: customerId || null,
        };
    }
    return { vaulted: false, type: null, token: null, customerId: null };
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
    console.log("local storage cleared");
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
    console.log("PayPal payment successfull ",result);
    return result;
  } 
  catch (error) {
    console.error("Error during transaction:", error);
    // Handle network errors or JSON parsing errors
    throw error; // Re-throw to allow the caller to handle the error as needed
  }
};

// Main Code
window.onload = async () => { 

    //lister for 'new customer' - clears local stored values
    const resetVaultBtn =  document.getElementById("vault-reset")
    if (resetVaultBtn){
        resetVaultBtn.addEventListener("click", () => {
            clearVault();
            window.location.href = `/html/${int}/VaultingNewCust.html?int=${int}`; //refresh UI
        })
    }

    // Return to new customer page if no vaulted value or customer ID
    const vault = getVaultStatus();
    console.log(vault.vaulted);
    console.log("Type: ", vault.type);
    console.log("token: ", vault.token);
    console.log("CustomerID: ", vault.customerId);

    if (!vault.vaulted || vault.customerId == null) {
        window.location.href = `/html/${int}/VaultingNewCust.html?int=${int}`;
    }

    //To display returning Card button
    if (vault.type == "card" ) {
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

        //sends payment with vaulted token value
        document.getElementById("returning-vault-btn")?.addEventListener("click", async () => {
            try {
                const response = await fetch("/btcheckout/chargeVaulted", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                    paymentMethodNonce: vault.token,
                    customerId: vault.customerId, //passes generated customerID
                    amount: setAmount
                    }),
                });

                const text = await response.text();   //response in text
                let result;
                result = JSON.parse(text); 
                console.log(result);
                alert("✅ Transaction successful!\nCustomer ID: " + vault.customerId);

            } catch (e) {
                console.error("chargeVaulted failed:", e);}
        });    
    }

    //To display returning PayPal button
    if (vault.type == "paypal" ) {
    
        fetch("/btcheckout/client_cust_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerId: vault.customerId  })
            })

            .then(r => r.text())
            
            .then(clientToken => {
                return braintree.client.create({ authorization: clientToken });
            })

            .then(clientInstance => {
                return braintree.paypalCheckout.create({
                    autoSetDataUserIdToken: true,
                    client: clientInstance
                });
            })

            .then(paypalCheckoutInstance => {
                return paypalCheckoutInstance.loadPayPalSDK({
                        currency: "GBP",
                        intent: "capture",
                        components: "buttons"
                    })
                    .then(() => paypalCheckoutInstance);
            })

            .then(paypalCheckoutInstance => {
            return paypal.Buttons({
                fundingSource: paypal.FUNDING.PAYPAL,

                createOrder: () => paypalCheckoutInstance.createPayment({
                    flow: "checkout",
                    intent: "capture",
                    currency: "GBP",
                    amount: setAmount,
                    userAction: "commit"
                }),

                onApprove: data => new Promise((resolve, reject) => {
                    paypalCheckoutInstance.tokenizePayment(data, (err, payload) => {
                        if (err) return reject(err);
                        transactionPaymentNonce(payload, setAmount).then(resolve).catch(reject);
                    });
                }),

                onError: err => console.error("PayPal error", err)
                }).render("#paypal-button");
            })

            .catch(err => {
            console.error("Returning PayPal setup failed:", err);
        });
    }
}
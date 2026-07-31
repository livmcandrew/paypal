console.log("Start");

setTimeout(() => {
  console.log("This runs after 3 seconds");
}, 3000); // time is in milliseconds

console.log("End");

var setAmount = "9.99";

// Get the status if the payment has already been vaulted 
function getVaultStatus() {
    // get vaulted info 
    const type = localStorage.getItem("paymentType");
    const paymentMethodToken = localStorage.getItem("vaultedPaymentMethodToken");
    const customerId = localStorage.getItem("vaultedCustomerId");
    //only for card
    const cardLast4 = localStorage.getItem("vaultedCardLast4");
    const cardBrand = localStorage.getItem("vaultedCardBrand");
    const threeDSAuthenticationId = localStorage.getItem("threeDSAuthenticationId");

    if (type == "card") {
        return {vaulted: true, type: "card", token: paymentMethodToken, customerId: customerId || null, brand: cardBrand || "Card", last4: cardLast4, threeDSAuthenticationId: threeDSAuthenticationId || null,
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

// Return to new customer page if no vaulted value or customer ID
const vault = getVaultStatus();
console.log(vault.vaulted);
console.log("Type: ", vault.type);
console.log("token: ", vault.token);
console.log("CustomerID: ", vault.customerId);

//lister for 'new customer' - clears local stored values
const resetVaultBtn =  document.getElementById("vault-reset")
if (resetVaultBtn){
    resetVaultBtn.addEventListener("click", () => {
        clearVault();
        window.location.href = `/html/${int}/MIT.html?int=${int}`; //refresh UI
    })
}

// call the MIT API
fetch('/btcheckout/MIT', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    // MIT API request payload
    transactionSource: 'recurring_first',
    amount: setAmount,
    customerId: vault.customerId,
    currencyIsoCode: 'GBP',
    priorAuthenticationId: vault.threeDSAuthenticationId,
    paymentMethodNonce: vault.token,
    threeDSAuthenticationId: vault.threeDSAuthenticationId,
  })
})
.then(response => response.json())
.then(data => {
  console.log('MIT API Response:', data);
})
.catch(error => {
  console.error('Error calling MIT API:', error);
});

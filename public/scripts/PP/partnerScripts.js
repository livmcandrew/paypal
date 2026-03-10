// //Gets the session 
// const session = await fetch("/api/sessions", {
//   method: "POST",
// }).then(r => r.json());

// const checkout = await AdyenCheckout({
//   environment: "test",
//   clientKey: "test_P3COOIKRYRFLXIP3OI2ECULWTYU44244",
//   session,
// });

async function startPaypal() {
  // 1) Create a session via your server
  const session = await fetch("/api/sessions", { method: "POST" }).then(r => r.json());

  // 2) Init Adyen Checkout with clientKey + session
  const checkout = await AdyenCheckout({
    environment: "test",
    clientKey: "test_P3COOIKRYRFLXIP3OI2ECULWTYU44244", // your client key
    session, // must include id + sessionData
    onError: (err) => console.error("Adyen error", err),
    onPaymentCompleted: (result) => console.log("Payment completed", result),
  });

  // 3) Mount PayPal
  checkout.create("paypal").mount("#paypal-container");
}

window.addEventListener("load", startPaypal);
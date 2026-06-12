// Shared payment session options for all payment methods
const paymentSessionOptions = {
  // Called when user approves a payment 
  async onApprove(data) {
    console.log("Payment approved:", data);
    try {
      const orderData = await captureOrder({
        orderId: data.orderId,
      });
      console.log("Payment captured successfully:", orderData);
    } catch (error) {
      console.error("Payment capture failed:", error);
    }
  },
  
  // Called when user cancels a payment
  onCancel(data) {
    console.log("Payment cancelled:", data);
  },
  
  // Called when an error occurs during payment
  onError(error) {
    console.error("Payment error:", error);
  },
};


// Set up standard PayPal button One-Time Payment
async function configurePayPalButton(sdkInstance) {
  const paypalPaymentSession = sdkInstance.createPayPalOneTimePaymentSession(
    paymentSessionOptions,
  );

  const paypalButton = document.querySelector("#paypal-button");
  paypalButton.addEventListener("click", async () => {
    try {
      await paypalPaymentSession.start(
        { presentationMode: "auto" },
        createOrder(),
      );
    } catch (error) {
      console.error("PayPal payment start error:", error);
    }
  });
}

//Main function to initialize the PayPal SDK and set up buttons
(async () => {
  console.log("sdk6Scripts.js loaded")
  try{
    const sdkInstance = await window.paypal.createInstance({
      clientId: "AVGqIc8hFJ_fclr98apdzfSRMvn-G3RRRAqeSMbFP1lnDG-SghtB2sXeMEmDB4lKtsuF1Onn-CquEc_5",
      components: ["paypal-payments"],
      pageType: "checkout",
      });

    // Check eligibility for all payment methods
    const paymentMethods = await sdkInstance.findEligibleMethods({
      currencyCode: "GBP",
    });

    // Set up PayPal button if eligible
    if (paymentMethods.isEligible("paypal")) {
      configurePayPalButton(sdkInstance);
    }

    console.log("isEligible paypal:", paymentMethods.isEligible("paypal"));
    console.log("paymentMethods:", paymentMethods);    
    console.log("PayPal SDK initialized successfully");
    
  }  catch (error) {
    console.error("Failed to initialize PayPal SDK:", error);
  }
})();


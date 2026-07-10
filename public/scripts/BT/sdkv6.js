braintree.client
  .create({
      authorization: "eyJ2ZXJzaW9uIjoyLCJhdXRob3JpemF0aW9uRmluZ2VycHJpbnQiOiJleUpyYVdRaU9pSXlNREU0TURReU5qRTJMWE5oYm1SaWIzZ2lMQ0pwYzNNaU9pSm9kSFJ3Y3pvdkwyRndhUzV6WVc1a1ltOTRMbUp5WVdsdWRISmxaV2RoZEdWM1lYa3VZMjl0SWl3aVlXeG5Jam9pUlZNeU5UWWlmUS5leUpsZUhBaU9qRTNPRE0xTWpReU9UWXNJbXAwYVNJNklqWTJOemcxTTJJNUxXTXhNVGN0TkdRM05TMWhZMk0xTFRFeE9XSTBaV1l3Wm1OaE5TSXNJbk4xWWlJNkltWTVkSEoyY2pjNU5uRjNkR3N6YTIwaUxDSnBjM01pT2lKb2RIUndjem92TDJGd2FTNXpZVzVrWW05NExtSnlZV2x1ZEhKbFpXZGhkR1YzWVhrdVkyOXRJaXdpYldWeVkyaGhiblFpT25zaWNIVmliR2xqWDJsa0lqb2laamwwY25aeU56azJjWGQwYXpOcmJTSXNJblpsY21sbWVWOWpZWEprWDJKNVgyUmxabUYxYkhRaU9tWmhiSE5sTENKMlpYSnBabmxmZDJGc2JHVjBYMko1WDJSbFptRjFiSFFpT21aaGJITmxmU3dpY21sbmFIUnpJanBiSW0xaGJtRm5aVjkyWVhWc2RDSmRMQ0p6WTI5d1pTSTZXeUpDY21GcGJuUnlaV1U2Vm1GMWJIUWlMQ0pDY21GcGJuUnlaV1U2UTJ4cFpXNTBVMFJMSWl3aVFuSmhhVzUwY21WbE9rRllUeUpkTENKdmNIUnBiMjV6SWpwN0luQmhlWEJoYkY5amJHbGxiblJmYVdRaU9pSkJVekF0WW5nM2VUbDJjMHhzZHpKM1JFazNVRXBTUTBWV1JuSmlZelUyVm5OcFZIVmllR0p4TFhoWWRubHVMV2gzTjBKc2IyRnVkM2RvTkhKd1RYaGlXRVIwZUdOSU1VUmhOV2t4ZHpoSVFpSjlmUS55REkwTzZNMk1KYnJadVRLLW9LV2F4bWNrUjVpYkk2QXN4NXZCWTY5UlBZQmRQSGRPanN3NW5CVHY3aGtMWGlhRU1ZUXh0R1BDTWV5aklrZVc4WjEwUSIsImNvbmZpZ1VybCI6Imh0dHBzOi8vYXBpLnNhbmRib3guYnJhaW50cmVlZ2F0ZXdheS5jb206NDQzL21lcmNoYW50cy9mOXRydnI3OTZxd3RrM2ttL2NsaWVudF9hcGkvdjEvY29uZmlndXJhdGlvbiIsImdyYXBoUUwiOnsidXJsIjoiaHR0cHM6Ly9wYXltZW50cy5zYW5kYm94LmJyYWludHJlZS1hcGkuY29tL2dyYXBocWwiLCJkYXRlIjoiMjAxOC0wNS0wOCIsImZlYXR1cmVzIjpbInRva2VuaXplX2NyZWRpdF9jYXJkcyJdfSwiY2xpZW50QXBpVXJsIjoiaHR0cHM6Ly9hcGkuc2FuZGJveC5icmFpbnRyZWVnYXRld2F5LmNvbTo0NDMvbWVyY2hhbnRzL2Y5dHJ2cjc5NnF3dGsza20vY2xpZW50X2FwaSIsImVudmlyb25tZW50Ijoic2FuZGJveCIsIm1lcmNoYW50SWQiOiJmOXRydnI3OTZxd3RrM2ttIiwiYXNzZXRzVXJsIjoiaHR0cHM6Ly9hc3NldHMuYnJhaW50cmVlZ2F0ZXdheS5jb20iLCJhdXRoVXJsIjoiaHR0cHM6Ly9hdXRoLnZlbm1vLnNhbmRib3guYnJhaW50cmVlZ2F0ZXdheS5jb20iLCJ2ZW5tbyI6Im9mZiIsImNoYWxsZW5nZXMiOltdLCJ0aHJlZURTZWN1cmVFbmFibGVkIjp0cnVlLCJhbmFseXRpY3MiOnsidXJsIjoiaHR0cHM6Ly9vcmlnaW4tYW5hbHl0aWNzLXNhbmQuc2FuZGJveC5icmFpbnRyZWUtYXBpLmNvbS9mOXRydnI3OTZxd3RrM2ttIn0sInBheXBhbEVuYWJsZWQiOnRydWUsInBheXBhbCI6eyJiaWxsaW5nQWdyZWVtZW50c0VuYWJsZWQiOnRydWUsImVudmlyb25tZW50Tm9OZXR3b3JrIjp0cnVlLCJ1bnZldHRlZE1lcmNoYW50IjpmYWxzZSwiYWxsb3dIdHRwIjp0cnVlLCJkaXNwbGF5TmFtZSI6IlBheXBhbCIsImNsaWVudElkIjoiQVMwLWJ4N3k5dnNMbHcyd0RJN1BKUkNFVkZyYmM1NlZzaVR1YnhicS14WHZ5bi1odzdCbG9hbnd3aDRycE14YlhEdHhjSDFEYTVpMXc4SEIiLCJiYXNlVXJsIjoiaHR0cHM6Ly9hc3NldHMuYnJhaW50cmVlZ2F0ZXdheS5jb20iLCJhc3NldHNVcmwiOiJodHRwczovL2NoZWNrb3V0LnBheXBhbC5jb20iLCJkaXJlY3RCYXNlVXJsIjpudWxsLCJlbnZpcm9ubWVudCI6Im9mZmxpbmUiLCJicmFpbnRyZWVDbGllbnRJZCI6Im1hc3RlcmNsaWVudDMiLCJtZXJjaGFudEFjY291bnRJZCI6InBheXBhbCIsImN1cnJlbmN5SXNvQ29kZSI6IkVVUiJ9fQ==",
  })
  .then(function (client) {
      return braintree.paypalCheckoutV6.create({ client: client });
  })
  .then(function (paypal) {
      return paypal.loadPayPalSDK().then(function () {
        return paypal;
    });
  })
  .then(function (paypal) {
    var session = paypal.createOneTimePaymentSession({
      amount: "100.00",
      currency: "GBP",
      intent: "capture",
      onApprove: function (data) {
        return paypal
            .tokenizePayment({
                payerID: data.payerId,
                orderID: data.orderId,
          })
          .then(function (payload) {
              console.log("Nonce:", payload.nonce);
                try {
                    const response = fetch("/btcheckout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        paymentMethodNonce: payload.nonce,
                        amount: setAmount,
                        })
                    });

                    const text = response.text();
                    let result;
                    result = JSON.parse(text);
                    return result;
                } 
                catch (error) {
                    console.error("Error during transaction:", error);
                    throw error;x
                }
          });
      },
    });
    document
      .getElementById("paypal-one-time-payment-button")
      .addEventListener("click", function () {
          session.start();
      });
  });
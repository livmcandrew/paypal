var payButton = document.querySelector("#submit");
const setAmount = "150.00";
var form = $('form');

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
        // firstName: {
        //   selector: '#first-name',
        //   placeholder: 'first name'
        // },
        // surname: {
        //   selector: '#second-name',
        //   placeholder: 'surname'
        // },
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

        hostedFieldsInstance.tokenize(function (err, payload) {
          if (err) {
            console.error(err);
            return;
          }
          fetch("/btcheckout", {
              method: "POST",
              body: JSON.stringify({
              paymentMethodNonce: payload.nonce,
              // deviceData: deviceData,
              amount: setAmount
          }),
          headers: {
              "Content-Type": "application/json",
          },
          });
      });
      });
      });

      // Add PayPal Checkout component.
      braintree.paypalCheckout.create({
      client: clientInstance
      }, function (paypalCheckoutErr, paypalCheckoutInstance) {

          // Base PayPal SDK script options
          var loadPayPalSDKOptions = {
              currency: 'GBP',  // Must match the currency passed in with createPayment
              intent: 'capture', // Must match the intent passed in with createPayment
              components: 'buttons,messages',
              'enable-funding': 'paylater',
              'buyer-country': 'GB',
              commit: true,
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
                      intent: 'capture',
                      currency: 'GBP',
                      amount: setAmount,
                      userAction: 'PAY'
                  };

                  return paypalCheckoutInstance.createPayment(createPaymentRequestOptions);
                  },

                  onApprove: function (data, actions) {
                      // Return a promise that resolves/rejects when you're done
                      return new Promise((resolve, reject) => {
                          paypalCheckoutInstance.tokenizePayment(data, function (err, payload) {
                          if (err) {
                              console.error("tokenizePayment error", err);
                              // document.getElementById("divResponse").innerHTML =
                              // "<pre>Tokenization failed\n\n" + JSON.stringify(err, null, 2) + "</pre>";
                              return reject(err);
                          }
                          
                          // Call transcation API 
                          result = transactionPaymentNonce(payload, setAmount)

                          //SHOW RESPONSE
                          .then((result) => {
                              // document.getElementById("divResponse").innerHTML =
                              //     "<pre>" +
                              //     (result.success ? "Transaction successful" : "Transaction failed") +
                              //     "\n\n" +
                              //     JSON.stringify(result, null, 2) +
                              //     "</pre>";
                              resolve(result);
                              })
                              .catch((e) => {
                                  console.error("checkout error", e);
                                  document.getElementById("divResponse").innerHTML =
                                      "<pre>Checkout error\n\n" + (e && e.message ? e.message : String(e)) + "</pre>";
                                  reject(e);
                              });
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

                countryCode: 'GB',            // <-- set to your selling country 
                currencyCode: 'GBP', 

                // We recommend collecting billing address information, at minimum 
                // billing postal code, and passing that billing postal code with 
                // all Apple Pay transactions as a best practice. 
                // requiredBillingContactFields: ["postalAddress"] 

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
                      showMessage(("Payment Successful: ", resp.json()), true); 
                      console.log(resp.json()) 
  
                    } catch (err) { 
                        console.error('Payment failed:', err); 
                        session.completePayment(ApplePaySession.STATUS_FAILURE); 
                    } 
                }; 

                session.begin(); 
            }) 
      }); 
  });
});
var FXButton = document.getElementById("submit-button");
const setAmount = "150.00";
//var form = $('form');
let presentmentCurrency = 'GBP'; // default

//Toggles
document.addEventListener('DOMContentLoaded', () => {
  const presentmentDropdown = document.getElementById('presentment-currency');
  const settlementDropdown = document.getElementById('settlement-currency');
  const presentmentBtn = document.getElementById('presentment-toggle');
  const settlementBtn = document.getElementById('settlement-toggle');
  const selectedPresentment = document.getElementById('selected-presentment');
  const selectedSettlement = document.getElementById('selected-settlement');
  const menuItems = document.querySelectorAll('.dropdown-item');

  //Presentment currency 
  presentmentBtn.addEventListener('click', () => {
    presentmentDropdown.classList.toggle('show');
  });

  menuItems.forEach((item) => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      presentmentCurrency = item.dataset.currency;
      selectedLabel.textContent = presentmentCurrency;
      presentmentDropdown.classList.remove('show');
    });
  });

  // close when clicking outside
  document.addEventListener('click', (event) => {
    if (!presentmentDropdown.contains(event.target)) {
      presentmentDropdown.classList.remove('show');
    }
  });

  // Settlement currency
  settlementDropdown.addEventListener('click', (event) => {
    settlementDropdown.classList.toggle('show');
  });

  // close when clicking outside
  document.addEventListener('click', (event) => {
    if (!settlementDropdown.contains(event.target)) {
      settlementDropdown.classList.remove('show');
    }
  });
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
        }, function(err, hostedFieldsInstance) {
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

              try{
                const response = await fetch("/btcheckout", {
                    method: "POST",
                    headers: {
                    "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      paymentMethodNonce: threeDSPayload.nonce,
                      // deviceData: deviceData,
                      amount: setAmount
                    }),
                });

                const text = await response.text();
                const result = JSON.parse(text);
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
    });

});

// FX quote request
FXButton.addEventListener('click', async function (event) {

   try {
    const response = await fetch("/btcheckout/fx-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseCurrency: "GBP",
        quoteCurrency: "EUR",
        baseAmount: "1"
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const quote = await response.json();
    console.log(quote);
    // update UI with quote here
  } catch (error) {
    console.error("Error during FX quote request:", error);
  }

});


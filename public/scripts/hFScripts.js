var payButton = document.querySelector("#submit");
const setAmount = "100.00";
var form = $('form');

fetch("/btcheckout")
    .then((response) => {
        return response.text();
    })
    //This is for initialising the BT client using Client Token
    .then((client_token) => {
      braintree.client.create({
        authorization: client_token
      }, function (clientErr, clientInstance) {
        if (clientErr) {
          console.error(clientErr);
          return;
        }

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
  });
});
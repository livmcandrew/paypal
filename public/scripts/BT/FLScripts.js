//Client Side implementation 
var submitButton = document.getElementById("submit-button");
var paypalButton = document.getElementById("paypal-button");
const setAmount = "100.00";


fetch("/btcheckout")
    .then((response) => {
        return response.text();
    })
.then(async (client_token) => {

    // Create a client
    const clientInstance = await braintree.client.create({
        authorization: client_token
    });
    
    const dataCollectorInstance = await braintree.dataCollector.create({
        client: clientInstance,
    });

    const deviceData = dataCollectorInstance.deviceData;
    const styles = {
    //specify global styles here
    root: {
        backgroundColorPrimary: "#ffffff"
        }
    }

    // Create fastLane client
    const fastlane = await braintree.fastlane.create({
        authorization: client_token,
        client: clientInstance,
        deviceData,
        styles,
    });

    const identity = fastlane.identity;
    const profile = fastlane.profile;
    const FastlaneCardComponent = fastlane.FastlaneCardComponent;
    const FastlanePaymentComponent = fastlane.FastlanePaymentComponent;
    const FastlaneWatermarkComponent = fastlane.FastlaneWatermarkComponent;
    const {
        checkoutPageLoaded,
        apmSelected,
        emailSubmitted,
        orderPlaced,
        checkoutEnd,
        storeAccountCreated,
    } = fastlane.events;

    const cardComponent = await FastlaneCardComponent();
    const paymentComponent = await FastlanePaymentComponent();
    const fastlaneWatermark = (await fastlane.FastlaneWatermarkComponent({
        includeAdditionalInfo: true
    }));
    await fastlaneWatermark.render("#watermark-container");

    /* ######################################################################
    * State & data required for Fastlane
    * ###################################################################### */

    //get the values from UI 
    const emailSubmitButton = document.getElementById('email-submit-button');
    const paySubmitButton = document.getElementById('pay-submit-button');
    const newPaySubmitButton = document.getElementById('exit-submit-button');
    const form = document.getElementById('FL-form');
    const emailInput = document.getElementById('email');
    const shippingSection = document.getElementById('shipping');
    const paymentSection = document.getElementById('payment');
    const customerSection = document.getElementById('customer');
    const completeSection = document.getElementById('complete');
    const customerInput = document.getElementById('customer-input');
    let email, name, shippingAddress, paymentToken, billingAddress;

    //check the specific inputs fields in form  are valid using built-in browser validation
    const validateFields = (form, fields = []) => {
        if (fields.length <= 0) return true;
        let valid = true;
        for (const fieldName of fields) {
            const field = form.elements[fieldName];
            if (!field || !field.checkValidity()) {
            valid = false;
            field?.reportValidity();
            break;
            }
        }
        return valid;
    };

    // Define Shipping Address structure
    const getAddressSummary = ({
      firstName,
      lastName,
      company,
      streetAddress,
      extendedAddress,
      locality,
      region,
      postalCode,
      countryCodeAlpha2,
      phoneNumber,
    }) => {
      const isNotEmpty = (field) => !!field;
      const summary = [
        [firstName, lastName].filter(isNotEmpty).join(' '),
        company,
        [streetAddress, extendedAddress].filter(isNotEmpty).join(', '),
        [
          locality,
          [region, postalCode].filter(isNotEmpty).join(' '),
          countryCodeAlpha2,
        ]
          .filter(isNotEmpty)
          .join(', '),
        phoneNumber,
      ];
      return summary.filter(isNotEmpty).join('\n');
    };

    //Set Shipping Address to the html page using define structre
    const setShippingSummary = (address) => {
      shippingSection.querySelector('.summary').innerText =
        getAddressSummary(address);
    };

    /* ######################################################################
    * Begin Fast Lane flow
    * ###################################################################### */

    //lister for sumbit email
    emailSubmitButton.addEventListener('click', async () => {

        // Checks if email is empty or in a invalid format
        const isEmailValid = validateFields(form, ['email']);
        if (!isEmailValid) return;

        // disable button until authentication succeeds or fails
        emailSubmitButton.setAttribute('disabled', '');

        try {
            email = emailInput.value.trim();
            console.log('Checking email:', email);

            var renderFastlaneMemberExperience = false;

            //look up customer
            const { customerContextId } = await identity.lookupCustomerByEmail(email);
            console.log('lookup result:', customerContextId);

            // Email is associated with a Fastlane member or a PayPal member, 
            // send customerContextId to trigger the authentication flow.
            if (customerContextId) {
                const {authenticationState, profileData} = await identity.triggerAuthenticationFlow(customerContextId);
                console.log('Auth response:', authenticationState);

                // Fastlane member successfully authenticated themselves
                // profileData contains their profile details
                if (authenticationState === "succeeded") {
                    renderFastlaneMemberExperience = true;
                    name = profileData.name;
                    shippingAddress = profileData.shippingAddress;
                    paymentToken = profileData.card;
                    billingAddress = paymentToken?.paymentSource.card.billingAddress;
                    console.log('Profile Data:',profileData)
                } else {
                    // Member failed or cancelled to authenticate. Treat them as a guest payer
                    renderFastlaneMemberExperience = false;
                }
            } else {
                // No profile found with this email address. This is a guest payer
                renderFastlaneMemberExperience = false;
                console.log('No customerContextId');
            }

            // update HTML page with the FL customers values
            customerSection.hidden = false;
            customerInput.hidden = true;
            shippingSection.hidden = false;
            paymentSection.hidden = false;
            customerSection.querySelector('.summary').innerText = email;

            //if shipping found add the address
            if (shippingAddress) {
                setShippingSummary(shippingAddress);
                console.log(shippingAddress);
                //shippingSection.querySelector('.summary').innerText = shippingAddress;
            } else{
                console.log("shipping NOT FOUND");
            }

            //if payment Token found add the payment Method
            if (paymentToken){
                document.getElementById('selected-card').innerText = paymentToken
                ? ` •••• ${paymentToken.paymentSource.card.lastDigits}`
                : '';
            } else {
                console.log("payment Method NOT FOUND");
            }

        } catch (err) {
            console.error('Continue click failed:', err);
        } finally {
            emailSubmitButton.removeAttribute('disabled');
        }
    });
    
    //Listener for Payment Button
    paySubmitButton.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
            console.log('button clicked');
            console.log('billingAddress before token:', billingAddress);

            if (paymentToken){
                console.log('Payment token:', paymentToken);

                console.log('About to send transaction request');
                const response = await fetch('/btcheckout/FL/transaction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        deviceData,
                        email,
                        name,
                        shippingAddress,
                        paymentToken,
                        amount: setAmount
                    }),
                });

                console.log('Fetch returned:', response.status);

                const text = await response.text();
                const result = JSON.parse(text);
                const transaction = `Transcation: ${result.result.transaction.id}`;
                console.log(transaction);

                //Update UI with completed purchase
                if (response.status == 200){
                    customerSection.hidden = true;
                    customerInput.hidden = true;
                    shippingSection.hidden = true;
                    paymentSection.hidden = true;
                    completeSection.hidden = false;
                    completeSection.querySelector('.summary').innerText = transaction;
                }
            }
        } catch (error) {
            console.error('Pay flow failed:', error);
        }
    });

    //Listener for new Payment Button
    newPaySubmitButton.addEventListener('click', async (e) => {
        //Update UI with completed purchase
            customerInput.hidden = false;
            completeSection.hidden = true;
            emailInput.value = "";
    });
});

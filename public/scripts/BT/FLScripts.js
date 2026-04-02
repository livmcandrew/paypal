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
    const form = document.getElementById('FL-form');
    const emailSubmitButton = document.getElementById('email-submit-button');
    const paySubmitButton = document.getElementById('pay-submit-button');
    const newPaySubmitButton = document.getElementById('exit-submit-button');
    const cancelButton = document.getElementById('cancel-submit-button');
    const editShipping = document.getElementById('edit-shipping-button');
    const editPayment = document.getElementById('edit-payment-button');
    
    const emailInput = document.getElementById('email');
    const shippingSection = document.getElementById('shipping');
    const paymentSection = document.getElementById('payment');
    const customerSection = document.getElementById('customer');
    const completeSection = document.getElementById('complete');
    const customerInput = document.getElementById('customer-input');
    let email, name, shippingAddress, paymentToken, billingAddress;
    let shippingFound, paymentFound = false;

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

    //Set Shipping Address to display in the HTML page using define structre
    const setShippingSummary = (address) => {
      shippingSection.querySelector('.summary').innerText =
        getAddressSummary(address);
    };

    //Set the Payment Method to display in the HTML page
    const setPaymentSummary = (paymentToken) => {
      document.getElementById('selected-card').innerText = paymentToken
        ? ` •••• ${paymentToken.paymentSource.card.lastDigits}`
        : '';
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
            shippingSection.querySelector('fieldset').hidden = true;
            customerSection.querySelector('.summary').innerText = email;
      
            //if shipping found add the address
            if (shippingAddress) {
                setShippingSummary(shippingAddress);
                shippingFound = true;
            } else{
                shippingSection.querySelector('fieldset').hidden = false;
                editShipping.hidden = true;
                //shippingSection.querySelector('.summary').innerText = "No shipping information found";
            }

            //if payment Token found add the payment Method
            if (paymentToken){
                setPaymentSummary(paymentToken);
                paymentFound = true;
                paymentSection.querySelector('#visa-image').hidden = false;
            } else {
                paymentSection.querySelector('.summary').innerText = "No payment information found";
            }

            //validation
            console.log("payment found =", paymentFound);
            console.log("shipping found =", shippingFound);

            if (!paymentFound || !shippingFound){
                paySubmitButton.setAttribute('disabled', '');
                console.log("Missing payment or shipping → disabling button");
            }

        } catch (err) {
            console.error('Continue click failed:', err);
        } finally {
            emailSubmitButton.removeAttribute('disabled');
        }
    });

    //Listener for Edit Shipping Address
    editShipping.addEventListener('click', async() =>{
        const { selectionChanged, selectedAddress } = 
            await profile.showShippingAddressSelector();    //opens FastLane Shipping address selector
        
        if (selectionChanged){
            shippingAddress = selectedAddress
            setShippingSummary(shippingAddress); //display on HTML
            console.log(shippingAddress);
        }

    });

    //Listener for Edit Payment Method
    editPayment.addEventListener('click', async() =>{
        const { selectionChanged, selectedCard } = 
            await profile.showCardSelector();    //opens FastLane payment Method selector
        
        if (selectionChanged){
            paymentToken = selectedCard 
            setPaymentSummary(paymentToken);  //display on HTML
            console.log(paymentToken);
        }

    });
    
    //Listener for Payment Button
    paySubmitButton.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
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

    //Lister for Cancel Button
    cancelButton.addEventListener('click', async (e) => {
        customerSection.hidden = true;
        customerInput.hidden = false;
        shippingSection.hidden = true;
        paymentSection.hidden = true;
        emailInput.value = "";
        name = null;
        shippingAddress = null;
        paymentToken = null;
        billingAddress = null;
        console.log("FastLane cancelled");
    });

    //Listener for new Payment Button
    newPaySubmitButton.addEventListener('click', async (e) => {
        //Update UI with completed purchase
            customerInput.hidden = false;
            completeSection.hidden = true;
            emailInput.value = "";
            name = null;
            shippingAddress = null;
            paymentToken = null;
            billingAddress = null;
    });
});

//pulls cards detials from the form
function getCardData() {
    const name   = document.getElementById('cardName').value.trim();
    const number = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const expiry = document.getElementById('cardExpiry').value.trim();
    const cvv    = document.getElementById('cardCvv').value.trim();

    // Split expiry into month / year
    const [expMonth, expYear] = expiry.split('/').map(s => s.trim());

    return {
        name:             name,
        number:           number,
        expiry_month:     expMonth,   // "12"
        expiry_year:      '20' + expYear, // "2026"
        security_code:    cvv
    }
}
 
//stores 3DS Resutls
const threeDSResult = {
  type: "THREE_DS_AUTHENTICATION",
  enrolled: "Y",
  card_brand: "VISA",
  pares_status: "Y",
  cavv: "AAABCHMAAGEzVASAZwAAAAAAAAA=",
  eci_flag: "05",
  three_ds_version: "2.2.0",
  directory_server_transaction_id: "0fbf4884-c73a-4ddb-9c6b-6d1e98c68346",
  authentication_response: "Y",
  authentication_status_reason: null,
  three_ds_requestor_id: "MERCHANT_3DS_REQUESTOR_ID",
  three_ds_server_trans_id: "optional-3ds-server-trans-id",
  three_ri_ind: "06",
  prior_authentication_reference: "original-cit-ds-trans-id-uuid",
  prior_authentication_timestamp: "2026-03-01T12:00:00Z"
};

//random invoice id 
const invoiceId = `INV-${Math.random().toString(36).substring(2, 15)}`;

//then call the order api with threeDSResult and getCardData. 
async function createOrderCallback() {
    try {
        const cardData = getCardData(); //call card details
        const response = await fetch("/ppcheckout/api/orders/nosdk", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            // use the "body" param to optionally pass additional order information like product ids and quantities
            body: JSON.stringify({
                cart: [
                    {
                        invoice_id: invoiceId,
                        name: "Cashmere Knitted Jumper",
                        quantity: "1",
                        value: "100",
                        sku: "sku01",
                        currencyCode: "GBP",
                        description: "Cashmere Knitted Jumper",
                    },
                ],
                card: {
                    name: cardData.name,
                    number: cardData.number,
                    expiry: `${cardData.expiry_year}-${cardData.expiry_month.padStart(2, '0')}`,
                    security_code: cardData.security_code,
                }, 
                authentication_results: [threeDSResult]
            }),
        });

        const orderData = await response.json();
        console.log("Order created successfully:", orderData);
        resultMessage(`Order created successfully! Order ID: ${orderData.id}`);
        if (orderData.id) {
            return orderData.id;
        }
        const errorDetail = orderData?.details?.[0];
        const errorMessage = errorDetail
            ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
            : JSON.stringify(orderData);

        throw new Error(errorMessage);

    } catch (error) {
        console.error(error);
        // resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`);
    }
}


// Example: hook it into your submit button
document.getElementById('payBtn').addEventListener('click', () => {
    createOrderCallback();

    //clear form after submission
    document.getElementById('cardName').value = '';
    document.getElementById('cardNumber').value = '';
    document.getElementById('cardExpiry').value = '';
    document.getElementById('cardCvv').value = '';

    //add message saying "transaction in process" or something similar
    resultMessage("Processing transaction...");
});

//write response to HTML page
function resultMessage(message) {
     const container = document.querySelector("#result-message");
    container.innerHTML = "";
    container.innerHTML = message;
}

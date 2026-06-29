//script for toggle 
let DSStatus = "paypal"; 
document.addEventListener('DOMContentLoaded', function () {
    const tdsToggle = document.getElementById('tdsToggle');
    const tdsBadge  = document.getElementById('tdsBadge');
    const tdsInfo   = document.getElementById('tdsInfo');

    tdsToggle.addEventListener('change', function () {
      if (this.checked) {
        tdsBadge.textContent = 'ON';
        tdsBadge.classList.remove('tds-badge--off');
        tdsBadge.classList.add('tds-badge--on');
        tdsInfo.classList.add('tds-info-box--visible');
        DSStatus = "external";
        console.log('3DS Set to:', DSStatus);
      } else {
        tdsBadge.textContent = 'OFF';
        tdsBadge.classList.remove('tds-badge--on');
        tdsBadge.classList.add('tds-badge--off');
        tdsInfo.classList.remove('tds-info-box--visible');
        DSStatus = "paypal";
        console.log('3DS Set to:', DSStatus);
      }
    });
});

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
 
//static tores 3DS Resutls (Option 1)
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

//clear fields
async function clearFields() {
    //clear form after submission
    document.getElementById('cardName').value = '';
    document.getElementById('cardNumber').value = '';
    document.getElementById('cardExpiry').value = '';
    document.getElementById('cardCvv').value = '';

    //hide form , labels, and button fields after submission
    document.getElementById('cardName').style.display = 'none';
    document.getElementById('cardNumber').style.display = 'none';
    document.getElementById('cardExpiry').style.display = 'none';       
    document.getElementById('cardCvv').style.display = 'none';
    document.getElementById('payBtn').style.display = 'none';
    document.querySelectorAll('label').forEach(label => label.style.display = 'none');
};

//random invoice id 
const invoiceId = `INV-${Math.random().toString(36).substring(2, 15)}`;

//get reset button 
const resetBtn = document.getElementById('resetBtn');

//Option 1 - no SDK with 3DS Pass Through
//then call the order api with external threeDSResult and getCardData. 
async function createOrderCallback3DSPass(cardData) {
    try {
        const response = await fetch("/ppcheckout/api/orders/nosdk/ex3DS", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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
                authentication_results: [threeDSResult]  //only need for 3DS External pass through
            }),
        });

        const orderData = await response.json();
        console.log("Order created successfully with 3DS External Pass Through:", orderData);
        resultMessage(`Order created successfully with 3DS External Pass Through! Order ID: ${orderData.id}`);

        //un hide reset button after successful transaction
        resetBtn.hidden = false;
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
    }
}

//Option 2 - no SDK with PP 3DS
//then call the order api with getCardData. 
async function createOrderCallback(cardData) {
    try {
        console.log("cardData:", cardData);
        const response = await fetch("/ppcheckout/api/orders/nosdk/pp3DS", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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
            }),
        });

        const orderData = await response.json();
        console.log("Order created successfully with PayPal 3DS:", orderData);
        resultMessage(`Order created successfully with PayPal 3DS! Order ID: ${orderData.id}`);

        // Handle 3DS challenge
        if (orderData.status === "PAYER_ACTION_REQUIRED") {
            const actionLink = orderData.links.find(link => link.rel === "payer-action");
            if (actionLink) {
                console.log("3DS required, redirecting to:", actionLink.href);
                sessionStorage.setItem("pendingOrderId", orderData.id); // save order ID (as page reload happens)
                window.location.href = actionLink.href;
                return;
            }
        }

        //unhide reset button after successful transaction
        resetBtn.hidden = false;
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
    }
}

//Capture order (both options)
async function captureOrder(orderId) {
    try {
        const response = await fetch(`/ppcheckout/nosdk/api/orders/${orderId}/capture`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
        });

        const captureData = await response.json();
        console.log("Capture response:", captureData);

        if (captureData.status === "COMPLETED") {
            resultMessage(`Order completed successfully! Order ID: ${captureData.id}`);
            resetBtn.hidden = false;
        } else {
            const errorDetail = captureData?.details?.[0];
            const errorMessage = errorDetail
                ? `${errorDetail.issue} ${errorDetail.description} (${captureData.debug_id})`
                : JSON.stringify(captureData);
            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error(error);
        resultMessage(`Capture failed...<br><br>${error}`);
    }
}

//Call this on page load if returning from 3DS challenge (runs capture if successfull)
async function handleReturnFrom3DS() {
    const urlParams = new URLSearchParams(window.location.search);
    const liabilityShift = urlParams.get("liability_shift");
    const orderId = sessionStorage.getItem("pendingOrderId"); // 👈 retrieve it

    //console.log("handleReturnFrom3DS fired, orderId:", orderId, "liability_shift:", liabilityShift);

    if (orderId && liabilityShift) {
        sessionStorage.removeItem("pendingOrderId"); // clean up
        resultMessage("3DS verified, completing order...");
        await captureOrder(orderId);
    }
}

// Hide fields if returning from 3DS, otherwise clear any stale sessionStorage
if (sessionStorage.getItem("pendingOrderId") && new URLSearchParams(window.location.search).get("liability_shift")) {
    clearFields();
} else {
    sessionStorage.removeItem("pendingOrderId"); // clear stale value on fresh page load
}

//runs every time page reloads but only triggers when liability_shift changes
handleReturnFrom3DS();

// payment when submitted
document.getElementById('payBtn').addEventListener('click', async () => {
    const cardData = getCardData(); //call card details
    resultMessage("Processing transaction...");
    //Option 1
    if (DSStatus == "external"){
        await createOrderCallback3DSPass(cardData);
    }

    //Option 2 
    if (DSStatus == "paypal"){
        await createOrderCallback(cardData);
    }

    clearFields();
});

//write response to HTML page
function resultMessage(message) {
     const container = document.querySelector("#result-message");
    container.innerHTML = "";
    container.innerHTML = message;
}

//add a buttont to reset page after transaction
resetBtn.addEventListener('click', () => {
    location.reload();
});

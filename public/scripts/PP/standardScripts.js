// Render the PayPal button
const paypalButtons = window.paypal.Buttons({
   message: {
        amount: 100,
    },
    style: {
        shape: "rect",
        layout: "vertical",
        color: "gold",
        label: "paypal",
    },
   //set up the transaction when a payment button is clicked
    createOrder: createOrderCallback,
    onApprove: onApproveCallback,
    onCancel: onCancelCallback,
}).render("#paypal-button");

// Render each field after checking for eligibility
const cardField = window.paypal.CardFields({
    createOrder: createOrderCallback,
    onApprove: onApproveCallback,
    style: {
        input: {
            "font-size": "16px",
            "font-family": "courier, monospace",
            "font-weight": "lighter",
            color: "#ccc",
        },
        ".invalid": { color: "purple" },
    },
});

if (cardField.isEligible()) {
    const nameField = cardField.NameField({
        style: { input: { color: "blue" }, ".invalid": { color: "purple" } },
    });
    nameField.render("#card-name-field-container");

    const numberField = cardField.NumberField({
        style: { input: { color: "blue" } },
    });
    numberField.render("#card-number-field-container");

    const cvvField = cardField.CVVField({
        style: { input: { color: "blue" } },
    });
    cvvField.render("#card-cvv-field-container");

    const expiryField = cardField.ExpiryField({
        style: { input: { color: "blue" } },
    });
    expiryField.render("#card-expiry-field-container");

    // Add click listener to submit button and call the submit function on the CardField component
    document
        .getElementById("card-field-submit-button")
        .addEventListener("click", () => {
            cardField
                .submit({
                    // Optional shipping and billing address information
                })
                .then(() => {
                    console.log("Card fields submitted successfully");
                })
                .catch((error) => {
                    // Handle validation or submission errors
                    console.error("Card field submission failed", error);
                    resultMessage(`Payment failed: ${error.message}`);
            });
        });
}

//Create Order function
async function createOrderCallback() {
    try {
        const response = await fetch("/ppcheckout/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            // use the "body" param to optionally pass additional order information like product ids and quantities
            body: JSON.stringify({
                cart: [
                    {
                        id: "12344543",
                        quantity: "Cashmere Knitted Jumper",
                    },
                ],
            }),
        });

        const orderData = await response.json();

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

//On Approve function
async function onApproveCallback(data, actions) {
    try {
        const response = await fetch(
            `/ppcheckout/api/orders/${data.orderID}/capture`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        const orderData = await response.json();
        const errorDetail = orderData?.details?.[0];

        if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
            // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart() recoverable state, per
            return actions.restart();

        } else if (errorDetail) {
            // (2) Other non-recoverable errors -> Show a failure message
            throw new Error(
                `${errorDetail.description} (${orderData.debug_id})`
            );
        } else if (!orderData.purchase_units) {
            throw new Error(JSON.stringify(orderData));
        } else {
            // (3) Successful transaction -> Show confirmation or thank you message
            const transaction =
                orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
                orderData?.purchase_units?.[0]?.payments
                    ?.authorizations?.[0];
            resultMessage(
                `Transaction ${transaction.status}: ${transaction.id}`
            );
            console.log(
                "Capture result",
                orderData,
                JSON.stringify(orderData, null, 2)
            );
        }
    } catch (error) {
        console.error(error);
        resultMessage(
            `Sorry, your transaction could not be processed...<br><br>${error}`
        );
    }
}

//On Cancel function
async function onCancelCallback(data) {
    console.log('PayPal payment cancelled', JSON.stringify(data, 0, 2));
}

// Example function to show a result to the user in UI
function resultMessage(message) {
    const container = document.querySelector("#result-message");
    container.innerHTML = message;
}
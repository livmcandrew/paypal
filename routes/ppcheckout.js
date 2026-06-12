const express = require("express");
require("dotenv").config();
const {
    ApiError,
    CheckoutPaymentIntent,
    Client,
    Environment,
    LogLevel,
    OrdersController,
    PaymentsController,
    PaypalExperienceLandingPage,
    PaypalExperienceUserAction,
    ShippingPreference,
} = require("@paypal/paypal-server-sdk");
const bodyParser = require("body-parser");
const router = express.Router();
router.use(bodyParser.json()); 
module.exports = router;

const {
    PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET,
    PORT = 8080,
} = process.env;

const client = new Client({
    clientCredentialsAuthCredentials: {
        oAuthClientId: PAYPAL_CLIENT_ID,
        oAuthClientSecret: PAYPAL_CLIENT_SECRET,
    },
    timeout: 0,
    environment: Environment.Sandbox,
    logging: {
        logLevel: LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logHeaders: true },
    },
});

const ordersController = new OrdersController(client);
const paymentsController = new PaymentsController(client);


// /**
//  * Create an order to start the transaction.
//  */
// const createOrder = async (cart) => {
//    const collect = {
//         body: {
//             intent: "CAPTURE",
//             purchaseUnits: [
//                 {
//                     amount: {
//                         currencyCode: "GBP",
//                         value: "100",
//                         breakdown: {
//                             itemTotal: {
//                                 currencyCode: "GBP",
//                                 value: "100",
//                             },
//                         },
//                     },
//                     // lookup item details in `cart` from database
//                     items: [
//                         {
//                             name: "T-Shirt",
//                             unitAmount: {
//                                 currencyCode: "GBP",
//                                 value: "100",
//                             },
//                             quantity: "1",
//                             description: "Super Fresh Shirt",
//                             sku: "sku01",
//                         },
//                     ],
//                 },
//             ],
//         },
//         prefer: "return=minimal",
//     };
   

//     try {
//         const { body, ...httpResponse } = await ordersController.createOrder(
//             collect
//         );
//         // Get more response info...
//         // const { statusCode, headers } = httpResponse;
//         return {
//             jsonResponse: JSON.parse(body),
//             httpStatusCode: httpResponse.statusCode,
//         };
//     } catch (error) {
//         if (error instanceof ApiError) {
//             // const { statusCode, headers } = error;
//             throw new Error(error.message);
//         }
//     }
// };

// // createOrder route
// router.post("/api/orders", async (req, res) => {
//     try {
//         // use the cart information passed from the front-end to calculate the order amount detals
//         const { cart } = req.body;
//         const { jsonResponse, httpStatusCode } = await createOrder(cart);
//         res.status(httpStatusCode).json(jsonResponse);
//     } catch (error) {
//         console.error("Failed to create order:", error);
//         res.status(500).json({ error: "Failed to create order." });
//     }
// });


/**
 * Capture payment for the created order to complete the transaction.
 */
const captureOrder = async (orderID) => {
    const collect = {
        id: orderID,
        prefer: "return=minimal",
    };

    try {
        const { body, ...httpResponse } = await ordersController.captureOrder(
            collect
        );
        // Get more response info...
        // const { statusCode, headers } = httpResponse;
        return {
            jsonResponse: JSON.parse(body),
            httpStatusCode: httpResponse.statusCode,
        };
    } catch (error) {
        if (error instanceof ApiError) {
            // const { statusCode, headers } = error;
            throw new Error(error.message);
        }
    }
};

// captureOrder route
router.post("/api/orders/:orderID/capture", async (req, res) => {
    try {
        const { orderID } = req.params;
        const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
        res.status(httpStatusCode).json(jsonResponse);
    } catch (error) {
        console.error("Failed to create order:", error);
        res.status(500).json({ error: "Failed to capture order." });
    }
});


/*Create an order for APP SWITCH to start the transaction.*/
const createOrder = async (cart) => {
   const collect = {
        body: {
            intent: "CAPTURE",
            purchaseUnits: [
                {
                    amount: {
                        currencyCode: "GBP",
                        value: "100",
                        breakdown: {
                            itemTotal: {
                                currencyCode: "GBP",
                                value: "100",
                            },
                        },
                    },
                    // lookup item details in `cart` from database
                    items: [
                        {
                            name: "T-Cashmere Knitted Jumper",
                            unitAmount: {
                                currencyCode: "GBP",
                                value: "100",
                            },
                            quantity: "1",
                            description: "Cashmere Knitted Jumper",
                            sku: "sku01",
                        },
                    ],
                },
            ],
           paymentSource: {
                paypal: {
                    experienceContext: {
                        userAction: PaypalExperienceUserAction.PayNow,
                       returnUrl:
                            "https://paypal-ppcp.onrender.com/html/PP/appSwitch.html",
                        cancelUrl:
                            "https://paypal-ppcp.onrender.com/html/PP/appSwitch.html",
                        appSwitchPreference: {
                            launchPaypalApp: true,
                        },
                    },
                },
            },
        },
        prefer: "return=minimal",
    };
   

    try {
        const { body, ...httpResponse } = await ordersController.createOrder(
            collect
        );
        // Get more response info...
        // const { statusCode, headers } = httpResponse;
        return {
            jsonResponse: JSON.parse(body),
            httpStatusCode: httpResponse.statusCode,
        };
    } catch (error) {
        if (error instanceof ApiError) {
            // const { statusCode, headers } = error;
            throw new Error(error.message);
        }
    }
};

// createOrder route for APP SWTICH
router.post("/api/orders", async (req, res) => {
    try {
        // use the cart information passed from the front-end to calculate the order amount detals
        const { cart } = req.body;
        const { jsonResponse, httpStatusCode } = await createOrder(cart);
        res.status(httpStatusCode).json(jsonResponse);
    } catch (error) {
        console.error("Failed to create order:", error);
        res.status(500).json({ error: "Failed to create order." });
    }
});

//no SDK and 3DS flow (requires authentication and 3DS passthrough)
const createOrder3DSexternal = async (cart, card, authentication_results) => {
    const { invoice_id, name, value, currencyCode, description, sku, quantity } = cart[0];
    const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");

    //get client access token
    const tokenResponse = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
        method: "POST",
        headers: {
            "Authorization": `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
    });
    const { access_token } = await tokenResponse.json();

    // build Order API payload 
    const payload = {
        intent: "CAPTURE",
        payment_source: {
            card: {
                name:          card.name,
                number:        card.number,
                expiry:        card.expiry,
                security_code: card.security_code,
            },
            authentication_results: authentication_results  // ✅ sibling of card
        },
        application_context: {
            payment_method: {
                payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
                standard_entry_class_code: "WEB"
            },
            vault: false
        },
        purchase_units: [
            {
                invoice_id:  invoice_id,
                description: description,
                amount: {
                    currency_code: currencyCode,
                    value:         value
                }
            }
        ]
    };

    // call the PayPal Orders API directly with the access token and payload!
    const orderAPI = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "PayPal-Request-Id": `request-${Math.random().toString(36).substring(2, 15)}`,
            "Authorization": `Bearer ${access_token}`
        },
        body: JSON.stringify(payload)
    });

    const jsonResponse = await orderAPI.json();
    return { jsonResponse, httpStatusCode: orderAPI.status };
};


//createOrder api route for NO SDK flow
router.post("/api/orders/nosdk", async (req, res) => {
    try {
        const { cart, card, authentication_results } = req.body;
        //console.log("req.body:", JSON.stringify(req.body, null, 2)); // ✅ see what's arriving
        const { jsonResponse, httpStatusCode } = await createOrder3DSexternal(cart, card, authentication_results);
        res.status(httpStatusCode).json(jsonResponse);
        console.log("Order created successfully:", httpStatusCode); // ✅ log the successful response
    } catch (error) {
        console.error("Failed to create order:", error.message); // ✅ log the actual error
        res.status(500).json({ error: "Failed to create order." });
    }
});
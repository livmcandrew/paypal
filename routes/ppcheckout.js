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

const path = require("path");

// Add this GET route
router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/html/PP/nosdk.html"));
});

/**
 * Create an order to start the transaction.
 */
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
                            name: "T-Shirt",
                            unitAmount: {
                                currencyCode: "GBP",
                                value: "100",
                            },
                            quantity: "1",
                            description: "Super Fresh Shirt",
                            sku: "sku01",
                        },
                    ],
                },
            ],
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

// createOrder route
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
const createOrderAPPS = async (cart) => {
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
        const { body, ...httpResponse } = await ordersController.createOrderAPPS(
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

//NO SDK APIS --------------------------------------------------
// Option 1 : no SDK and 3DS External Passthrough flow (requires authentication)
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
router.post("/api/orders/nosdk/ex3DS", async (req, res) => {
    try {
        const { cart, card, authentication_results } = req.body;
        //console.log("req.body:", JSON.stringify(req.body, null, 2)); 
        const { jsonResponse, httpStatusCode } = await createOrder3DSexternal(cart, card, authentication_results);
        res.status(httpStatusCode).json(jsonResponse);
        console.log("Order created successfully:", httpStatusCode);
    } catch (error) {
        console.error("Failed to create order:", error.message); 
        res.status(500).json({ error: "Failed to create order." });
    }
});

//Options 2 : no SDK (requires authentication, uses PP 3DS)
// Step 1 - Get Auth & Create Order
const createOrder3DSPP = async (cart, card) => {
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
                attributes: {                          
                    verification: {
                        method: "SCA_ALWAYS"
                    }
                }
            }
        },
        application_context: {
            //return_url: "http://localhost:3000/html/PP/nosdk.html?",
            //cancel_url: "http://localhost:3000/html/PP/nosdk.html?cancel",
            return_url: "https://paypal-ppcp.onrender.com/html/PP/nosdk.html?",
            cancel_url: "https://paypal-ppcp.onrender.com/html/PP/nosdk.html?cancel",
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
    console.log("PayPal order response:", JSON.stringify(jsonResponse, null, 2));
    return { jsonResponse, httpStatusCode: orderAPI.status, access_token};    
};

// Step 2 — Capture Order (called after 3DS challenge completes)
const captureOrderNoSDK = async (orderId) => {
    //get client access token
    const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
    const tokenResponse = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
        method: "POST",
        headers: {
            "Authorization": `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
    });
    const { access_token } = await tokenResponse.json();

    const response = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${access_token}`
        }
    });

    const jsonResponse = await response.json();
    return { jsonResponse, httpStatusCode: response.status };
};

//createOrder api route for NO SDK flow
router.post("/api/orders/nosdk/pp3DS", async (req, res) => {
    try {
        const { cart, card } = req.body;
        
        //Step 1 - Create Order 
        const { jsonResponse: orderData, httpStatusCode: orderStatus } = await createOrder3DSPP(cart, card);
        if (orderStatus !== 201) {
            return res.status(orderStatus).json(orderData);
        }

        return res.status(orderStatus).json(orderData);

    } catch (error) {
        console.error("Failed to create order:", error.message); 
        res.status(500).json({ error: "Failed to create order." });
    }
});

//Capture after 3DS challenge completes
router.post("/nosdk/api/orders/:orderId/capture", async (req, res) => {
    try {
        const { orderId } = req.params;
        const { jsonResponse, httpStatusCode } = await captureOrderNoSDK(orderId);
        console.log("Order captured:", httpStatusCode, jsonResponse.status);
        res.status(httpStatusCode).json(jsonResponse);
    } catch (error) {
        console.error("Failed to capture order:", error.message);
        res.status(500).json({ error: "Failed to capture order." });
    }
});
//---------------------------------------------------------------

//v6 create an order api 
const v6CreateOrder = async (cart) =>{
    const {amount, invoice_id, description, quantity, sku, currencyCode, name} = cart[0]

    const payload = {
        body: {
            intent: "CAPTURE",
            purchaseUnits: [
                {
                    invoice_id:  invoice_id,
                    description: description,
                    amount: {
                        currencyCode: currencyCode,
                        value:         amount
                    },
                },
            ],
        },
        prefer: "return=minimal",
    };
   

    try {
        const { body, ...httpResponse } = await ordersController.createOrder(payload);
        return {
            jsonResponse: JSON.parse(body),
            httpStatusCode: httpResponse.statusCode,
        };
    } catch (error) {
        console.error("v6CreateOrder error:", error); // ← add this to see the real error
        throw new Error(error.message); // ← always throw regardless of error type
    }

};

//createOrder api route for JS SDK v6
router.post("/api/orders/v6", async (req, res) => {
    try{
        const {cart} = req.body;
        const {jsonResponse, httpStatusCode} = await v6CreateOrder(cart);
        res.status(httpStatusCode).json(jsonResponse);
        console.log("Order created successfully:", httpStatusCode);
    } catch (error){
        console.error("Failed to create order:", error.message); 
        res.status(500).json({ error: "Failed to create order." });
    }
});
// app.js
process.argv
const integrationArg = process.argv.find(arg => arg.startsWith("int="));
const integration = integrationArg?.split("=")[1];
const express = require("express");
const path = require("path");
const ppcheckout = require("./routes/ppcheckout");
const btcheckout = require("./routes/btcheckout");
const { json, urlencoded } = require("body-parser");
const braintree = require("braintree");
//console.log(integration)

const app = express();
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// changes the to correct checkout page depending on integration requested
if (integration === "pp") {
  app.use("/ppcheckout", ppcheckout);
  console.log("PayPal checkout enabled");
} else if (integration === "bt") {
  app.use("/btcheckout", btcheckout);
  console.log("Braintree checkout enabled");
} else {
  console.error("No valid integration specified. Use int=pp or int=bt");
  process.exit(1);
}


// // route to checkout.js
// app.use("/checkout", checkout);

// run server 
app.get("/", (req, res) => {
  res.send(index.html);
});

app.listen(3000, () => {
  console.log("App listening on port 3000");
});

module.exports = app;
const gateway = new braintree.BraintreeGateway({
    environment: braintree.Environment.Sandbox,
    merchantId: process.env.BT_MERCHANT_ID,
    publicKey: process.env.BT_PUBLIC_KEY,
    privateKey: process.env.BT_PRIVATE_KEY,
});
exports.gateway = gateway;



//to run app either choose:
//node app.js int=bt
//node app.js int=pp
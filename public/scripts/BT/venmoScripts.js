var venmoButton = document.getElementById('venmo-button');
var deviceData;
console.log('[venmo] button element:', venmoButton);

fetch("/btcheckout/usdMAID")
    .then((response) => {
        console.log('[venmo] fetch status:', response.status);
        if (!response.ok) throw new Error('Bad response: ' + response.status);
        return response.text();
    })
    .then((client_token) => {

        braintree.client.create({
            authorization: client_token
        }, function (clientErr, clientInstance) {

            if (clientErr) {
                console.error('Error creating client:', clientErr);
                return;
            }

            braintree.dataCollector.create({
                client: clientInstance
            }, function (err, dataCollectorInstance) {
                if (err) return;
                deviceData = dataCollectorInstance.deviceData;
                //console.log('[venmo] deviceData:', deviceData);
            });

            braintree.venmo.create({
                client: clientInstance,
                profileId: '4662967699244531884',
                enableVenmoSandbox: true,
                allowDesktop: true,
                mobileWebFallBack: true,
                allowDesktopWebLogin: true,
                paymentMethodUsage: 'multi_use',
            }, function (venmoErr, venmoInstance) {

                if (venmoErr) {
                    console.error('Error creating Venmo:', venmoErr);
                    return;
                }

                var supported = venmoInstance.isBrowserSupported();
                if (!supported) {
                    console.log('Browser does not support Venmo');
                    return;
                }

                displayVenmoButton(venmoInstance);

                if (venmoInstance.hasTokenizationResult()) {
                    venmoInstance.tokenize(function (tokenizeErr, payload) {
                        if (tokenizeErr) {
                            handleVenmoError(tokenizeErr);
                        } else {
                            handleVenmoSuccess(payload);
                        }
                    });
                }
            });

            function displayVenmoButton(venmoInstance) {
                console.log('[venmo] inside displayVenmoButton, setting display block on:', venmoButton);
                venmoButton.style.display = 'block';
                console.log('[venmo] button style after set:', venmoButton.outerHTML);

                venmoButton.addEventListener('click', function () {
                    venmoButton.disabled = true;
                    venmoInstance.tokenize(function (tokenizeErr, payload) {
                        venmoButton.removeAttribute('disabled');
                        if (tokenizeErr) {
                            handleVenmoError(tokenizeErr);
                        } else {
                            handleVenmoSuccess(payload);
                        }
                    });
                });
            }

            function handleVenmoError(err) {
                console.error('Venmo error:', err);
            }

            function handleVenmoSuccess(payload) {

                fetch('/btcheckout/venmo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paymentMethodNonce: "fake-venmo-account-nonce",
                        deviceData: deviceData,
                        amount: '100.00' 
                    })
                })
                .then((res) => res.json())
                .then((result) => console.log('Transaction result:', result))
                .catch((err) => console.error('Transaction request failed:', err));
            }
        });
    })
    .catch((err) => {
        console.error('Failed to init Venmo flow:', err);
    });
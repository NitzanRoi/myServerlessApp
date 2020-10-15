/*global WildRydes _config AmazonCognitoIdentity AWSCognito*/

var WildRydes = window.WildRydes || {};

(function scopeWrapper($) {
    var signinUrl = '/signin.html';

    var poolData = {
        UserPoolId: _config.cognito.userPoolId,
        ClientId: _config.cognito.userPoolClientId
    };

    var userPool;

    userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    if (typeof AWSCognito !== 'undefined') {
        AWSCognito.config.region = _config.cognito.region;
    }

    WildRydes.signOut = function signOut() {
        userPool.getCurrentUser().signOut();
    };

    WildRydes.authToken = new Promise(function fetchCurrentAuthToken(resolve, reject) {
        var cognitoUser = userPool.getCurrentUser();
        if (cognitoUser) {
            cognitoUser.getSession(function sessionCallback(err, session) {
                if (err) {
                    reject(err);
                } else if (!session.isValid()) {
                    resolve(null);
                } else {
                    resolve(session.getIdToken().getJwtToken());
                }
            });
        } else {
            resolve(null);
        }
    });

    function register(email, password, onSuccess, onFailure) {
        var dataEmail = {
            Name: 'email',
            Value: email
        };
        var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);
        userPool.signUp(toUsername(email), password, [attributeEmail], null,
            function signUpCallback(err, result) {
                if (!err) {
                    onSuccess(result);
                } else {
                    onFailure(err);
                }
            }
        );
    }

    function signin(email, password, onSuccess, onFailure) {
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
            Username: toUsername(email),
            Password: password
        });
        var cognitoUser = createCognitoUser(email);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: onSuccess,
            onFailure: onFailure
        });
    }

    function verify(email, code, onSuccess, onFailure) {
        createCognitoUser(email).confirmRegistration(code, true, function confirmCallback(err, result) {
            if (!err) {
                onSuccess(result);
            } else {
                onFailure(err);
            }
        });
    }

    function createCognitoUser(email) {
        return new AmazonCognitoIdentity.CognitoUser({
            Username: toUsername(email),
            Pool: userPool
        });
    }

    function toUsername(email) {
        return email.replace('@', '-at-');
    }

    $(function onDocReady() {
        $('#registrationForm').submit(handleRegister);
        $('#verifyForm').submit(handleVerify);
        $('#signinForm').submit(handleSignin);
    });

    function setCookie(email) {
        var expires = "";
        var date = new Date();
        date.setTime(date.getTime() + (1 * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
        document.cookie = "email=" + email + expires + "; path=/";
    }

    function handleSignin(event) {
        var email = $('#emailInputSignin').val();
        var password = $('#passwordInputSignin').val();
        event.preventDefault();
        signin(email, password,
            function signinSuccess() {
                console.log('Successfully Logged In');
                setCookie(email);
                window.location.href = 'welcome.html';
            },
            function signinError(err) {
                alert(err);
            }
        );
    }

    function handleRegister(event) {
        var email = $('#emailInputRegister').val();
        var password = $('#passwordInputRegister').val();
        var password2 = $('#password2InputRegister').val();
        var onSuccess = function registerSuccess(result) {
            var subscription = $("#sbsSelect").val();
            var confirmation = ('Registration successful. Please check your email inbox or spam folder for your verification code.');
            if (confirmation) {
                $.ajax({
                    method: 'POST',
                    url: _config.api.registerUrl + '/register',
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    data: {
                        "email": $('#emailInputRegister').val(),
                        "authorized": false,
                        "date": Date.now(),
                        "type": subscription
                    },
                    contentType: 'application/json',
                    success: function scs(t) {
                        console.log("register success");
                        window.location.href = 'verify.html';
                    },
                    error: function ajaxError(err) {
                        console.log("fail");
                        console.log(err);
                    }
                })
            }
        };
        var onFailure = function registerFailure(err) {
            alert(err);
        };
        event.preventDefault();
        if (password === password2) {
            register(email, password, onSuccess, onFailure);
        } else {
            alert('Passwords do not match');
        }
    }

    function handleVerify(event) {
        var email = $('#emailInputVerify').val();
        var code = $('#codeInputVerify').val();
        event.preventDefault();
        verify(email, code,
            function verifySuccess(result) {
                console.log('Successfully verified');
                alert('Verification successful. You will now be redirected to the login page.');
                $.ajax({
                    method: 'POST',
                    url: _config.api.registerUrl + '/verify',
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    data: {
                        "email": $('#emailInputVerify').val(),
                        "auth": true,
                        "date": Date.now()
                    },
                    contentType: 'application/json',
                    success: function scs(t) {
                        console.log("success");
                        window.location.href = signinUrl;
                    },
                    error: function ajaxError(err) {
                        console.log("fail");
                        console.log(err);
                    }
                })
            },
            function verifyError(err) {
                alert(err);
            }
        );
    }
}(jQuery));

/*global WildRydes _config*/

var WildRydes = window.WildRydes || {};

(function rideScopeWrapper($) {
    var authToken;
    WildRydes.authToken.then(function setAuthToken(token) {
        if (token) {
            authToken = token;
        } else {
            window.location.href = '/signin.html';
        }
    }).catch(function handleTokenError(error) {
        alert(error);
        window.location.href = '/signin.html';
    });

    function pageLoadRequest(userDetails) {
        $.ajax({
            method: 'GET',
            url: _config.api.mainPageUrl + '/main?email=' + userDetails.email,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: authToken
            },
            contentType: 'application/json',
            success: function completeRequest(result) {
                if (result.hasOwnProperty('subscription_type') && result.hasOwnProperty('register_date')) {
                    if (result.subscription_type == null || result.register_date == null) {
                        console.log("user error");
                    } else {
                        var tp = result.subscription_type;
                        var sbs_type = "<li>User subscription type is: " + tp + "</li>";
                        $(".panel-body #updates").append(sbs_type);
                        var reg_date = Math.floor(parseInt(result.register_date) / 1000);
                        var cur_date = Math.floor(Date.now() / 1000);
                        var days = Math.ceil((cur_date - reg_date) / 86400);
                        var is_valid = false;
                        if (result.subscription_type == "year") {
                            is_valid = days <= 365;
                        } else if (result.subscription_type == "month") {
                            is_valid = days <= 30;
                        }
                        var reg_valid = "<li>User subscription is valid: " + is_valid + "</li>";
                        $(".panel-body #updates").append(reg_valid);
                    }
                } else {
                    console.log(result);
                }
            },
            error: function ajaxError(jqXHR, textStatus, errorThrown) {
                console.error('Error requesting ride: ', textStatus, ', Details: ', errorThrown);
                console.error('Response: ', jqXHR.responseText);
            }
        });
    }

    $(function onDocReady() {
        $(document).ready(handlePageLoad);

        WildRydes.authToken.then(function updateAuthMessage(token) {
            if (token) {
                console.log('You are authenticated');
                // console.log(token);
            }
        });
    });

    function getCookie() {
        var nameEQ = "email=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function eraseCookie() {
        document.cookie = 'email=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }

    function handlePageLoad(event) {
        var email = getCookie();
        if (email != null) {
            var userDetails = {
                "email": email
            };
            eraseCookie();
            pageLoadRequest(userDetails);
        }
    }
}(jQuery));

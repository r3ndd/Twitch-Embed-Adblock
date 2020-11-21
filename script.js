// ==UserScript==
// @name         Twitch Adblock
// @namespace    https://greasyfork.org/en/users/9694-croned
// @version      1.3.8
// @description  [Working as of 11/19/2020] Blocks Twitch livestream ads
// @author       FTwitch
// @include      https://www.twitch.tv/*
// @include      https://cdn.embedly.com/*
// @include      https://player.twitch.tv/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    if (window.location.origin == "https://cdn.embedly.com") {
        document.getElementsByTagName("html")[0].style = "overflow: hidden";

        window.addEventListener("message", (event) => {
            window.parent.postMessage(event.data, "*");
        });
    }
    else if (window.location.origin == "https://player.twitch.tv") {
        var modified = false;

        var observer = new MutationObserver(function (mutations, observer) {
            var logo = document.querySelector('[data-a-target="player-twitch-logo-button"]');
            var card = document.getElementsByClassName("tw-card")[0];
            var panel = document.getElementsByClassName("stream-info-social-panel")[0];
            var fullscreenButton = document.querySelector('[data-a-target="player-fullscreen-button"]');
            var theaterButton = fullscreenButton && fullscreenButton.parentElement.cloneNode(true).getElementsByTagName("button")[0];

            if (!logo || !card || !panel || !fullscreenButton)
                return;

            observer.disconnect();

            logo.remove();
            card.remove();
            panel.remove();

            theaterButton.getElementsByTagName("g")[0].innerHTML = `<path fill-rule="evenodd" d="M2 15V5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2zm2 0V5h7v10H4zm9 0h3V5h-3v10z" clip-rule="evenodd"></path>`;
            theaterButton.parentElement.getElementsByClassName("tw-tooltip")[0].innerHTML = 'Theater Mode (alt+t)';
            fullscreenButton.parentElement.insertBefore(theaterButton.parentElement, fullscreenButton);

            theaterButton.removeAttribute('disabled');
            fullscreenButton.removeAttribute('disabled');
            theaterButton.className = theaterButton.className.split("--disabled").join("");
            fullscreenButton.className = fullscreenButton.className.split("--disabled").join("");

            fullscreenButton.onclick = function () {
                window.parent.postMessage("fullscreen", "*");
            }

            theaterButton.onclick = function () {
                window.parent.postMessage("theater", "*");
            }

            document.ondblclick = function () {
                fullscreenButton.click();
            }
        });

        observer.observe(document.body, { attributes: false, childList: true, subtree: true });
    }
    else {
        var lastStreamer, oldHtml;

        window.addEventListener("message", (event) => {
            if (event.data == "fullscreen")
                document.querySelector(`[data-a-target="player-fullscreen-button"]`).click();
            else if (event.data == "theater")
                document.querySelector(`[data-a-target="player-theatre-mode-button"]`).click();
            else if (event.data.eventName == 'UPDATE_STATE' && event.data.params.quality)
                if (/^((?:160|360|480|720|1080)p(?:30|60)|chunked)$/.test(event.data.params.quality))
                    window.localStorage.setItem("embedQuality", event.data.params.quality);
        });

        var observer = new MutationObserver(function (mutations, observer) {
            var container = document.querySelector(".video-player .tw-absolute");

            if (!container)
                return;

            if (window.location.pathname.indexOf("/directory") == 0)
                return;

            if(mutations.length === 1 && mutations[0].target.classList.contains("tw-animated-number--monospaced"))
                return;

            var streamerName = window.location.pathname.replace("/", "");
            var quality = window.localStorage.getItem("embedQuality") || "chunked";
            //var twitchUrl = `https://player.twitch.tv/?channel=${streamerName}&muted=false&parent=cdn.embedly.com&quality=${quality}`
            //var iframeUrl = `https://cdn.embedly.com/widgets/media.html?src=${encodeURIComponent(twitchUrl)}&type=text%2Fhtml&card=1&schema=twitch`;
            var iframeUrl = `https://player.twitch.tv/?channel=${streamerName}&muted=false&parent=twitch.tv&quality=${quality}`; // Not using an intermediate stream for now since it's faster
            var existingIframe = document.getElementById("embed-adblock");

            if ((!streamerName && !lastStreamer) || streamerName.indexOf("videos/") == 0 || streamerName.indexOf("/clip") != -1) {
                lastStreamer = null;

                for (let el of container.children)
                    el.hidden = false;

                if (existingIframe) {
                    existingIframe.src = "";
                    existingIframe.hidden = true;
                }

                return;
            }
            else if (!streamerName)
                return;

            for (let el of container.children) {
                if (el.tagName != "IFRAME")
                    el.hidden = true;

                if (el.tagName == "VIDEO")
                    el.src = "";
            }

            if (!existingIframe) {
                existingIframe = document.createElement("iframe");
                existingIframe.id = "embed-adblock";
                existingIframe.style = "width: 100%; height: 100%; visibility: hidden;";
                existingIframe.src = iframeUrl;
                existingIframe.onload = () => { existingIframe.style.visibility = "visible"; };
                container.appendChild(existingIframe);
            }
            else if (streamerName != lastStreamer) {
                existingIframe.src = iframeUrl;
                existingIframe.hidden = false;
            }

            lastStreamer = streamerName
        });

        var observeInterval = setInterval(() => {
            var observee = document.getElementsByClassName("root-scrollable__wrapper tw-full-width tw-relative")[0];

            if (!observee)
                return;

            observer.observe(observee, { attributes: false, childList: true, subtree: true });
            clearInterval(observeInterval);
        }, 100);
    }
})();

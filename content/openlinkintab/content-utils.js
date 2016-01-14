(function(global) {
	var DEBUG = false;
	function mydump(aMessage) {
		if (DEBUG)
			dump('openlinkintab content utils: '+aMessage +'\n');
	}
	mydump('CONTENT SCRIPT LOADED');

	var Cc = Components.classes;
	var Ci = Components.interfaces;
	var Cu = Components.utils;
	var Cr = Components.results;

	var { OpenLinkInTabUtils } = Cu.import('resource://openlinkintab-modules/utils.js', {});
	var { Services } = Cu.import('resource://gre/modules/Services.jsm', {});
	var { BrowserUtils } = Cu.import('resource://gre/modules/BrowserUtils.jsm', {});

	function free() {
		free =
			Cc = Ci = Cu = Cr =

			OpenLinkInTabUtils =
			Services =
			BrowserUtils =

			messageListener =

			onLinkMouseDown =
			onLinkClick =

			mydump =
				undefined;
	}


	var messageListener = function(aMessage) {
		mydump('CONTENT MESSAGE LISTENED');
		mydump(JSON.stringify(aMessage.json));
		switch (aMessage.json.command)
		{
			case OpenLinkInTabUtils.COMMAND_SHUTDOWN:
				global.removeMessageListener(OpenLinkInTabUtils.MESSAGE_TYPE, messageListener);
				global.removeEventListener('mousedown', onLinkMouseDown, true);
				global.removeEventListener('click', onLinkClick, true);
				free();
				return;

			case OpenLinkInTabUtils.COMMAND_NOTIFY_REMOTENESS_UPDATED:
				global.removeEventListener('mousedown', onLinkMouseDown, true);
				global.removeEventListener('click', onLinkClick, true);
				global.addEventListener('mousedown', onLinkMouseDown, true);
				global.addEventListener('click', onLinkClick, true);
				return;
		}
	};
	global.addMessageListener(OpenLinkInTabUtils.MESSAGE_TYPE, messageListener);
 
	function onLinkMouseDown(aEvent) 
	{
		var link = aEvent.originalTarget;
		while (link && !link.href) {
			link = link.parentNode;
		}
		if (!link || !link.parentNode)
			return;

		var domain = link.ownerDocument.defaultView.location.hostname;
		if (OpenLinkInTabUtils.handleClickEventDomainMatcher && domain &&
			OpenLinkInTabUtils.handleClickEventDomainMatcher.test(domain) &&
			OpenLinkInTabUtils.checkReadyToOpenNewTabFromLink(link))
			link.setAttribute(OpenLinkInTabUtils.NEW_TAB_READY, true);
	}
 
	function onLinkClick(aEvent)
	{
		var link = aEvent.originalTarget;
		while (link && !link.href) {
			link = link.parentNode;
		}
		if (!link)
			return;

		var newTabReadyLink = link.getAttribute(OpenLinkInTabUtils.NEW_TAB_READY) == 'true';
		var sourceURI = link.ownerDocument.defaultView.location.href;
		var result = OpenLinkInTabUtils.whereToOpenLink({
				uri       : link.href,
				sourceURI : sourceURI,
				newTabReadyLink : newTabReadyLink,
				action    : aEvent,
				global    : global
			});
		if (result.where.indexOf('tab') == 0 && result.divertedToTab) {
			aEvent.preventDefault();
			aEvent.stopImmediatePropagation();

			let referrerPolicy = link.ownerDocument.referrerPolicy;
			if (Services.prefs.getBoolPref('network.http.enablePerElementReferrer')) {
				let referrerAttrValue = Services.netUtils.parseAttributePolicyString(link.getAttribute('referrerpolicy'));
				if (referrerAttrValue !== Ci.nsIHttpChannel.REFERRER_POLICY_DEFAULT) {
					referrerPolicy = referrerAttrValue;
				}
			}
			let message = {
				button   : aEvent.button,
				shiftKey : aEvent.shiftKey,
				ctrlKey  : aEvent.ctrlKey,
				metaKey  : aEvent.metaKey,
				altKey   : aEvent.altKey,
				href     : link.href,
				title    : link.getAttribute('title'),
				bookmark : (
					aEvent.button == 0 &&
					!aEvent.ctrlKey &&
					!aEvent.shiftKey &&
					!aEvent.altKey &&
					!aEvent.metaKey &&
					link.getAttribute('rel') == 'sidebar'
				),
				referrerPolicy : referrerPolicy,
				noReferrer : BrowserUtils.linkHasNoReferrer(link),
				__openlinkintab__sourceURI : sourceURI,
				__openlinkintab__newTabReadyLink : newTabReadyLink
			};
			try {
				BrowserUtils.urlSecurityCheck(link.href, link.ownerDocument.nodePrincipal);
			}
			catch(error) {
				return;
			}
			global.sendAsyncMessage('Content:Click', message);
		}
		// aEvent.target.ownerDocument.defaultView.alert('clickHandler: '+JSON.stringify(result)+' / '+JSON.stringify(OpenLinkInTabUtils.config));
	}

	global.addEventListener('mousedown', onLinkMouseDown, true);
	global.addEventListener('click', onLinkClick, true);
})(this);

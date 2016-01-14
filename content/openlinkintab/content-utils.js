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

	function free() {
		free =
			Cc = Ci = Cu = Cr =

			OpenLinkInTabUtils =

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
		if (OpenLinkInTabUtils.config.handleClickEventDomainMatcher && domain &&
			OpenLinkInTabUtils.config.handleClickEventDomainMatcher.test(domain) &&
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

		var result = OpenLinkInTabUtils.whereToOpenLink({
				uri       : link.href,
				sourceURI : link.ownerDocument.defaultView.location.href,
				newTabReadyLink : link.getAttribute(OpenLinkInTabUtils.NEW_TAB_READY) == 'true',
				action    : aEvent,
				global    : global
			});
		if (result.where.indexOf('tab') == 0 && result.divertedToTab) {
			let originalTarget = link.getAttribute('target');
			link.setAttribute('target', '_blank');
			link.ownerDocument.defaultView.setTimeout(function() {
				try {
					if (originalTarget)
						link.setAttribute('target', originalTarget);
					else
						link.removeAttribute('target');
				}
				catch(e) {
				}
			}, 10);
			link.removeAttribute(OpenLinkInTabUtils.NEW_TAB_READY);
		}
		// aEvent.target.ownerDocument.defaultView.alert('clickHandler: '+JSON.stringify(result)+' / '+JSON.stringify(OpenLinkInTabUtils.config));
	}

	global.addEventListener('mousedown', onLinkMouseDown, true);
	global.addEventListener('click', onLinkClick, true);
})(this);

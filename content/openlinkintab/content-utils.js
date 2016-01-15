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

			getLinkFromEvent =
			linksDivertedToTab =

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
				global.removeEventListener('keydown', onLinkMouseDown, true);
				global.removeEventListener('keypress', onLinkClick, true);
				free();
				return;

			case OpenLinkInTabUtils.COMMAND_NOTIFY_REMOTENESS_UPDATED:
				global.removeEventListener('mousedown', onLinkMouseDown, true);
				global.removeEventListener('click', onLinkClick, true);
				global.removeEventListener('keydown', onLinkMouseDown, true);
				global.removeEventListener('keypress', onLinkClick, true);
				global.addEventListener('mousedown', onLinkMouseDown, true);
				global.addEventListener('click', onLinkClick, true);
				global.addEventListener('keydown', onLinkMouseDown, true);
				global.addEventListener('keypress', onLinkClick, true);
				return;
		}
	};
	global.addMessageListener(OpenLinkInTabUtils.MESSAGE_TYPE, messageListener);

	function getLinkFromEvent(aEvent)
	{
		var link = aEvent.originalTarget;
		while (link && !link.href) {
			link = link.parentNode;
		}
		if (!link || !link.parentNode)
			return null;
		return link;
	}
	var linksDivertedToTab = new WeakMap();

	function onLinkMouseDown(aEvent) 
	{
		var link = getLinkFromEvent(aEvent);
		if (!link)
			return;

		var domain = link.ownerDocument.defaultView.location.hostname;
		var newTabReadyLink = (
				OpenLinkInTabUtils.config.handleClickEventDomainMatcher && domain &&
				OpenLinkInTabUtils.config.handleClickEventDomainMatcher.test(domain) &&
				OpenLinkInTabUtils.checkReadyToOpenNewTabFromLink(link)
			);
		var result = OpenLinkInTabUtils.whereToOpenLink({
				uri       : link.href,
				sourceURI : link.ownerDocument.defaultView.location.href,
				newTabReadyLink : newTabReadyLink,
				action    : aEvent,
				global    : global
			});
		var divertedToTab = result.where.indexOf('tab') == 0 && result.divertedToTab;
		if (divertedToTab) {
			linksDivertedToTab.set(link, {
				target : link.getAttribute('target')
			});
			link.setAttribute('target', '_blank');
		}
		if (OpenLinkInTabUtils.config.debug)
			aEvent.target.ownerDocument.defaultView.console.log('onLinkMouseDown: '+JSON.stringify(result)+' / '+JSON.stringify(OpenLinkInTabUtils.config));
	}

	function onLinkClick(aEvent) 
	{
		var link = getLinkFromEvent(aEvent);
		if (!link)
			return;

		link.ownerDocument.defaultView.setTimeout(function() {
			try {
				var backupData = linksDivertedToTab.get(link);
				linksDivertedToTab.delete(link);
				if (backupData.target)
					link.setAttribute('target', backupData.target);
				else
					link.removeAttribute('target');
			}
			catch(e) {
			}
		}, 10);
	}

	global.addEventListener('mousedown', onLinkMouseDown, true);
	global.addEventListener('click', onLinkClick, true);
	global.addEventListener('keydown', onLinkMouseDown, true);
	global.addEventListener('keypress', onLinkClick, true);
})(this);

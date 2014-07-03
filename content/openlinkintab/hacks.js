OpenLinkInTabService.overrideExtensionsOnInitBefore = function OLITService_overrideExtensionsOnInitBefore() {
	// Highlander
	// https://addons.mozilla.org/firefox/addon/4086
	if ('Highlander' in window) {
		eval('Highlander.overrideHandleLinkClick = '+
			Highlander.overrideHandleLinkClick.toSource().replace(
				/(var )?origHandleLinkClick/g,
				'window.__openlinkintab__highlander__origHandleLinkClick'
			)
		);
	}
};

OpenLinkInTabService.overrideExtensionsOnInitAfter = function OLITService_overrideExtensionsOnInitAfter() {

	// Tab Mix Plus
	if (this.utils.getMyPref('compatibility.TMP') &&
		'TMupdateSettings' in window) {

		eval('window.TMP_contentAreaClick = '+
			window.TMP_contentAreaClick.toSource().replace(
				'if (openT)',
				'if (OpenLinkInTabService.utils.checkReadyToOpenNewTabFromLink(linkNode)) {\n' +
				'  event.stopPropagation();\n' +
				'  event.preventDefault();\n' +
				'  handleLinkClick(event, linkNode.href, linkNode);\n' +
				'  return true;\n' +
				'} else $&\n'
			)
		);
		if (/\(?function TMP_contentAreaClick\(/.test(window.contentAreaClick.toSource()))
			window.contentAreaClick = window.TMP_contentAreaClick;
	}

};

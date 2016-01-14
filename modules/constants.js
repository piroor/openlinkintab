var EXPORTED_SYMBOLS = ['OpenLinkInTabConstants'];

var OpenLinkInTabConstants = {
	ID       : 'openlinkintab@piro.sakura.ne.jp',
	PREFROOT : 'extensions.openlinkintab@piro.sakura.ne.jp',

	NEW_TAB_READY: 'data-moz-openlinkintab-open-newtab-ready',

	CONTENT_SCRIPT : 'chrome://openlinkintab/content/content-utils.js',
	MESSAGE_TYPE : 'openlinkintab',

	COMMAND_SHUTDOWN : 'shutdown',
	COMMAND_NOTIFY_REMOTENESS_UPDATED : 'notify-remoteness-updated',
	COMMAND_NOTIFY_CONFIG_UPDATED : 'notify-config-updated'
};

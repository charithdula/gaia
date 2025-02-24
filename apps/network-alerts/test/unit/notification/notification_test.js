/* global
  MocksHelper,
  NotificationHandler,
  Utils
 */
'use strict';

require('/test/unit/mock_utils.js');
require('/js/notification/notification.js');

var mocksForNotification = new MocksHelper([
  'Utils'
]);

suite('Network Alerts - Notification handling', function() {
  mocksForNotification.attachTestHelpers();

  setup(function() {
    this.sinon.stub(window, 'close');
    this.sinon.stub(window, 'open');
    this.sinon.stub(Utils, 'parseParams').returns({
      style: 'style'
    });

    if (!window.navigator.mozSetMessageHandler) {
      window.navigator.mozSetMessageHandler = function() {};
    }
    this.sinon.stub(window.navigator, 'mozSetMessageHandler');
    NotificationHandler.init();
  });

  test('opens an attention screen if user clicks the notification', function() {
    var message = {
      title: 'Some title',
      body: 'Some body',
      clicked: true
    };

    var handlerStub = window.navigator.mozSetMessageHandler;
    handlerStub.withArgs('notification').yield(message);

    var expectedUrl = [
      'attention.html?',
      'title=Some%20title&',
      'body=Some%20body&',
      'style=style&',
      'notification=1'
    ].join('');

    sinon.assert.calledWith(
      window.open,
      expectedUrl, '_blank', 'attention'
    );
    sinon.assert.called(window.close);
  });

  test('only closes window if user dismisses the notification', function() {
    var message = {
      title: 'Some title',
      body: 'Some body'
    };

    var handlerStub = window.navigator.mozSetMessageHandler;
    handlerStub.withArgs('notification').yield(message);

    sinon.assert.notCalled(window.open);
    sinon.assert.called(window.close);
  });
});


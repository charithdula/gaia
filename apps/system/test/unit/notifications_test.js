/* global
  MockAudio,
  MockNavigatorMozChromeNotifications,
  MockNavigatorSettings,
  MockStatusBar,
  MocksHelper,
  NotificationScreen,
  ScreenManager
 */

'use strict';

require('/js/notifications.js');
require('/test/unit/mock_screen_manager.js');
require('/test/unit/mock_statusbar.js');
require('/test/unit/mock_utility_tray.js');
require('/test/unit/mock_navigator_moz_chromenotifications.js');
require('/shared/test/unit/mocks/mock_gesture_detector.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_url.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_system.js');
require('/shared/test/unit/mocks/mock_audio.js');

var mocksForNotificationScreen = new MocksHelper([
  'Audio',
  'StatusBar',
  'GestureDetector',
  'NavigatorMozChromeNotifications',
  'ScreenManager',
  'NavigatorSettings',
  'SettingsListener',
  'SettingsURL',
  'UtilityTray',
  'System'
]).init();

suite('system/NotificationScreen >', function() {
  var fakeNotifContainer, fakeLockScreenContainer, fakeToaster,
    fakeButton, fakeNoNotifications, fakeToasterIcon, fakeToasterTitle,
    fakeToasterDetail, fakeSomeNotifications;
  var fakePriorityNotifContainer, fakeOtherNotifContainer;

  function sendChromeNotificationEvent(detail) {
    var event = new CustomEvent('mozChromeNotificationEvent', {
      detail: detail
    });

    window.dispatchEvent(event);
  }

  function createFakeElement(tag, id) {
    var obj = document.createElement(tag);
    obj.id = id;
    return obj;
  }

  function fakeNotification() {
    var elt = document.createElement('div');
    elt.className = 'notification';

    return elt;
  }


  mocksForNotificationScreen.attachTestHelpers();
  setup(function() {
    fakeNotifContainer = document.createElement('div');
    fakeNotifContainer.id = 'desktop-notifications-container';
    fakePriorityNotifContainer = document.createElement('div');
    fakePriorityNotifContainer.className = 'priority-notifications';
    fakeOtherNotifContainer = document.createElement('div');
    fakeOtherNotifContainer.className = 'other-notifications';
    fakeNotifContainer.appendChild(fakePriorityNotifContainer);
    fakeNotifContainer.appendChild(fakeOtherNotifContainer);

    // add some children, we don't care what they are
    fakeOtherNotifContainer.appendChild(fakeNotification());
    fakeOtherNotifContainer.appendChild(fakeNotification());

    fakeLockScreenContainer = createFakeElement('div',
      'notifications-lockscreen-container');
    fakeToaster = createFakeElement('div', 'notification-toaster');
    fakeSomeNotifications = createFakeElement('span', 'notification-some');
    fakeNoNotifications = createFakeElement('span', 'notification-none');
    fakeButton = createFakeElement('button', 'notification-clear');
    fakeToasterIcon = createFakeElement('img', 'toaster-icon');
    fakeToasterTitle = createFakeElement('div', 'toaster-title');
    fakeToasterDetail = createFakeElement('div', 'toaster-detail');

    document.body.appendChild(fakeNotifContainer);

    document.body.appendChild(fakeLockScreenContainer);
    document.body.appendChild(fakeToaster);
    document.body.appendChild(fakeSomeNotifications);
    document.body.appendChild(fakeNoNotifications);
    document.body.appendChild(fakeButton);
    document.body.appendChild(fakeToasterIcon);
    document.body.appendChild(fakeToasterTitle);
    document.body.appendChild(fakeToasterDetail);

    this.sinon.useFakeTimers();
    NotificationScreen.init();
  });

  teardown(function() {
    fakeNotifContainer.parentNode.removeChild(fakeNotifContainer);
    fakeLockScreenContainer.parentNode.removeChild(fakeLockScreenContainer);
    fakeToaster.parentNode.removeChild(fakeToaster);
    fakeButton.parentNode.removeChild(fakeButton);
  });

  suite('chrome events >', function() {
    setup(function() {
      this.sinon.stub(NotificationScreen, 'addNotification');
      this.sinon.stub(NotificationScreen, 'removeNotification');
    });

    function sendChromeNotificationEvent(detail) {
      var event = new CustomEvent('mozChromeNotificationEvent', {
        detail: detail
      });

      window.dispatchEvent(event);
    }

    test('showing a notification', function() {
      sendChromeNotificationEvent({
        type: 'desktop-notification',
        id: 'id-1'
      });

      assert.ok(NotificationScreen.addNotification.called);
      assert.equal(NotificationScreen.addNotification.args[0][0].id, 'id-1');
    });

    test('closing a notification', function() {
      sendChromeNotificationEvent({
        type: 'desktop-notification-close',
        id: 'id-1'
      });
      assert.ok(NotificationScreen.removeNotification.called);
      assert.equal(NotificationScreen.removeNotification.args[0][0], 'id-1');
    });
  });

  suite('updateStatusBarIcon >', function() {
    setup(function() {
      this.sinon.spy(MockStatusBar, 'updateNotification');
      NotificationScreen.updateStatusBarIcon();
    });

    test('should update the icon in the status bar', function() {
      sinon.assert.called(MockStatusBar.updateNotification);
      assert.equal(2, MockStatusBar.notificationsCount);
    });

    test('external notif should not be able to decrease the global count',
      function() {

      NotificationScreen.decExternalNotifications();
      assert.equal(2, MockStatusBar.notificationsCount);
    });

    test('external notif should increase the global count',
      function() {

      NotificationScreen.incExternalNotifications();
      assert.isTrue(MockStatusBar.mNotificationUnread);
      assert.equal(3, MockStatusBar.notificationsCount);
    });

    test('external notif should decrease the global count',
      function() {

      NotificationScreen.incExternalNotifications();
      MockStatusBar.mNotificationUnread = false;
      NotificationScreen.decExternalNotifications();
      assert.isFalse(MockStatusBar.mNotificationUnread);
      assert.equal(2, MockStatusBar.notificationsCount);
    });

    test('should change the read status', function() {
      NotificationScreen.updateStatusBarIcon(true);
      assert.isTrue(MockStatusBar.mNotificationUnread);
    });
  });

  suite('addNotification >', function() {
    test('calling addNotification without icon', function() {
      var toasterIcon = NotificationScreen.toasterIcon;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title', detail: 'detail'};
      NotificationScreen.addNotification(detail);
      assert.equal(imgpath, toasterIcon.src);
      assert.isFalse(toasterIcon.hidden);
      delete detail.icon;
      NotificationScreen.addNotification(detail);
      assert.isTrue(toasterIcon.hidden);
    });

    function testNotificationWithDirection(dir) {
      var toasterTitle = NotificationScreen.toasterTitle;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath,
                    title: 'title',
                    detail: 'detail',
                    bidi: dir};
      NotificationScreen.addNotification(detail);
      assert.equal(dir, toasterTitle.dir);
    }

    test('calling addNotification with rtl direction', function() {
      testNotificationWithDirection('rtl');
    });

    test('calling addNotification with ltr direction', function() {
      testNotificationWithDirection('ltr');
    });

    test('calling addNotification with auto direction', function() {
      testNotificationWithDirection('auto');
    });

    test('calling addNotification without direction', function() {
      var toasterTitle = NotificationScreen.toasterTitle;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title', detail: 'detail'};
      NotificationScreen.addNotification(detail);
      assert.equal('auto', toasterTitle.dir);
    });

    test('calling addNotification with language', function() {
      var toasterTitle = NotificationScreen.toasterTitle;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title', lang: 'en'};
      NotificationScreen.addNotification(detail);
      assert.equal('en', toasterTitle.lang);
    });

    test('calling addNotification without language', function() {
      var toasterTitle = NotificationScreen.toasterTitle;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title'};
      NotificationScreen.addNotification(detail);
      assert.equal('undefined', toasterTitle.lang);
    });

    test('calling addNotification with timestamp', function() {
      var timestamp = 1397802220000;
      var detail = {timestamp: timestamp};
      NotificationScreen.addNotification(detail);
      var timestamps = document.getElementsByClassName('timestamp');
      assert.equal(timestamps.length, 1);
      var ts = timestamps[0].dataset.timestamp;
      assert.isTrue(typeof ts === 'string');
      var fromDate = new Date(ts).getTime();
      assert.equal(timestamp, fromDate);
    });

    test('calling addNotification without timestamp', function() {
      // we parseInt(date/1000)*1000 to make sure to remove some resolution
      // fromDate == 1397810684000 -- now == 1397810684105
      var now = parseInt(new Date().getTime() / 1000) * 1000;
      var detail = {timestamp: undefined};
      NotificationScreen.addNotification(detail);
      var timestamps = document.getElementsByClassName('timestamp');
      assert.equal(timestamps.length, 1);
      var ts = timestamps[0].dataset.timestamp;
      assert.isTrue(typeof ts === 'string');
      var fromDate = new Date(ts).getTime();
      assert.isTrue(typeof fromDate === 'number');
      assert.isTrue(fromDate >= now);
    });

    test('remove lockscreen notifications at the same time', function() {
      NotificationScreen.addNotification({
        id: 'id-10000', title: '', message: ''
      });
      NotificationScreen.removeNotification('id-10000');
      assert.equal(
        null,
        fakeLockScreenContainer.querySelector(
          '[data-notification-i-d="id-10000"]'));
    });

    test('does notify for generic applications', function() {
      this.sinon.stub(navigator, 'vibrate');
      this.sinon.stub(MockAudio.prototype, 'play');

      NotificationScreen.addNotification({
        id: 'id-10000',
        title: '',
        message: '',
        manifestURL: 'app://sms.gaiamobile.org/manifest.webapp'
      });

      var ringtonePlayer = MockAudio.instances[0];
      sinon.assert.called(ringtonePlayer.play);

      sinon.assert.called(navigator.vibrate);

      assert.ok(fakeToaster.classList.contains('displayed'));
    });

    test('notifications are added in the right place', function() {
      var title = 'hello world';
      var text = 'how are you';
      NotificationScreen.addNotification({
        id: 'id-10000',
        title: title,
        text: text,
        manifestURL: 'app://sms.gaiamobile.org/manifest.webapp'
      });

      assert.equal(fakeOtherNotifContainer.childElementCount, 3);
      var newContent = fakeOtherNotifContainer.firstElementChild.textContent;
      assert.isTrue(
        newContent.indexOf(title) !== -1,
        'The title is in the notification'
      );
      assert.isTrue(
        newContent.indexOf(text) !== -1,
        'The message is in the notification'
      );
    });

    test('does not notify for the network-alerts application', function() {
      this.sinon.stub(navigator, 'vibrate');

      NotificationScreen.addNotification({
        id: 'id-10000',
        title: '',
        message: '',
        // note: works only if the test agent is launched using
        // app://test-agent.gaiamobile.org (instead of using http://)
        manifestURL: 'app://network-alerts.gaiamobile.org/manifest.webapp'
      });

      assert.lengthOf(MockAudio.instances, 0);
      sinon.assert.notCalled(navigator.vibrate);
      assert.isFalse(fakeToaster.classList.contains('displayed'));
    });

    test('notifications for priority applications are added in right place',
    function() {
      var title = 'hello world';
      var text = 'how are you';
      NotificationScreen.addNotification({
        id: 'id-10000',
        title: title,
        text: text,
        // note: works only if the test agent is launched using
        // app://test-agent.gaiamobile.org (instead of using http://)
        manifestURL: 'app://network-alerts.gaiamobile.org/manifest.webapp'
      });

      assert.equal(fakePriorityNotifContainer.childElementCount, 1);
      var content = fakePriorityNotifContainer.firstElementChild.textContent;
      assert.isTrue(
        content.indexOf(title) !== -1,
        'The title is in the notification'
      );
      assert.isTrue(
        content.indexOf(text) !== -1,
        'The message is in the notification'
      );
    });
  });

  suite('prettyDate() behavior >', function() {
    var realMozL10n;
    setup(function() {
      var mozL10nStub = {
        DateTimeFormat: function() {
          return {
            fromNow: function(time, compact) {
              var retval;
              var delta = new Date().getTime() - time.getTime();
              if (delta >= 0 && delta < 60*1000) {
                retval = 'now';
              } else if (delta >= 60*1000) {
                retval = '1m ago';
              }
              return retval;
            }
          };
        }
      };
      realMozL10n = navigator.mozL10n;
      navigator.mozL10n = mozL10nStub;
    });

    teardown(function() {
      navigator.mozL10n = realMozL10n;
    });

    test('converts timestamp to string', function() {
      var timestamp = new Date();
      var date = NotificationScreen.prettyDate(timestamp);
      assert.isTrue(typeof date === 'string');
    });

    test('shows now', function() {
      var timestamp = new Date();
      var date = NotificationScreen.prettyDate(timestamp);
      assert.equal(date, 'now');
    });

    test('shows 1m ago', function() {
      var timestamp = new Date(new Date().getTime() - 61*1000);
      var date = NotificationScreen.prettyDate(timestamp);
      assert.equal(date, '1m ago');
    });
  });

  suite('special notification handling for special apps', function() {
    var CALENDAR_MANIFEST = 'app://calendar.gaiamobile.org/manifest.webapp';
    var EMAIL_MANIFEST = 'app://email.gaiamobile.org/manifest.webapp';

    var details = {
      id: 'id-' + Date.now(),
      title: 'title',
      text: 'body'
    };

    var turnOnScreenSpy;

    setup(function() {
      ScreenManager.turnScreenOff();
      turnOnScreenSpy = this.sinon.spy(ScreenManager, 'turnScreenOn');
    });

    test('calendar notifications should wake the screen', function() {
      details.manifestURL = CALENDAR_MANIFEST;
      NotificationScreen.addNotification(details);
      sinon.assert.calledOnce(ScreenManager.turnScreenOn);
    });

    test('email notifications should not wake screen', function() {
      details.manifestURL = EMAIL_MANIFEST;
      NotificationScreen.addNotification(details);
      sinon.assert.notCalled(ScreenManager.turnScreenOn);
    });

    test('download progress notifications should not wake screen', function() {
      details.manifestURL = null;
      details.type = 'download-notification-downloading';
      NotificationScreen.addNotification(details);
      sinon.assert.notCalled(ScreenManager.turnScreenOn);
    });

    test('download complete notifications should wake screen', function() {
      details.manifestURL = null;
      details.type = 'download-notification-complete';
      NotificationScreen.addNotification(details);
      sinon.assert.calledOnce(ScreenManager.turnScreenOn);
    });
  });

  suite('differentiating api >', function() {
    test('identifying deprecated API', function() {
      var node = NotificationScreen.addNotification({
        id: 'app-notif-1',
        title: '',
        message: ''
      });
      assert.equal('true', node.dataset.obsoleteAPI);
    });

    test('identifying new API', function() {
      var node = NotificationScreen.addNotification({
        id: 'app://notif',
        title: '',
        message: ''
      });
      assert.equal('false', node.dataset.obsoleteAPI);
    });
  });

  suite('tap a notification >', function() {
    var notificationNode, notifClickedStub, contentNotificationEventStub;
    var details = {
      type: 'desktop-notification',
      id: 'id-1',
      title: '',
      message: ''
    };

    setup(function() {
      notificationNode = NotificationScreen.addNotification(details);

      notifClickedStub = sinon.stub();
      contentNotificationEventStub = sinon.stub();

      window.addEventListener('notification-clicked', notifClickedStub);
      window.addEventListener(
        'mozContentNotificationEvent', contentNotificationEventStub);

      var event = new CustomEvent('tap', { bubbles: true, cancelable: true });
      notificationNode.dispatchEvent(event);
    });

    teardown(function() {
      window.removeEventListener('notification-clicked', notifClickedStub);
      window.removeEventListener(
        'mozContentNotificationEvent', contentNotificationEventStub);
    });

    test('dispatch events once with the expected parameters', function() {
      sinon.assert.calledOnce(notifClickedStub);
      sinon.assert.calledOnce(contentNotificationEventStub);

      sinon.assert.calledWithMatch(notifClickedStub, {
        detail: {
          id: details.id
        }
      });

      sinon.assert.calledWithMatch(contentNotificationEventStub, {
        detail: {
          type: 'desktop-notification-click',
          id: details.id
        }
      });
    });
  });

  suite('tap a notification using the obsolete API >', function() {
    var notificationNode, notifClickedStub, contentNotificationEventStub;
    var details = {
      type: 'desktop-notification',
      id: 'app-notif-1',
      title: '',
      message: ''
    };

    setup(function() {
      notificationNode = NotificationScreen.addNotification(details);

      notifClickedStub = sinon.stub();
      contentNotificationEventStub = sinon.stub();

      window.addEventListener('notification-clicked', notifClickedStub);
      window.addEventListener(
        'mozContentNotificationEvent', contentNotificationEventStub);
    });

    teardown(function() {
      window.removeEventListener('notification-clicked', notifClickedStub);
      window.removeEventListener(
        'mozContentNotificationEvent', contentNotificationEventStub);
    });

    test('tapping on the notification', function() {
      var event = new CustomEvent('tap', { bubbles: true, cancelable: true });
      notificationNode.dispatchEvent(event);

      sinon.assert.calledOnce(notifClickedStub);
      sinon.assert.calledTwice(contentNotificationEventStub);

      sinon.assert.calledWithMatch(notifClickedStub, {
        detail: {
          id: details.id
        }
      });

      sinon.assert.calledWithMatch(contentNotificationEventStub, {
        detail: {
          type: 'desktop-notification-click',
          id: details.id
        }
      });

      sinon.assert.calledWithMatch(contentNotificationEventStub, {
        detail: {
          type: 'desktop-notification-close',
          id: details.id
        }
      });
    });

    test('tapping on the toaster', function() {
      var event = new CustomEvent('tap', { bubbles: true, cancelable: true });
      fakeToaster.dispatchEvent(event);

      sinon.assert.calledOnce(notifClickedStub);
      sinon.assert.calledTwice(contentNotificationEventStub);

      sinon.assert.calledWithMatch(notifClickedStub, {
        detail: {
          id: details.id
        }
      });

      sinon.assert.calledWithMatch(contentNotificationEventStub, {
        detail: {
          type: 'desktop-notification-click',
          id: details.id
        }
      });

      sinon.assert.calledWithMatch(contentNotificationEventStub, {
        detail: {
          type: 'desktop-notification-close',
          id: details.id
        }
      });
    });
  });

  suite('resending notifications >', function() {
    var realMozSettings;
    var realNavigatorMozChromeNotifications;

    suiteSetup(function() {
      realMozSettings = navigator.mozSettings;
      window.navigator.mozSettings = MockNavigatorSettings;

      realNavigatorMozChromeNotifications = navigator.mozChromeNotifications;
      navigator.mozChromeNotifications = MockNavigatorMozChromeNotifications;
    });

    suiteTeardown(function() {
      navigator.mozSettings = realMozSettings;
      navigator.mozChromeNotifications = realNavigatorMozChromeNotifications;
    });

    suite('inhibition of vibration and sound >', function() {
      var vibrateSpy;

      function sendNotification() {
        var imgpath = 'http://example.com/test.png';
        var detail = {icon: imgpath, title: 'title', detail: 'detail'};
        NotificationScreen.addNotification(detail);
      }

      setup(function() {
        vibrateSpy = this.sinon.spy(navigator, 'vibrate');
      });

      test('isResending is false', function() {
        assert.isFalse(NotificationScreen.isResending);
      });

      test('isResending is switched to true when receiving resend event',
        function() {
          assert.isFalse(NotificationScreen.isResending);
          window.dispatchEvent(
            new CustomEvent('desktop-notification-resend',
            { detail: { number: 1 } } ));
          this.sinon.clock.tick();
          assert.isTrue(NotificationScreen.isResending);
        }
      );

      test('isResending is switched to false when receiving a notification',
        function() {
          assert.isTrue(NotificationScreen.isResending);
          window.dispatchEvent(
            new CustomEvent('desktop-notification-resend',
            { detail: { number: 1 } } ));
          this.sinon.clock.tick();
          sendChromeNotificationEvent({
            type: 'desktop-notification',
            id: 'id-1'
          });
          this.sinon.clock.tick(1000);
          assert.isFalse(NotificationScreen.isResending);
        }
      );

      test('isResending true blocks vibrate()', function() {
        NotificationScreen.isResending = true;
        assert.isTrue(NotificationScreen.isResending);

        sendNotification();
        this.sinon.clock.tick(1000);
        assert.ok(vibrateSpy.notCalled);
      });

      test('isResending false allows vibrate()', function() {
        NotificationScreen.isResending = false;
        assert.isFalse(NotificationScreen.isResending);

        sendNotification();
        this.sinon.clock.tick(1000);
        assert.ok(vibrateSpy.called);
      });
    });

    suite('on restart >', function() {
      var dispatchEventSpy, resendSpy;
      var setting = 'notifications.resend';

      setup(function() {
        resendSpy = this.sinon.spy(MockNavigatorMozChromeNotifications,
          'mozResendAllNotifications');
        dispatchEventSpy = this.sinon.spy(window, 'dispatchEvent');
      });

      suite('setting is true >', function() {
        setup(function() {
          MockNavigatorSettings.mSettings[setting] = true;
          window.dispatchEvent(new CustomEvent('load'));
        });

        test('mozResendAllNotifications called', function() {
          this.sinon.clock.tick();
          assert.ok(resendSpy.calledOnce);
        });

        test('desktop-notification-resend sent', function() {
          this.sinon.clock.tick();
          var expectedEvent =
            new CustomEvent('desktop-notification-resend',
              { detail: { number: 1 } } );
          assert.ok(dispatchEventSpy.called);
          assert.equal(
            dispatchEventSpy.lastCall.args[0].type, expectedEvent.type);
          assert.equal(
            dispatchEventSpy.lastCall.args[0].detail.number,
            expectedEvent.detail.number);
        });
      });

      suite('setting is false >', function() {
        setup(function() {
          MockNavigatorSettings.mSettings[setting] = false;
          window.dispatchEvent(new CustomEvent('load'));
        });

        test('mozResendAllNotifications not called', function() {
          assert.ok(resendSpy.notCalled);
        });

        test('desktop-notification-resend not sent', function() {
          var expectedEvent =
            new CustomEvent('desktop-notification-resend',
              { detail: { number: 1 } } );
          assert.ok(dispatchEventSpy.called);
          assert.notEqual(
            dispatchEventSpy.lastCall.args[0].type, expectedEvent.type);
        });
      });
    });
  });

});

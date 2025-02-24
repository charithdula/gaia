/*global Information, loadBodyHTML, MockContact, MockL10n, MocksHelper,
         ThreadUI, MessageManager, ContactRenderer, Utils, Template, Threads,
         MockMessages, Settings, Navigation,
         AssetsHelper
*/

'use strict';

require('/js/utils.js');
require('/test/unit/mock_utils.js');
require('/test/unit/mock_thread_ui.js');
require('/test/unit/mock_threads.js');
require('/test/unit/mock_contact.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/test/unit/mock_contact.js');
require('/test/unit/mock_contacts.js');
require('/test/unit/mock_messages.js');
require('/test/unit/mock_navigation.js');
require('/test/unit/mock_settings.js');
require('/test/unit/mock_message_manager.js');
require('/test/unit/mock_contact_renderer.js');
require('/js/information.js');


var mocksHelperForInformation = new MocksHelper([
  'Contacts',
  'ContactRenderer',
  'MessageManager',
  'Navigation',
  'Settings',
  'ThreadUI',
  'Threads',
  'Utils'
]).init();

suite('Information view', function() {
  var realMozL10n;
  var contact;
  var testImageBlob;
  var groupView, reportView;

  mocksHelperForInformation.attachTestHelpers();

  suiteSetup(function(done) {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    AssetsHelper.generateImageBlob(400, 400, 'image/jpeg', 0.5).then(
      (blob) => {
        testImageBlob = blob;
      }
    ).then(done, done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    realMozL10n = null;
  });

  setup(function() {
    loadBodyHTML('/index.html');
    this.sinon.spy(navigator.mozL10n, 'localize');
    this.sinon.stub(MessageManager, 'on');
    contact = MockContact();
  });

  suite('Information prototype method', function() {
    setup(function() {
      reportView = new Information('report');
    });

    suite('view show/reset status', function() {
      test('view status before show method', function() {
        assert.isFalse(reportView.parent.classList.contains(
          reportView.name + '-information'));
        assert.isTrue(reportView.container.classList.contains('hide'));
      });

      test('view status after show method', function() {
        this.sinon.stub(reportView, 'render');
        reportView.show();
        assert.isTrue(reportView.parent.classList.contains(
          reportView.name + '-information'));
        assert.isFalse(reportView.container.classList.contains('hide'));
      });

      test('view status after reset method', function() {
        reportView.reset();
        assert.isFalse(reportView.parent.classList.contains(
          reportView.name + '-information'));
        assert.isTrue(reportView.container.classList.contains('hide'));
      });
    });

    suite('view refresh', function() {
      setup(function() {
        this.sinon.stub(reportView, 'render');
      });
      test('view refresh when page showed', function() {
        reportView.show();
        reportView.refresh();
        sinon.assert.called(reportView.render);
      });

      test('view does not refresh when page hided', function() {
        reportView.reset();
        reportView.refresh();
        sinon.assert.notCalled(reportView.render);
      });
    });

    suite('view renderContactList', function() {
      setup(function() {
        reportView.reset();
        this.sinon.spy(ContactRenderer.prototype, 'render');
      });
      test('renderContactList with string array', function() {
        var participants = ['111'];
        reportView.renderContactList(participants);
        assert.isTrue(ContactRenderer.prototype.render.called);
        var arg = ContactRenderer.prototype.render.args[0][0];
        assert.equal(arg.input, participants[0]);
        assert.equal(arg.infoBlock, null);
      });

      test('renderContactList with string array(not in contact)', function() {
        this.sinon.spy(Template.prototype, 'interpolate');
        this.sinon.stub(MockContact, 'list', function() {
          return [];
        });
        var participants = ['111'];
        reportView.renderContactList(participants);
        sinon.assert.notCalled(ContactRenderer.prototype.render);
        sinon.assert.calledWith(Template.prototype.interpolate, {
          number: participants[0]
        });
        assert.isTrue(!!reportView.contactList.firstElementChild);
      });

      test('renderContactList with object array', function() {
        var div = document.createElement('div');
        var participants = [
          { number: '222', infoBlock: div}
        ];
        reportView.renderContactList(participants);
        sinon.assert.called(ContactRenderer.prototype.render);
        var arg = ContactRenderer.prototype.render.args[0][0];
        assert.equal(arg.input, participants[0].number);
        assert.equal(arg.infoBlock, participants[0].infoBlock);
      });

      test('renderContactList with object array(not in contact)', function() {
        this.sinon.stub(MockContact, 'list', function() {
          return [];
        });
        this.sinon.stub(Template.prototype, 'interpolate', function() {
          return '<a class="suggestion"></a>';
        });
        var div = document.createElement('div');
        var participants = [
          { number: '222', infoBlock: div}
        ];
        reportView.renderContactList(participants);
        sinon.assert.notCalled(ContactRenderer.prototype.render);
        sinon.assert.calledWith(Template.prototype.interpolate, {
          number: participants[0].number
        });
        assert.isTrue(
          !!reportView.contactList.firstElementChild.firstElementChild);
      });
    });
  });

  suite('Message report view render', function() {
    var messageOpts = {};

    setup(function() {
      reportView = new Information('report');
      this.sinon.spy(reportView, 'renderContactList');
      this.sinon.spy(Template.prototype, 'interpolate');
      this.sinon.stub(MessageManager, 'getMessage', function(id) {
        var result;
        switch (id) {
          case 1:
            result = MockMessages.sms(messageOpts);
            break;
          case 2:
            result = MockMessages.mms(messageOpts);
            break;
        }
        var request = {
          result: result,
          set onsuccess(cb) {
            cb();
          },
          get onsuccess() {
            return {};
          }
        };
        return request;
      });
      this.sinon.spy(Utils.date.format, 'localeFormat');
      reportView.beforeEnter();
    });

    teardown(function() {
      reportView.reset();
      reportView.afterLeave();
    });

    test('Outgoing Message report(status sending)', function() {
      messageOpts = {
        sender: null,
        delivery: 'sending',
        deliveryStatus: 'pending'
      };

      reportView.id = 1;
      reportView.render();
      assert.isFalse(reportView.container.classList.contains('received'));
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-sms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-sending');
      assert.equal(reportView.status.dataset.type, 'sending');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-recipients');
      assert.isTrue(reportView.sizeBlock.classList.contains('hide'));
      sinon.assert.called(reportView.renderContactList);
    });

    test('Outgoing Message report(status sent)', function() {
      messageOpts = {
        sender: null,
        delivery: 'sent',
        deliveryStatus: 'success',
        deliveryTimestamp: Date.now()
      };

      reportView.id = 1;
      reportView.render();
      assert.isFalse(reportView.container.classList.contains('received'));
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-sms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-sent');
      assert.equal(reportView.status.dataset.type, 'sent');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-recipients');
      assert.isTrue(reportView.sizeBlock.classList.contains('hide'));
      sinon.assert.called(reportView.renderContactList);
    });

    test('Outgoing Message report(status error)', function() {
      messageOpts = {
        sender: null,
        delivery: 'error',
        deliveryStatus: 'error'
      };

      reportView.id = 1;
      reportView.render();
      assert.isFalse(reportView.container.classList.contains('received'));
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-sms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-error');
      assert.equal(reportView.status.dataset.type, 'error');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-recipients');
      assert.isTrue(reportView.sizeBlock.classList.contains('hide'));
      sinon.assert.called(reportView.renderContactList);
    });

    test('Outgoing Message report(MMS w/ subject)', function() {
      messageOpts = {
        sender: null,
        subject: 'Test subjuect',
        attachments: null,
        delivery: 'sent',
        deliveryStatus: 'success',
        deliveryTimestamp: Date.now()
      };

      reportView.id = 2;
      reportView.render();
      assert.isFalse(reportView.container.classList.contains('received'));
      assert.equal(reportView.subject.textContent, messageOpts.subject);
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-mms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-sent');
      assert.equal(reportView.status.dataset.type, 'sent');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-recipients');
      assert.isTrue(reportView.sizeBlock.classList.contains('hide'));
      sinon.assert.called(reportView.renderContactList);
    });

    test('Outgoing Message report(MMS w/o subject)', function() {
      messageOpts = {
        sender: null,
        attachments: [{content: testImageBlob}],
        delivery: 'sent',
        deliveryStatus: 'success',
        deliveryTimestamp: Date.now()
      };

      reportView.id = 2;
      reportView.render();
      assert.isFalse(reportView.container.classList.contains('received'));
      assert.equal(reportView.subject.textContent, '');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-mms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.size,
        'attachmentSize', { n: (testImageBlob.size / 1024).toFixed(1) });
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-sent');
      assert.equal(reportView.status.dataset.type, 'sent');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-recipients');
      assert.isFalse(reportView.sizeBlock.classList.contains('hide'));
      sinon.assert.called(reportView.renderContactList);
    });

    test('Incoming Message report(SMS)', function() {
      messageOpts = {
        receiver: null
      };
      var message = MockMessages.sms(messageOpts);
      reportView.id = 1;
      reportView.render();
      assert.isTrue(reportView.container.classList.contains('received'));
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-sms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-received');
      assert.equal(reportView.status.dataset.type, 'received');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-from');
      assert.isTrue(reportView.sizeBlock.classList.contains('hide'));
      sinon.assert.calledWith(reportView.renderContactList, [message.sender]);
    });

    test('Incoming Message report(MMS)', function() {
      messageOpts = {
        receiver: null,
        subject: 'Test subjuect',
        attachments: [{content: testImageBlob}]
      };
      var message = MockMessages.mms(messageOpts);
      reportView.id = 2;
      reportView.render();
      assert.isTrue(reportView.container.classList.contains('received'));
      assert.equal(reportView.subject.textContent, message.subject);
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-mms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.size,
        'attachmentSize', { n: (testImageBlob.size / 1024).toFixed(1) });
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-received');
      assert.equal(reportView.status.dataset.type, 'received');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-from');
      assert.isFalse(reportView.sizeBlock.classList.contains('hide'));
      sinon.assert.calledWith(reportView.renderContactList, [message.sender]);
    });

    test('Incoming Message report(status not downloaded)', function() {
      messageOpts = {
        receiver: null,
        delivery: 'not-downloaded',
        attachments: null
      };
      reportView.id = 2;
      reportView.render();
      assert.isTrue(reportView.container.classList.contains('received'));
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-mms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-not-downloaded');
      assert.equal(reportView.status.dataset.type, 'not-downloaded');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-from');
      sinon.assert.called(reportView.renderContactList);
    });

    test('Incoming Message with valid sent timestamp', function() {
      messageOpts = {
        delivery: 'received',
        sentTimestamp: Date.now()
      };

      reportView.id = 1;
      reportView.render();

      assert.isFalse(
        reportView.container.classList.contains('no-valid-sent-timestamp')
      );
    });

    test('Incoming Message with invalid sent timestamp', function() {
      messageOpts = {
        delivery: 'received',
        sentTimestamp: 0
      };

      reportView.id = 1;
      reportView.render();

      assert.isTrue(
        reportView.container.classList.contains('no-valid-sent-timestamp')
      );
    });

    suite('Message report with SIM information', function() {
      var simInfo;
      var simDetail;

      setup(function() {
        if (!('mozMobileConnections' in navigator)) {
          navigator.mozMobileConnections = null;
        }

        if (!('mozIccManager' in navigator)) {
          navigator.mozIccManager = null;
        }

        simInfo = reportView.simInfo;
        simDetail = simInfo.querySelector('.sim-detail');
        messageOpts = {
          iccId: '1'
        };
        reportView.id = 1;
      });

      teardown(function() {
        simInfo.classList.add('hide');
      });

      test('Hide SIM information for single SIM', function() {
        reportView.render();
        assert.isTrue(simInfo.classList.contains('hide'));
      });

      test('no phone number', function() {
        this.sinon.stub(window.navigator, 'mozIccManager', {
          getIccById: function() {
            return {
              'iccInfo': {
                msisdn: ''
              }
            };
          }
        });
        this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
        this.sinon.stub(Settings, 'getServiceIdByIccId').returns(0);
        this.sinon.stub(Settings, 'getOperatorByIccId').returns('operator');
        this.sinon.stub(navigator.mozL10n, 'setAttributes');
        reportView.render();

        sinon.assert.calledWithMatch(
          navigator.mozL10n.setAttributes,
          Object,
          'sim-detail',
          {
            id: 1,
            detailString: 'operator'
          }
        );

        assert.isFalse(simInfo.classList.contains('hide'));
      });

      test('no operator', function() {
        this.sinon.stub(window.navigator, 'mozIccManager', {
          getIccById: function() {
            return {
              'iccInfo': {
                msisdn: '1111'
              }
            };
          }
        });
        this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
        this.sinon.stub(Settings, 'getServiceIdByIccId').returns(0);
        this.sinon.stub(Settings, 'getOperatorByIccId').returns('');
        this.sinon.stub(navigator.mozL10n, 'setAttributes');
        reportView.render();

        sinon.assert.calledWithMatch(
          navigator.mozL10n.setAttributes,
          Object,
          'sim-detail',
          {
            id: 1,
            detailString: '1111'
          }
        );

        assert.isFalse(simInfo.classList.contains('hide'));
      });

      test('All information is accessible', function() {
        this.sinon.stub(window.navigator, 'mozIccManager', {
          getIccById: function() {
            return {
              'iccInfo': {
                msisdn: '1111'
              }
            };
          }
        });
        this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
        this.sinon.stub(Settings, 'getServiceIdByIccId').returns(1);
        this.sinon.stub(Settings, 'getOperatorByIccId').returns('operator');
        this.sinon.stub(navigator.mozL10n, 'setAttributes');
        reportView.render();

        sinon.assert.calledWithMatch(
          navigator.mozL10n.setAttributes,
          Object,
          'sim-detail',
          {
            id: 2,
            detailString: 'operator, 1111'
          }
        );

        assert.isFalse(simInfo.classList.contains('hide'));
      });
    });

    suite('Render report block in contact list(delivery status)', function() {
      var data;

      setup(function() {
        data = {
          deliveryClass: '',
          deliveryL10n: '',
          deliveryDateL10n: '',
          deliveryTimestamp: '',
          readClass: 'hide',
          readL10n: '',
          readDateL10n: '',
          readTimestamp: ''
        };
      });

      test('no delivery report', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryStatus: 'not-applicable'
        };

        reportView.id = 1;
        reportView.render();
        data.deliveryClass = 'hide';
        sinon.assert.calledWith(Template.prototype.interpolate, data);
      });

      test('delivery report requested but not return yet', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryStatus: 'pending'
        };

        reportView.id = 1;
        reportView.render();
        data.deliveryL10n = 'message-requested';
        sinon.assert.calledWith(Template.prototype.interpolate, data);
      });

      test('delivery report success', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryStatus: 'success',
          deliveryTimestamp: Date.now()
        };

        reportView.id = 1;
        reportView.render();
        data.deliveryDateL10n = Utils.date.format.localeFormat(
          new Date(messageOpts.deliveryTimestamp),
          navigator.mozL10n.get('report-dateTimeFormat')
        );
        data.deliveryTimestamp = '' + messageOpts.deliveryTimestamp;
        sinon.assert.calledWith(Template.prototype.interpolate, data);
      });

      test('delivery report error', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryStatus: 'error'
        };

        reportView.id = 1;
        reportView.render();
        data.deliveryL10n = 'message-status-error';
        sinon.assert.calledWith(Template.prototype.interpolate, data);
      });
    });

    suite('Render report block in contact list(read status)', function() {
      var data;

      setup(function() {
        data = {
          deliveryClass: 'hide',
          deliveryL10n: '',
          deliveryDateL10n: '',
          deliveryTimestamp: '',
          readClass: '',
          readL10n: '',
          readDateL10n: '',
          readTimestamp: ''
        };
      });

      test('no read report', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryInfo: [{
            receiver: 'receiver',
            readStatus: 'not-applicable'
          }]
        };
        reportView.id = 2;
        reportView.render();
        data.readClass = 'hide';
        sinon.assert.calledWith(Template.prototype.interpolate, data);
      });

      test('read report requested but not return yet', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryInfo: [{
            receiver: 'receiver',
            readStatus: 'pending'
          }]
        };
        reportView.id = 2;
        reportView.render();
        data.readL10n = 'message-requested';
        sinon.assert.calledWith(Template.prototype.interpolate, data);
      });

      test('read report success', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryInfo: [{
            receiver: 'receiver',
            readStatus: 'success',
            readTimestamp: Date.now()
          }]
        };
        reportView.id = 2;
        reportView.render();
        data.readDateL10n = Utils.date.format.localeFormat(
          new Date(messageOpts.deliveryInfo[0].readTimestamp),
          navigator.mozL10n.get('report-dateTimeFormat')
        );
        data.readTimestamp = '' + messageOpts.deliveryInfo[0].readTimestamp;
        sinon.assert.calledWith(Template.prototype.interpolate, data);
      });

      test('read report error', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryInfo: [{
            receiver: 'receiver',
            readStatus: 'error'
          }]
        };
        reportView.id = 2;
        reportView.render();
        data.readL10n = 'message-status-error';
        sinon.assert.calledWith(Template.prototype.interpolate, data);
      });
    });

    ['message-delivered', 'message-read'].forEach(function(event) {
      suite('MessageManager.on' + event + '()', function() {
        var fakeMessage;

        setup(function() {
          this.sinon.stub(reportView, 'refresh');
          this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
          fakeMessage = MockMessages.sms();
        });

        test('If showing this message, report is refreshed', function() {
          Navigation.isCurrentPanel
            .withArgs('report-view', { id: 1 }).returns(true);

          MessageManager.on.withArgs(event).yield({ message: fakeMessage });

          sinon.assert.called(reportView.refresh);
        });

        test('If showing another message, report is not refreshed', function() {
          Navigation.isCurrentPanel
            .withArgs('report-view', { id: 2 }).returns(true);

          MessageManager.on.withArgs(event).yield({ message: fakeMessage });

          sinon.assert.notCalled(reportView.refresh);
        });

        test('If not showing the report, it is not refreshed', function() {
          MessageManager.on.withArgs(event).yield({ message: fakeMessage });

          sinon.assert.notCalled(reportView.refresh);
        });
      });
    });
  });

  suite('Group view render', function() {
    var participants;

    setup(function() {
      participants = ['111', '222'];
      Threads.lastId = 1;
      this.sinon.stub(Threads, 'get', function() {
        return { participants: participants };
      });
      groupView = new Information('group');
      this.sinon.spy(groupView, 'renderContactList');
      groupView.render();
    });

    teardown(function() {
      delete Threads.lastId;
    });
    test('view status before show method', function() {
      sinon.assert.calledWith(groupView.renderContactList, participants);
      sinon.assert.calledWithMatch(navigator.mozL10n.localize,
        ThreadUI.headerText, 'participant', {n: participants.length});
    });
  });

  suite('ReportView', function() {
    var enterArgs, leaveArgs;

    setup(function() {
      reportView = new Information('report');
      this.sinon.stub(reportView, 'show');
      this.sinon.stub(reportView, 'reset');

      enterArgs = {
        id: 10,
        meta: {
          next: { panel: 'report-view', args: { id: 10 } },
          prev: { panel: 'thread', args: { id: 1 } }
        }
      };

      leaveArgs = {
        id: 1,
        meta: {
          next: { panel: 'thread', args: { id: 1 } },
          prev: { panel: 'report-view', args: { id: 10 } }
        }
      };
    });

    test('afterEnter() and beforeLeave()', function() {
      reportView.afterEnter(enterArgs);
      sinon.assert.called(reportView.show);
      assert.equal(
        reportView.id, enterArgs.id,
        'id is set after afterEnter'
      );

      reportView.beforeLeave(leaveArgs);
      sinon.assert.called(reportView.reset);
      assert.isNull(reportView.id, 'id is reset after beforeLeave');
    });

    suite('Set event listener', function() {
      test('No event listenser for report view', function() {
        var event = new MouseEvent('click',
          { bubbles: true, cancelable: true });
        var canceled = !reportView.contactList.dispatchEvent(event);

        assert.isFalse(canceled);
      });
    });
  });

  suite('GroupView', function() {
    var enterArgs, leaveArgs;

    setup(function() {
      groupView = new Information('group');
      this.sinon.stub(groupView, 'show');
      this.sinon.stub(groupView, 'reset');

      enterArgs = {
        id: 1,
        meta: {
          next: { panel: 'group-view', args: { id: 1 } },
          prev: { panel: 'thread', args: { id: 1 } }
        }
      };

      leaveArgs = {
        id: 1,
        meta: {
          next: { panel: 'thread', args: { id: 1 } },
          prev: { panel: 'group-view', args: { id: 1 } }
        }
      };
    });

    test('afterEnter() and beforeLeave()', function() {
      groupView.afterEnter(enterArgs);
      sinon.assert.called(groupView.show);
      assert.equal(
        groupView.id, enterArgs.id,
        'id is set after afterEnter'
      );

      groupView.beforeLeave(leaveArgs);
      sinon.assert.called(groupView.reset);
      assert.isNull(groupView.id, 'id is reset after beforeLeave');
    });

    suite('Set event listener', function() {
      setup(function(){
        this.sinon.stub(ThreadUI, 'promptContact');
      });

      test('Contact prompt is called when clicked on contactList', function() {
        var event = new MouseEvent('click',
          { bubbles: true, cancelable: true });
        var item = document.createElement('a');

        item.dataset.number = 'test number';
        groupView.contactList.appendChild(item);
        item.dispatchEvent(event);
        sinon.assert.calledWith(
          ThreadUI.promptContact,
          { number : item.dataset.number }
        );
      });
    });
  });
});

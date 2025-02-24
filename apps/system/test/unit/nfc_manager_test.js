'use strict';

/* globals MockDOMRequest, MockNfc, MocksHelper, NDEF,
           NfcUtils, NfcManager, MozActivity, NfcHandoverManager */

require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/js/nfc_utils.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/test/unit/mock_screen_manager.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/test/unit/mock_nfc.js');
requireApp('system/test/unit/mock_nfc_handover_manager.js');
requireApp('system/test/unit/mock_screen_manager.js');
requireApp('system/test/unit/mock_bluetooth.js');
require('/shared/test/unit/mocks/mock_system.js');

var mocksForNfcManager = new MocksHelper([
  'MozActivity',
  'ScreenManager',
  'SettingsListener',
  'NfcHandoverManager',
  'System'
]).init();

var MockMessageHandlers = {};
function MockMozSetMessageHandler(event, handler) {
  MockMessageHandlers[event] = handler;
}

suite('Nfc Manager Functions', function() {

  var realMozSetMessageHandler;
  var realMozBluetooth;

  mocksForNfcManager.attachTestHelpers();

  setup(function(done) {
    realMozSetMessageHandler = window.navigator.mozSetMessageHandler;
    window.navigator.mozSetMessageHandler = MockMozSetMessageHandler;
    realMozBluetooth = window.navigator.mozBluetooth;
    window.navigator.mozBluetooth = window.MockBluetooth;

    requireApp('system/js/nfc_manager.js', done);
  });

  teardown(function() {
    window.navigator.mozSetMessageHandler = realMozSetMessageHandler;
    window.mozBluetooth = realMozBluetooth;
  });

  suite('init', function() {
    test('Message handleres for nfc-manager-tech-xxx set', function() {
      var stubHandleTechnologyDiscovered =
        this.sinon.stub(NfcManager, '_handleTechDiscovered');
      var stubHandleTechLost = this.sinon.stub(NfcManager, '_handleTechLost');

      // calling init once more to register stubs as handlers
      NfcManager.init();

      MockMessageHandlers['nfc-manager-tech-discovered']();
      assert.isTrue(stubHandleTechnologyDiscovered.calledOnce);

      MockMessageHandlers['nfc-manager-tech-lost']();
      assert.isTrue(stubHandleTechLost.calledOnce);
    });

    test('NfcManager listens on screenchange, and the locking events',
    function() {
      var stubHandleEvent = this.sinon.stub(NfcManager, 'handleEvent');

      window.dispatchEvent(new CustomEvent('lockscreen-appopened'));
      assert.isTrue(stubHandleEvent.calledOnce);
      assert.equal(stubHandleEvent.getCall(0).args[0].type,
        'lockscreen-appopened');

      window.dispatchEvent(new CustomEvent('lockscreen-appclosed'));
      assert.isTrue(stubHandleEvent.calledTwice);
      assert.equal(stubHandleEvent.getCall(1).args[0].type,
        'lockscreen-appclosed');

      window.dispatchEvent(new CustomEvent('screenchange'));
      assert.isTrue(stubHandleEvent.calledThrice);
      assert.equal(stubHandleEvent.getCall(2).args[0].type, 'screenchange');
    });

    test('SettingsListner callback nfc.enabled fired', function() {
      var stubChangeHardwareState = this.sinon.stub(NfcManager,
                                               '_changeHardwareState');

      window.MockSettingsListener.mCallbacks['nfc.enabled'](true);
      assert.isTrue(stubChangeHardwareState.calledOnce);
      assert.equal(stubChangeHardwareState.getCall(0).args[0],
                   NfcManager.NFC_HW_STATE_ON);

      window.MockSettingsListener.mCallbacks['nfc.enabled'](false);
      assert.isTrue(stubChangeHardwareState.calledTwice);
      assert.equal(stubChangeHardwareState.getCall(1).args[0],
                   NfcManager.NFC_HW_STATE_OFF);

      window.System.locked = true;
      window.MockSettingsListener.mCallbacks['nfc.enabled'](true);
      assert.isTrue(stubChangeHardwareState.calledThrice);
      assert.equal(stubChangeHardwareState.getCall(2).args[0],
                   NfcManager.NFC_HW_STATE_DISABLE_DISCOVERY);
      window.System.locked = false;
    });
  });

  suite('handleEvent', function() {
    test('proper handling of lock, unlock, screenchange', function() {
      var stubChangeHardwareState = this.sinon.stub(NfcManager,
                                                   '_changeHardwareState');

      // screen lock when NFC ON
      NfcManager._hwState = NfcManager.NFC_HW_STATE_ON;
      window.System.locked = true;
      NfcManager.handleEvent(new CustomEvent('lockscreen-appopened'));
      assert.isTrue(stubChangeHardwareState.calledOnce);
      assert.equal(stubChangeHardwareState.getCall(0).args[0],
                   NfcManager.NFC_HW_STATE_DISABLE_DISCOVERY);

      // no change in NfcManager._hwState
      NfcManager._hwState = NfcManager.NFC_HW_STATE_DISABLE_DISCOVERY;
      NfcManager.handleEvent(new CustomEvent('screenchange'));
      assert.isTrue(stubChangeHardwareState.calledOnce);

      // screen unlock
      window.System.locked = false;
      NfcManager.handleEvent(new CustomEvent('lockscreen-appclosed'));
      assert.isTrue(stubChangeHardwareState.calledTwice);
      assert.equal(stubChangeHardwareState.getCall(1).args[0],
                   NfcManager.NFC_HW_STATE_ENABLE_DISCOVERY);

      // NFC off
      NfcManager._hwState = NfcManager.NFC_HW_STATE_OFF;
      NfcManager.handleEvent(new CustomEvent('lockscreen-appopened'));
      NfcManager.handleEvent(new CustomEvent('lockscreen-appclosed'));
      NfcManager.handleEvent(new CustomEvent('screenchange'));
      assert.isTrue(stubChangeHardwareState.calledTwice);
    });

    test('proper handling of shrinking-sent', function() {
      var stubRemoveEventListner = this.sinon.stub(window,
                                                   'removeEventListener');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      NfcManager.handleEvent(new CustomEvent('shrinking-sent'));

      assert.isTrue(stubRemoveEventListner.calledOnce);
      assert.equal(stubRemoveEventListner.getCall(0).args[0], 'shrinking-sent');
      assert.equal(stubRemoveEventListner.getCall(0).args[1], NfcManager);

      assert.isTrue(stubDispatchEvent.calledTwice);
      assert.equal(stubDispatchEvent.getCall(0).args[0].type,
                   'dispatch-p2p-user-response-on-active-app');
      assert.equal(stubDispatchEvent.getCall(0).args[0].detail, NfcManager);
      assert.equal(stubDispatchEvent.getCall(1).args[0].type, 'shrinking-stop');
    });
  });

  suite('_handleTechDiscovered', function() {
    var sampleMsg;
    var sampleURIRecord;
    var sampleMimeRecord;

    setup(function() {
      sampleMsg = {
        type: 'techDiscovered',
        techList: [],
        records: [],
        sessionToken: 'sessionToken'
      };

      // NDEF TNF well know uri unabbreviated
      sampleURIRecord = {
        tnf: NDEF.TNF_WELL_KNOWN,
        type: NDEF.RTD_URI,
        id: new Uint8Array([1]),
        payload: NfcUtils.fromUTF8('\u0000http://mozilla.org')
      };

      sampleMimeRecord = {
        tnf: NDEF.TNF_MIME_MEDIA,
        type: NfcUtils.fromUTF8('text/vcard'),
        id: new Uint8Array([2]),
        payload: NfcUtils.fromUTF8('BEGIN:VCARD\nVERSION:2.1\nN:J;\nEND:VCARD')
      };

    });

    // Helper methods, can be called multiple times in testcase, stubs and spies
    // need to be restored here.
    // invalid message test helper
    var execInvalidMessageTest = function(msg) {
      var stubVibrate = this.sinon.stub(window.navigator, 'vibrate');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var stubTryHandover = this.sinon.stub(NfcHandoverManager, 'tryHandover');
      var stubFireTag = this.sinon.stub(NfcManager, '_fireTagDiscovered');
      var validMsg = {techList: [], records: []};

      NfcManager._handleTechDiscovered(msg);

      assert.isTrue(stubVibrate.withArgs([25, 50, 125]).calledOnce,
                    'wrong vibrate, when msg: ' + msg);
      assert.isTrue(stubDispatchEvent.calledOnce,
                    'dispatchEvent not called once, when msg: ' + msg);
      assert.equal(stubDispatchEvent.getCall(0).args[0].type,
                   'nfc-tech-discovered',
                   'when msg ' + msg);
      assert.isTrue(stubTryHandover.withArgs(validMsg.records, undefined)
                                   .calledOnce, 'handover, when msg: ' + msg);
      assert.isTrue(stubFireTag.withArgs(validMsg, 'Unknown').calledOnce,
                    '_fireTagDiscovered, when msg: ' + msg);

      stubVibrate.restore();
      stubDispatchEvent.restore();
      stubTryHandover.restore();
      stubFireTag.restore();
    };

    // _fireNDEFDiscovered test helper
    var execNDEFMessageTest = function(msg, tech) {
      var stub = this.sinon.stub(NfcManager, '_fireNDEFDiscovered');

      NfcManager._handleTechDiscovered(msg);
      assert.isTrue(stub.withArgs(msg, tech).calledOnce);

      stub.restore();
    };

    // _fireTagDiscovered test helper
    var execTagDiscoveredTest = function(msg, tech) {
      var stub = this.sinon.stub(NfcManager, '_fireTagDiscovered');

      NfcManager._handleTechDiscovered(msg);
      assert.deepEqual(stub.firstCall.args[0], msg);
      assert.equal(stub.firstCall.args[1], tech);

      stub.restore();
    };

    test('valid message, proper methods called', function() {
      sampleMsg.records.push(sampleURIRecord);
      sampleMsg.techList.push('NDEF');

      var stubVibrate = this.sinon.stub(window.navigator, 'vibrate');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var stubTryHandover = this.sinon.stub(NfcHandoverManager, 'tryHandover');
      var spyGetTech = this.sinon.spy(NfcManager, '_getPrioritizedTech');
      var stubFireNDEF = this.sinon.stub(NfcManager, '_fireNDEFDiscovered');

      NfcManager._handleTechDiscovered(sampleMsg);
      assert.isTrue(stubVibrate.withArgs([25, 50, 125]).calledOnce, 'vibrate');
      assert.equal(stubDispatchEvent.firstCall.args[0].type,
                   'nfc-tech-discovered');
      assert.isTrue(stubTryHandover
                    .withArgs(sampleMsg.records, sampleMsg.sessionToken)
                    .calledOnce, 'tryHandover');
      assert.isTrue(spyGetTech.withArgs(sampleMsg.techList).calledOnce,
                    '_getPrioritizedTech');
      assert.isTrue(stubFireNDEF.withArgs(sampleMsg, 'NDEF').calledOnce,
                    '_fireNDEFDiscovered');
    });

    test('invalid message handling', function() {
      execInvalidMessageTest.call(this, null);
      execInvalidMessageTest.call(this, {});
      execInvalidMessageTest.call(this, {techList: 'invalid'});
      execInvalidMessageTest.call(this, {techList: []});
    });

    // triggering of P2P UI
    test('message tech [P2P], no records', function() {
      sampleMsg.techList.push('P2P');

      var spyTriggerP2PUI = this.sinon.spy(NfcManager, '_triggerP2PUI');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      NfcManager._handleTechDiscovered(sampleMsg);
      assert.isTrue(spyTriggerP2PUI.calledOnce);
      assert.equal(stubDispatchEvent.secondCall.args[0].type,
                   'check-p2p-registration-for-active-app');
    });

    // P2P shared NDEF received
    test('message tech [P2P, NDEF], one record', function() {
      sampleMsg.techList.push('P2P');
      sampleMsg.techList.push('NDEF');
      sampleMsg.records.push(sampleMimeRecord);

      execNDEFMessageTest.call(this, sampleMsg, 'P2P');
    });

    test('message tech [NDEF], one URI record', function() {
      sampleMsg.techList.push('NDEF');
      sampleMsg.records.push(sampleURIRecord);

      execNDEFMessageTest.call(this, sampleMsg, 'NDEF');
    });

    // NDEF with no records was previosly treated as a special case
    // right now it is handled regularly in _fireNDEFDiscovered
    test('message tech [NDEF], no records', function() {
      sampleMsg.techList.push('NDEF');

      execNDEFMessageTest.call(this, sampleMsg, 'NDEF');
    });

    // NDEF_WRITABLE is a flag which informs that it's possible to write
    // NDEF message on a tag, might have NDEF records
    test('message tech [NDEF_WRITEABLE]', function() {
      sampleMsg.techList.push('NDEF_WRITEABLE');

      execNDEFMessageTest.call(this, sampleMsg, 'NDEF_WRITEABLE');
    });

    test('message tech [NDEF_FORMATABLE]', function() {
      sampleMsg.techList.push('NDEF_FORMATABLE');
      sampleMsg.records.push = 'propriatary data';

      execTagDiscoveredTest.call(this, sampleMsg, 'NDEF_FORMATABLE');
    });

    test('message tech unsupported', function() {
      sampleMsg.techList.push('FAKE_TECH');

      execTagDiscoveredTest.call(this, sampleMsg, 'FAKE_TECH');
    });

    test('activities triggering end 2 end', function() {
      // empty record
      var empty = { tnf: NDEF.TNF_EMPTY };

      sampleMsg.techList.push('NDEF');
      sampleMsg.techList.push('NDEF_WRITEABLE');
      sampleMsg.records.push(sampleURIRecord);
      sampleMsg.records.push(empty);
      sampleMsg.records.push(sampleMimeRecord);

      this.sinon.stub(window, 'MozActivity');

      NfcManager._handleTechDiscovered(sampleMsg);

      assert.deepEqual(MozActivity.firstCall.args[0], {
        name: 'nfc-ndef-discovered',
        data: {
                type: 'url',
                url: 'http://mozilla.org',
                records: sampleMsg.records,
                tech: 'NDEF',
                techList: sampleMsg.techList,
                sessionToken: sampleMsg.sessionToken
        }
      }, 'Uri record');

      sampleMsg.records.shift();
      NfcManager._handleTechDiscovered(sampleMsg);
      assert.deepEqual(MozActivity.secondCall.args[0], {
        name: 'nfc-ndef-discovered',
        data: {
          type: 'empty',
          tech: 'NDEF',
          techList: sampleMsg.techList,
          records: sampleMsg.records,
          sessionToken: sampleMsg.sessionToken
        }
      },'TNF empty');

      sampleMsg.records.shift();
      NfcManager._handleTechDiscovered(sampleMsg);
      assert.deepEqual(MozActivity.thirdCall.args[0], {
        name: 'import',
        data: {
          type: 'text/vcard',
          blob: new Blob([NfcUtils.toUTF8(sampleMsg.records.payload)],
                         {'type': 'text/vcard'}),
          tech: 'NDEF',
          techList: sampleMsg.techList,
          records: sampleMsg.records,
          sessionToken: sampleMsg.sessionToken
        }
      },'mime record');

      sampleMsg.records.shift();
      sampleMsg.techList.shift();
      NfcManager._handleTechDiscovered(sampleMsg);
      assert.deepEqual(MozActivity.lastCall.args[0], {
        name: 'nfc-ndef-discovered',
        data: {
          type: 'empty',
          tech: 'NDEF_WRITEABLE',
          techList: sampleMsg.techList,
          records: sampleMsg.records,
          sessionToken: sampleMsg.sessionToken
        }
      }, 'no records');
    });
  });

  suite('_handleTechLost', function() {
    test('vibrates and dispatches nfc-tech-lost event', function() {
      var stubVibrate = this.sinon.stub(window.navigator, 'vibrate');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      NfcManager._handleTechLost();
      assert.isTrue(stubVibrate.withArgs([125, 50, 25]).calledOnce, 'vibrate');
      assert.equal(stubDispatchEvent.firstCall.args[0].type, 'nfc-tech-lost');
    });

    test('P2P clean up', function() {
      var stubRemoveListner = this.sinon.stub(window, 'removeEventListener');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      NfcManager._handleTechLost();
      assert.equal(stubRemoveListner.firstCall.args[0], 'shrinking-sent');
      assert.deepEqual(stubRemoveListner.firstCall.args[1], NfcManager);
      assert.equal(stubDispatchEvent.secondCall.args[0].type, 'shrinking-stop');
    });
  });

  suite('_triggerP2PUI', function() {
    test('dispatches proper event', function() {
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      NfcManager._triggerP2PUI();
      assert.equal(stubDispatchEvent.firstCall.args[0].type,
                   'check-p2p-registration-for-active-app');
      assert.isTrue(stubDispatchEvent.firstCall.args[0].bubbles,
                    'bubbles not set to true');
      assert.isFalse(stubDispatchEvent.firstCall.args[0].cancelable,
                     'should not be cancelable');
      assert.deepEqual(stubDispatchEvent.firstCall.args[0].detail, NfcManager,
                       'NfcManager not passed as detail property of the event');
    });
  });

  suite('_fireNDEFDiscovered', function() {
    var msg;
    var uriRecord;

    setup(function() {
      msg = {
        type: 'techDiscovered',
        techList: [],
        records: [],
        sessionToken: 'sessionToken'
      };

      uriRecord = {
        tnf: NDEF.TNF_WELL_KNOWN,
        type: NDEF.RTD_URI,
        id: new Uint8Array([1]),
        payload: NfcUtils.fromUTF8('\u0000http://mozilla.org')
      };

      this.sinon.stub(window, 'MozActivity');
    }),

    teardown(function() {
      window.MozActivity.restore();
    }),

    suite('NDEF.payload.decode called with proper args', function() {
      var stubDecodePayload;
      var smartPoster;

      setup(function() {
        smartPoster = {
          tnf: NDEF.TNF_WELL_KNOWN,
          type: NDEF.RTD_SMART_POSTER,
          id: new Uint8Array([2]),
          payload: 'fake payload'
        };

        stubDecodePayload = this.sinon.stub(NDEF.payload, 'decode',
                                            () => null);
      });

      teardown(function() {
        stubDecodePayload.restore();
      });

      test('Multiple records, first record decoded', function() {
        msg.records.push(uriRecord);
        msg.records.push({tnf: NDEF.TNF_EMPTY});
        msg.techList.push('NDEF');

        NfcManager._fireNDEFDiscovered(msg, msg.techList[0]);
        assert.isTrue(stubDecodePayload.withArgs(uriRecord.tnf,
                                                 uriRecord.type,
                                                 uriRecord.payload)
                                       .calledOnce);
      });

      test('SP (Smart Poster) takes precedence over URI record', function() {
        msg.records.push(uriRecord);
        msg.records.push(smartPoster);
        msg.techList.push('NDEF');

        NfcManager._fireNDEFDiscovered(msg, msg.techList[0]);
        assert.isTrue(stubDecodePayload.withArgs(smartPoster.tnf,
                                                 smartPoster.type,
                                                 smartPoster.payload)
                                       .calledOnce);
      });

      test('SP doesnt take precedence over other records', function() {
        msg.records.push({tnf: NDEF.TNF_EMPTY});
        msg.records.push(smartPoster);
        msg.techList.push('NDEF');

        NfcManager._fireNDEFDiscovered(msg, msg.techList[0]);
        assert.isTrue(stubDecodePayload.withArgs(NDEF.TNF_EMPTY,
                                                 undefined,
                                                 undefined)
                                       .calledOnce);
      });

      test('Empty NDEF message', function() {
        msg.techList.push('NDEF');

        NfcManager._fireNDEFDiscovered(msg, msg.techList[0]);
        assert.isTrue(stubDecodePayload.withArgs(NDEF.TNF_EMPTY,
                                                 undefined,
                                                 undefined)
                                       .calledOnce);
      });
    }),

    test('_getSmartPoster called with proper arg', function() {
      msg.records.push(uriRecord);
      msg.techList.push('NDEF');

      var spyGetSmartPoster = this.sinon.spy(NfcManager, '_getSmartPoster');

      NfcManager._fireNDEFDiscovered(msg, msg.techList[0]);
      assert.isTrue(spyGetSmartPoster.withArgs(msg.records).calledOnce);
    }),

    test('_createNDEFActivityOptions called with proper args', function() {
      msg.records.push(uriRecord);
      msg.techList.push('NDEF');

      this.sinon.stub(NDEF.payload, 'decode', () => 'decoded');
      var spyCreateOptions = this.sinon.spy(NfcManager,
                                            '_createNDEFActivityOptions');

      NfcManager._fireNDEFDiscovered(msg, msg.techList[0]);
      assert.isTrue(spyCreateOptions.withArgs('decoded').calledOnce);
    }),

    test('MozActivity called with proper args, valid NDEF', function() {
      msg.records.push(uriRecord);
      msg.techList.push('NDEF');

      NfcManager._fireNDEFDiscovered(msg, msg.techList[0]);
      assert.deepEqual(MozActivity.firstCall.args[0], {
        name: 'nfc-ndef-discovered',
        data: {
                type: 'url',
                url: 'http://mozilla.org',
                records: msg.records,
                tech: msg.techList[0],
                techList: msg.techList,
                sessionToken: msg.sessionToken
        }
      });
    });

    test('MozActivity called with proper args, invalid NDEF', function() {
      msg.techList.push('NDEF');

      this.sinon.stub(NDEF.payload, 'decode', () => null);

      NfcManager._fireNDEFDiscovered(msg, msg.techList[0]);
      assert.deepEqual(MozActivity.firstCall.args[0], {
        name: 'nfc-ndef-discovered',
        data: {
                tech: msg.techList[0],
                techList: msg.techList,
                sessionToken: msg.sessionToken
        }
      });
    });
  }),

  suite('_fireTagDiscovered', function() {
    var msg = {
      sessionToken: 'token',
      techList: ['NDEF_FORMATABLE', 'ISODEP', 'FAKE_TECH'],
      type: 'techDiscovered',
      records: []
    };

    test('NDEF_FORMATABLE tech type', function() {
      this.sinon.stub(window, 'MozActivity');
      var dummyMsg = Object.create(msg);

      NfcManager._fireTagDiscovered(dummyMsg, dummyMsg.techList[0]);
      assert.deepEqual(MozActivity.getCall(0).args[0],
                       {
                         name: 'nfc-tag-discovered',
                         data: {
                           type: 'NDEF_FORMATABLE',
                           techList: dummyMsg.techList,
                           sessionToken: dummyMsg.sessionToken,
                           records: dummyMsg.records
                         }
                       });
    });
  });

  suite('_getSmartPoster', function() {
    var smartPosterRecord;
    var uriRecord;
    var mimeRecord;

    setup(function() {
      smartPosterRecord = {
        tnf: NDEF.TNF_WELL_KNOWN,
        type: NDEF.RTD_SMART_POSTER,
        id: new Uint8Array([1]),
        paylod: NfcUtils.fromUTF8('dummy payload')
      };

      uriRecord = {
        tnf: NDEF.TNF_WELL_KNOWN,
        type: NDEF.RTD_URI,
        id: new Uint8Array([2]),
        payload: NfcUtils.fromUTF8('dummy uri')
      };

      mimeRecord = {
        tnf: NDEF.TNF_MIME_MEDIA,
        type: NfcUtils.fromUTF8('text/plain'),
        id: new Uint8Array([3]),
        payload: NfcUtils.fromUTF8('dummy text')
      };
    });

    test('no Smart Poster (SP) - null returned', function() {
      var result = NfcManager._getSmartPoster([uriRecord, mimeRecord]);
      assert.equal(result, null);
    });

    test('URI record first, SP record second - SP returned', function() {
      var result = NfcManager._getSmartPoster([uriRecord, smartPosterRecord]);
      assert.deepEqual(result, smartPosterRecord);
    });

    test('MIME record first, SP record second - null returned', function() {
      var result = NfcManager._getSmartPoster([mimeRecord, smartPosterRecord]);
      assert.equal(result, null);
    });

    test('SP record only - SP record returned', function() {
      var result = NfcManager._getSmartPoster([smartPosterRecord]);
      assert.deepEqual(result, smartPosterRecord);
    });

    test('Array empty - null returned', function() {
      var result = NfcManager._getSmartPoster([]);
      assert.equal(result, null);
    });
  });

  suite('_createNDEFActivityOptions', function() {
    const NDEF_ACTIVITY_NAME = 'nfc-ndef-discovered';

    test('URI tel -> dial number', function() {
      var payload = { type: 'uri', uri: 'tel:012345678' };

      var options = NfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: 'dial',
        data: {
          type: 'webtelephony/number',
          number: payload.uri.substring(4),
          uri: payload.uri
        }
      });
    });

    test('URI mailto -> create new mail', function() {
      var payload = { type: 'uri', uri: 'mailto:bugzilla-daemon@mozilla.org' };

      var options = NfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: 'new',
        data: {
          type: 'mail',
          url: payload.uri
        }
      });
    });

    test('URI http(s) -> launch browser', function() {
      var payload = { type: 'uri', uri: 'http://mozilla.org' };

      var options = NfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: NDEF_ACTIVITY_NAME,
        data: {
          type: 'url',
          url: payload.uri
        }
      });
    });

    test('URI other', function() {
      var payload = { type: 'uri', uri: 'sip:bob@bob.com' };

      var options = NfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: NDEF_ACTIVITY_NAME,
        data: {
          type: 'uri',
          uri: payload.uri
        }
      });
    });

    test('SmartPoster with http(s) -> launch browser', function() {
      var payload = {
        type: 'smartposter',
        uri: 'http://mozilla.org',
        text: {
          en: 'Home of the Mozilla Project',
          pl: 'Strona domowa projektu Mozilla'
        }
      };

      var options = NfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: NDEF_ACTIVITY_NAME,
        data: {
          type: 'url',
          text: payload.text,
          url: 'http://mozilla.org',
        }
      });
    });

    test('SmartPoster other URI', function() {
      var payload = {
        type: 'smartposter',
        uri: 'sip:bob@bob.com',
        text: {
          en: 'Call me!',
          pl: 'Zadzwoń do mnie!'
        }
      };

      var options = NfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: NDEF_ACTIVITY_NAME,
        data: payload
      });
    });

    test('text/vcard -> import contct', function() {
      var payload = {
        type: 'text/vcard',
        blob: new Blob(['dummy'], {type: 'text/vcard'})
      };

      var options = NfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: 'import',
        data: payload
      });
    });

    test('other payload', function() {
      var payload = {
        type: 'http://mozilla.org'
      };

      var options = NfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: NDEF_ACTIVITY_NAME,
        data: {
          type: payload.type
        }
      });
    });

    test('no payload', function() {
      var options = NfcManager._createNDEFActivityOptions(null);
      assert.deepEqual(options, { name: NDEF_ACTIVITY_NAME, data: {} });
    });
  });

  suite('dispatchP2PUserResponse', function() {
    var realMozNfc = navigator.mozNfc;

    setup(function() {
      navigator.mozNfc = MockNfc;
    });

    teardown(function() {
      navigator.mozNfc = realMozNfc;
    });

    test('calls proper mozNfc method', function() {
      var stubNotifyAcceptedP2P = this.sinon.stub(MockNfc,
                                                  'notifyUserAcceptedP2P');

      NfcManager.dispatchP2PUserResponse('manifestURL');
      assert.isTrue(stubNotifyAcceptedP2P.withArgs('manifestURL').calledOnce);
    });
  });

  suite('checkP2PRegistrations', function() {
    var realMozNfc = navigator.mozNfc;

    setup(function() {
      navigator.mozNfc = MockNfc;
    });

    teardown(function() {
      navigator.mozNfc = realMozNfc;
    });

    test('calls proper mozNfc method', function() {
      var stubCheckP2P = this.sinon.stub(MockNfc, 'checkP2PRegistration',
                                         () => { return {}; });

      NfcManager.checkP2PRegistration('dummy url');
      assert.isTrue(stubCheckP2P.withArgs('dummy url').calledOnce);
    });

    test('app registered onpeerready handler - success', function() {
      // Setup Fake DOMRequest to stub with:
      var fakeDOMRequest = new MockDOMRequest();
      this.sinon.stub(MockNfc, 'checkP2PRegistration',
                      (manifest) => fakeDOMRequest);
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var spyAddEventListener = this.sinon.spy(window, 'addEventListener');

      // An unprivilaged P2P UI would send message to NFC Manager to validate
      // P2P registration in the stubbed DOM.
      NfcManager.checkP2PRegistration('dummyManifestUrl');

      fakeDOMRequest.fireSuccess(true);
      stubDispatchEvent.getCall(0).calledWith({ type: 'shrinking-start',
                                                bubbles: false });
      assert.isTrue(spyAddEventListener.withArgs('shrinking-sent').calledOnce);
    });

    test('app not registered for onpeerready event - error', function() {
      // Setup Fake DOMRequest to stub with:
      var fakeDOMRequest = new MockDOMRequest();
      this.sinon.stub(MockNfc, 'checkP2PRegistration',
                      (manifestURL) => fakeDOMRequest);
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var spyRemoveEventListener = this.sinon.spy(window,
                                                  'removeEventListener');

      // An unprivilaged P2P UI would send message to NFC Manager to validate
      // P2P registration in the stubbed DOM.
      NfcManager.checkP2PRegistration('dummyManifestUrl');

      // Note: Error status is fired through the success code path.
      fakeDOMRequest.fireSuccess(false);
      stubDispatchEvent.getCall(0).calledWith({ type: 'shrinking-stop',
                                                bubbles: false });
      assert.isTrue(
        spyRemoveEventListener.withArgs('shrinking-sent').calledOnce);
    });

  });

  suite('_getPrioritizedTech', function() {
    var techList1 = ['NDEF_WRITEABLE', 'P2P', 'NDEF', 'NDEF_FORMATABLE'];
    var techList2 = ['NDEF_WRITEABLE', 'NDEF', 'NDEF_FORMATABLE'];
    var techList3 = ['NDEF_WRITEABLE', 'NDEF', 'NFC_ISO_DEP'];
    var techList4 = [];

    test('techList P2P test', function() {
      var tech = NfcManager._getPrioritizedTech(techList1);
      assert.equal(tech, 'P2P');
    });

    test('techList NDEF test', function() {
      var tech = NfcManager._getPrioritizedTech(techList2);
      assert.equal(tech, 'NDEF');
    });

    test('techList Unsupported technology test', function() {
      var tech = NfcManager._getPrioritizedTech(techList3);
      assert.equal(tech, 'NDEF');
    });

    test('techList empty', function() {
      var tech = NfcManager._getPrioritizedTech(techList4);
      assert.equal(tech, 'Unknown');
    });
  });

  suite('_changeHardwareState', function() {
    var realNfc = navigator.mozNfc;

    setup(function() {
      navigator.mozNfc = MockNfc;
    });

    teardown(function() {
      navigator.mozNfc = realNfc;
    });

    test('proper mozNfc methods called', function() {
      var spyStartPoll = this.sinon.spy(MockNfc, 'startPoll');
      var spyStopPoll = this.sinon.spy(MockNfc, 'stopPoll');
      var spyPowerOff = this.sinon.spy(MockNfc, 'powerOff');
      var spyDispatchEvent = this.sinon.spy(window, 'dispatchEvent');

      NfcManager._changeHardwareState(NfcManager.NFC_HW_STATE_OFF);
      assert.isTrue(spyPowerOff.calledOnce);
      assert.isTrue(spyDispatchEvent.calledOnce);

      NfcManager._changeHardwareState(NfcManager.NFC_HW_STATE_ON);
      assert.isTrue(spyStartPoll.calledOnce);
      assert.isTrue(spyDispatchEvent.calledTwice);

      NfcManager._changeHardwareState(NfcManager.NFC_HW_STATE_ENABLE_DISCOVERY);
      assert.isTrue(spyStartPoll.calledTwice);

      NfcManager
      ._changeHardwareState(NfcManager.NFC_HW_STATE_DISABLE_DISCOVERY);
      assert.isTrue(spyStopPoll.calledOnce);
    });
  });
});

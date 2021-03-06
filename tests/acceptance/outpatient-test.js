import {
  click,
  currentURL,
  visit,
  waitUntil
} from '@ember/test-helpers';
import jquerySelect from 'hospitalrun/tests/helpers/deprecated-jquery-select';
import jqueryLength from 'hospitalrun/tests/helpers/deprecated-jquery-length';
import { findWithAssert } from 'ember-native-dom-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import moment from 'moment';
import runWithPouchDump from 'hospitalrun/tests/helpers/run-with-pouch-dump';
import select from 'hospitalrun/tests/helpers/select';
import selectDate from 'hospitalrun/tests/helpers/select-date';
import typeAheadFillIn from 'hospitalrun/tests/helpers/typeahead-fillin';
import { waitToAppear } from 'hospitalrun/tests/helpers/wait-to-appear';
import { authenticateUser } from 'hospitalrun/tests/helpers/authenticate-user';

module('Acceptance | outpatient', function(hooks) {
  setupApplicationTest(hooks);

  test('Check In/Check Out Existing outpatient', function(assert) {
    return runWithPouchDump('patient', async function() {
      await authenticateUser();
      await visit('/patients/outpatient');
      assert.equal(currentURL(), '/patients/outpatient', 'Outpatient url is correct');
      assert.dom('.view-current-title').hasText('Today\'s Outpatients', 'Title is correct');

      await click(jquerySelect('button:contains(Patient Check In)'));

      await waitUntil(() => currentURL() === '/visits/edit/checkin');

      assert.equal(currentURL(), '/visits/edit/checkin', 'Check In url is correct');

      await typeAheadFillIn('.patient-name', 'Joe Bagadonuts - P00001');
      await waitToAppear('.patient-name .ps-info-data');
      assert.dom('.patient-name .ps-info-data').hasText('Joe Bagadonuts', 'Joe Bagadonuts patient record displays');
      assert.dom('.new-patient-checkbox input').isNotChecked('New Patient checkbox is not checked');

      await select('.visit-type', 'Clinic');
      await click(jquerySelect('button:contains(Check In)'));
      await waitToAppear('.modal-dialog');
      assert.dom('.modal-title').hasText('Patient Checked In', 'Patient has been checked in');

      await click(jquerySelect('.modal-footer button:contains(Ok)'));
      findWithAssert(jquerySelect('button:contains(Check Out)'));

      await click(jquerySelect('button:contains(Return)'));

      await waitUntil(() => currentURL() === '/patients/outpatient');

      assert.equal(currentURL(), '/patients/outpatient', 'Returned to Outpatient');
      assert.equal(jqueryLength('.outpatient-list td:contains(Joe Bagadonuts)'), 1, 'Checked in patient appears in list');

      await click(jquerySelect('button:contains(Check Out)'));
      await waitToAppear('.modal-dialog');
      assert.dom('.modal-title').hasText('Patient Check Out', 'Patient checkout confirmation displays');

      await click(jquerySelect('button:contains(Ok)'));
      await waitToAppear('.modal-title:contains(Patient Checked Out)');
      assert.dom('.modal-title').hasText('Patient Checked Out', 'Patient has been checked out confirmation');

      await click(jquerySelect('button:contains(Ok)'));
      assert.equal(jqueryLength('.outpatient-list td:contains(Joe Bagadonuts)'), 0, 'Checked out patient no longer appears');
    });
  });

  test('Check In/Check Out new outpatient', function(assert) {
    return runWithPouchDump('patient', async function() {
      let visitDate = moment('2015-10-01');
      let visitLocation = 'Outpatient Followup';
      await authenticateUser();
      await visit('/patients/outpatient');
      assert.equal(currentURL(), '/patients/outpatient', 'Outpatient url is correct');
      assert.dom('.view-current-title').hasText('Today\'s Outpatients', 'Title is correct');

      await click(jquerySelect('button:contains(Patient Check In)'));

      await waitUntil(() => currentURL() === '/visits/edit/checkin');

      assert.equal(currentURL(), '/visits/edit/checkin', 'Check In url is correct');

      await typeAheadFillIn('.patient-name', 'Jane Bagadonuts');
      assert.dom('.new-patient-checkbox input').isChecked('New Patient checkbox is checked');

      await selectDate('.checkin-date input', visitDate.toDate());
      await select('.visit-type', 'Followup');
      await typeAheadFillIn('.visit-location', visitLocation);
      await click(jquerySelect('button:contains(Check In)'));
      await waitToAppear('.modal-title:contains(New Patient)');
      assert.dom('.modal-title').hasText('New Patient', 'New Patient dialog appears');

      await click(jquerySelect('.modal-footer button:contains(Add)'));
      await waitToAppear('.modal-title:contains(Patient Checked In)');
      assert.dom('.modal-title').hasText('Patient Checked In', 'Patient has been checked in');
      assert.dom('.modal-body').hasText(
        'Jane Bagadonuts has been created and checked in.',
        'Patient has been created and checked in'
      );

      await click(jquerySelect('button:contains(Ok)'));
      findWithAssert(jquerySelect('button:contains(Check Out)'));

      await click(jquerySelect('button:contains(Return)'));

      await waitUntil(() => currentURL() === '/patients/outpatient');

      assert.equal(currentURL(), '/patients/outpatient', 'Returned to Outpatient');
      assert.equal(jqueryLength('.outpatient-list td:contains(Jane Bagadonuts)'), 0, 'Checked in patient does not appears in list because of date');

      await selectDate('.outpatient-date input', visitDate.toDate());
      await click(jquerySelect('button:contains(Search)'));
      await waitToAppear(`.view-current-title:contains(Outpatients for ${visitDate.format('l')})`);
      assert.dom('.view-current-title').hasText(
        `Outpatients for ${visitDate.format('l')}`,
        'Title updates to specified date'
      );

      await waitToAppear('.outpatient-list td:contains(Jane Bagadonuts)');
      assert.equal(jqueryLength('.outpatient-list td:contains(Jane Bagadonuts)'), 1, 'Checked in patient appears with date filtered.');

      await select('.outpatient-location', 'Hospital');
      await click(jquerySelect('button:contains(Search)'));
      assert.equal(jqueryLength('.outpatient-list td:contains(Jane Bagadonuts)'), 0, 'Checked in patient does not appear because different location.');
      findWithAssert(jquerySelect(`.outpatient-location option:contains(${visitLocation})`));

      await select('.outpatient-location', visitLocation);
      await click(jquerySelect('button:contains(Search)'));
      assert.equal(jqueryLength('.outpatient-list td:contains(Jane Bagadonuts)'), 1, 'Checked in patient appears with date and location filtered.');

      await visit('/patients');
      assert.equal(jqueryLength('tr:last td:contains(Jane)'), 1, 'New patient appears in patient listing.');

      await click(jquerySelect('tr:last td button:contains(Check Out)'));
      await waitToAppear('.view-current-title:contains(Edit Visit)');
      assert.dom('.view-current-title').hasText('Edit Visit', 'Visit displays on checkout from patient listing');
      assert.dom('.patient-name .ps-info-data').hasText('Jane Bagadonuts', 'Jane Bagadonuts patient record displays');

      await click(jquerySelect('button:contains(Check Out)'));
      await waitToAppear('.modal-dialog');
      assert.dom('.modal-title').hasText('Patient Checked Out', 'Patient has been checked out confirmation');

      await click(jquerySelect('button:contains(Ok)'));

      let checkoutDate = moment();
      assert.dom('.checkout-date input').hasValue(checkoutDate.format('l h:mm A'), 'Check Out date properly set');

      await visit('/patients/outpatient');
      assert.equal(jqueryLength('.outpatient-list td:contains(Jane Bagadonuts)'), 0, 'Checked out patient no longer appears');
    });
  });
});

<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

namespace mod_studentquiz\commentarea\form;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/formslib.php');

/**
 * Form for report a comment or reply.
 *
 * @package mod
 * @subpackage studentquiz
 * @copyright 2019 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class comment_report_form extends \moodleform {

    /** @var int - Number of report conditions. */
    private $numconditions = 6;

    /** @var array - Array of report conditions. */
    private $conditions = [];

    /** @var string - Report condition more text. */
    private $conditionmore;

    /** @var string - Reason to report text. */
    private $reasonlabel;

    /** @var string - Reporter's info text. */
    private $reporterinfo;

    /** @var string - Report's info detail. */
    private $reporterdetail;

    /**
     * Load all lang data.
     */
    private function load_lang() {
        for ($i = 1; $i <= $this->numconditions; $i++) {
            $this->conditions[$i] = get_string('report_comment_condition' . $i, 'studentquiz');
        }
        $this->conditionmore = get_string('report_comment_condition_more', 'studentquiz');
        $this->reasonlabel = get_string('report_comment_reasons', 'studentquiz');
        $this->reporterinfo = get_string('report_comment_reporter_info', 'studentquiz');
        $this->reporterdetail = get_string('report_comment_reporter_detail', 'studentquiz', $this->_customdata);
    }

    /**
     * Definition HTML inputs for comment_report_form.
     */
    protected function definition() {
        $this->load_lang();
        $mform = $this->_form;

        // Add report description.
        $mform->addElement('static', 'report_comment_intro', '', get_string('report_comment_info', 'studentquiz'));

        $checkboxes = [];
        for ($i = 1; $i <= $this->numconditions; $i++) {
            $checkboxes[] =& $mform->createElement('checkbox', 'condition' . $i, '', $this->conditions[$i]);
        }
        $mform->addGroup($checkboxes, $this->reasonlabel, $this->reasonlabel, '<br />', false);

        // Plain text field.
        $mform->addElement('textarea', 'condition_more', $this->conditionmore, ['cols' => 50, 'rows' => 15]);
        $mform->setType('condition_more', PARAM_RAW);

        // Show reporter info + detail.
        $mform->addElement('static', '', '', $this->reporterinfo);
        $mform->addElement('static', '', '', $this->reporterdetail);

        // Add submit and cancel buttons.
        $this->add_action_buttons(true, get_string('report_comment_submit', 'studentquiz'));

        // Add comment id as hidden field.
        $mform->addElement('hidden', 'p', $this->_customdata->commentid);
        $mform->setType('p', PARAM_INT);
    }

    /**
     * Validation for comment_report_form.
     *
     * @inheritDoc
     */
    public function validation($data, $files) {
        $errors = parent::validation($data, $files);
        // Error if all fields are empty.
        if (!$this->check_validate_checkboxes($data)) {
            if (empty($data['condition_more'])) {
                $errors['report_comment_intro'] = get_string('report_comment_invalid', 'studentquiz');
            } else {
                $errors['report_comment_intro'] = get_string('report_comment_invalid_checkbox', 'studentquiz');
            }
        }
        return $errors;
    }

    /**
     * Check all checkboxes in comment_report_form.
     *
     * @param $data
     * @return bool
     */
    private function check_validate_checkboxes($data) {
        $result = false;
        for ($i = 1; $i <= $this->numconditions; $i++) {
            if (!empty($data['condition' . $i])) {
                $result = true;
                break;
            }
        }
        return $result;
    }

    /**
     * Send to admin emails.
     *
     * @param array $recipients
     * @return void
     */
    public function send_report($recipients) {
        global $USER;

        $fromform = $this->get_data();

        $alltext = get_string('report_comment_emailpreface', 'studentquiz', $this->_customdata) . "\n\n";

        // Print the reasons for reporting.
        $alltext .= get_string('report_comment_reasons', 'studentquiz') . "\n";

        for ($i = 1; $i <= $this->numconditions; $i++) {
            if (!empty($fromform->{'condition' . $i})) {
                $alltext .= '* ' . $this->conditions[$i] . "\n";
            }
        }

        if (!empty($fromform->conditionmore)) {
            $alltext .= "\n" . $fromform->conditionmore . "\n";
        }

        $from = $USER;
        foreach ($recipients as $email) {
            // Send out email.
            $fakeuser = (object) [
                    'email' => $email,
                    'mailformat' => 1,
                    'id' => -1
            ];
            $subject = get_string('report_comment_emailsubject', 'studentquiz', $this->_customdata);
            $alltext .= get_string('report_comment_emailappendix', 'studentquiz', $this->_customdata);

            if (!email_to_user($fakeuser, $from, $subject, $alltext)) {
                print_error('error_sendalert', 'studentquiz', $this->_customdata->url, $fakeuser->email);
            }
        }
    }

}

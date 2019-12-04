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

namespace mod_studentquiz\commentarea;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/formslib.php');

/**
 * Form for editing a comment or reply.
 *
 * @package mod
 * @subpackage studentquiz
 * @copyright 2019 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class comment_form extends \moodleform {

    const SHOW_CANCEL_BUTTON = true;

    const PARENT_VALUE = 0;

    private $attributes = ['class' => 'comment-area-form'];

    public function __construct($action = null, $customdata = null, $method = 'post', $target = '', $attributes = null,
            $editable = true, $ajaxformdata = null) {
        if (is_null($attributes)) {
            $attributes = $this->attributes;
        }
        parent::__construct($action, $customdata, $method, $target, $attributes, $editable, $ajaxformdata);
    }

    public function definition() {
        global $CFG;
        $mform = $this->_form;
        $params = $this->_customdata['params'];

        $questionid = $params['questionid'];
        $replyto = isset($params['replyto']) && $params['replyto'] ? $params['replyto'] : 0;
        $context = \context_module::instance($params['cmid']);

        $formtype = $replyto == self::PARENT_VALUE ? 'add_comment' : 'add_reply';
        $submitlabel = \get_string($formtype, 'mod_studentquiz');

        $unique = $questionid . '_' . $replyto;

        \MoodleQuickForm::registerElementType('comment_editor', "$CFG->libdir/form/editor.php", comment_simple_editor::class);

        $mform->addElement('html', \html_writer::start_tag('div', array('id' => 'studentquiz_customeditor_' . $unique)));
        $mform->addElement('comment_editor', 'message', $submitlabel,
                ['id' => 'id_editor_question_' . $unique],
                ['context' => $context]
        );
        $mform->addElement('html', \html_writer::end_tag('div'));
        $mform->setType('message', PARAM_RAW);
        $mform->addRule('message', \get_string('required'), 'required', null);
        $mform->addHelpButton('message', 'comment_help', 'mod_studentquiz');

        // Hidden fields.
        foreach ($params as $param => $value) {
            $mform->addElement('hidden', $param, $value);
            $mform->setType($param, PARAM_INT);
        }
        // Prevent multiple submits.
        $mform->addElement('hidden', 'random', rand());
        $mform->setType('random', PARAM_INT);

        $cancelbutton = isset($this->_customdata['cancelbutton']) ? $this->_customdata['cancelbutton'] : self::SHOW_CANCEL_BUTTON;

        $buttonarray[] = &$mform->createElement('submit', 'submitbutton', $submitlabel, ['class' => 'btn-submit']);
        if ($cancelbutton) {
            $buttonarray[] = &$mform->createElement('cancel');
        }
        $mform->addGroup($buttonarray, 'buttonar', '', [' '], false);
        $mform->closeHeaderBefore('buttonar');

    }

    public function validation($data, $files) {
        $errors = parent::validation($data, $files);
        return $errors;
    }

    /**
     * Obtains HTML for form; needed so that this can be printed for AJAX version.
     *
     * @return string HTML for form
     */
    public function get_html() {
        return $this->_form->toHtml();
    }

    /**
     * Get form's element errors.
     *
     * @return array
     */
    public function get_form_errors() {
        return $this->_form->_errors;
    }
}

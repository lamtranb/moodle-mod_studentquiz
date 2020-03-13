<?php

/**
 * Comment delete period select  for StudentQuiz
 *
 * @package mod_studentquiz
 * @copyright 2020 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace mod_studentquiz\local\component;

use moodle_url;

defined('MOODLE_INTERNAL') || die();

/**
 * Comment delete period select for StudentQuiz
 *
 * @package mod_studentquiz
 * @copyright 2020 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class comment_period_select extends \MoodleQuickForm_select {

    public function __construct($elementName = null, $elementLabel = null, $options = null, $attributes = null) {
        parent::__construct($elementName, $elementLabel, $options, $attributes);
        global $PAGE;
        /** @var \mod_studentquiz_comment_renderer $output */
        $output = $PAGE->get_renderer('mod_studentquiz', 'comment');
        $this->_helpbutton = $output->period_help_icon('settings_commentdeletionperiod', 'studentquiz');
    }

}
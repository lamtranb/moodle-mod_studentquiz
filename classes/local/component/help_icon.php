<?php

/**
 * Help icon component for StudentQuiz
 *
 * @package mod_studentquiz
 * @copyright 2020 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace mod_studentquiz\local\component;

defined('MOODLE_INTERNAL') || die();

/**
 * Help icon component for StudentQuiz
 *
 * @package mod_studentquiz
 * @copyright 2020 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class help_icon extends \help_icon {

    /**
     * Export this data so it can be used as the context for a mustache template.
     *
     * @param \renderer_base $output Used to do a final render of any components that need to be rendered for export.
     * @return array
     */
    public function export_for_template(\renderer_base $output) {
        $data = parent::export_for_template($output);
        $currentperiod = get_config($this->component, 'commentdeletionperiod');
        $data->text = get_string($this->identifier . '_help', $this->component, $currentperiod);
        return $data;
    }
}
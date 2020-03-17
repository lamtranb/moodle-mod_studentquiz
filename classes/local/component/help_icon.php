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

/**
 * Help icon component for StudentQuiz.
 *
 * @package mod_studentquiz
 * @copyright 2020 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace mod_studentquiz\local\component;

defined('MOODLE_INTERNAL') || die();

/**
 * Help icon component for StudentQuiz.
 *
 * @package mod_studentquiz
 * @copyright 2020 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class help_icon extends \help_icon {

    /** @var string Custom data for help text. */
    protected $a;

    /**
     * Constructor.
     *
     * @param string $identifier Identifier name.
     * @param string $component Component name.
     */
    public function __construct($identifier, $component) {
        parent::__construct($identifier, $component);
        $this->a = get_config($this->component, 'commentdeletionperiod');
    }

    /**
     * Export this data so it can be used as the context for a mustache template.
     *
     * @param \renderer_base $output Used to do a final render of any components that need to be rendered for export.
     * @return \stdClass
     */
    public function export_for_template(\renderer_base $output) {
        $data = parent::export_for_template($output);
        /* Note: lib/outputcomponents.php line 523, get_formatted_help_string doesn't pass attributes. */
        $customdata = get_formatted_help_string($this->identifier, $this->component, false, $this->a);
        $data->text = $customdata->text;
        return $data;
    }
}
